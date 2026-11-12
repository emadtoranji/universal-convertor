import {
  ConvertRequestPayload,
  WorkerInboundMessage,
  WorkerOutboundMessage,
  ImageOutputFormat,
} from '../types/converter';
import {
  calculateTargetDimensions,
  applyGrayscale,
  convertCanvasToTarget,
  shouldPassthroughSource,
} from '../core/converters/imageConverter';

const PNG_PREVIEW_FORMATS = new Set<ImageOutputFormat>(['bmp', 'tiff', 'ico', 'pdf']);

const MIME_BY_FORMAT: Record<string, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
  ico: 'image/x-icon',
  heic: 'image/heic',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

function postProgress(id: string, progress: number, stage: string): void {
  const msg: WorkerOutboundMessage = {
    type: 'CONVERT_PROGRESS',
    payload: { id, progress, stage },
  };
  self.postMessage(msg);
}

function postSuccess(
  payload: Extract<WorkerOutboundMessage, { type: 'CONVERT_SUCCESS' }>['payload'],
  transfer: Transferable[],
): void {
  const successMessage: WorkerOutboundMessage = {
    type: 'CONVERT_SUCCESS',
    payload,
  };
  self.postMessage(successMessage, { transfer });
}

async function processConversion(payload: ConvertRequestPayload): Promise<void> {
  const { id, buffer, sourceFormat, targetFormat, options, originalWidth, originalHeight } = payload;
  const originalByteLength = payload.originalByteLength || buffer.byteLength;

  if (shouldPassthroughSource(sourceFormat, targetFormat, options)) {
    postProgress(id, 100, 'Using original bytes');
    postSuccess(
      {
        id,
        buffer,
        targetFormat,
        mimeType: MIME_BY_FORMAT[targetFormat] || 'application/octet-stream',
        width: originalWidth,
        height: originalHeight,
        size: buffer.byteLength,
      },
      [buffer],
    );
    return;
  }

  postProgress(id, 15, 'Decoding image stream');

  let bitmap: ImageBitmap;
  if (sourceFormat === 'svg') {
    bitmap = await createImageBitmap(new Blob([buffer], { type: 'image/svg+xml' }));
  } else {
    const sourceMime = MIME_BY_FORMAT[sourceFormat];
    bitmap = await createImageBitmap(
      sourceMime ? new Blob([buffer], { type: sourceMime }) : new Blob([buffer]),
    );
  }

  postProgress(id, 40, 'Resizing and composing canvas');

  const { width: targetWidth, height: targetHeight } = calculateTargetDimensions(
    originalWidth || bitmap.width,
    originalHeight || bitmap.height,
    options,
  );

  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Unable to obtain OffscreenCanvas 2D context');
  }

  const isOpaqueTarget = targetFormat === 'jpeg' || targetFormat === 'bmp' || targetFormat === 'pdf';
  if (isOpaqueTarget || (options.backgroundColor && options.backgroundColor !== 'transparent')) {
    ctx.fillStyle = options.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  if (options.grayscale) {
    applyGrayscale(ctx, targetWidth, targetHeight);
  }

  postProgress(id, 70, `Encoding to ${targetFormat.toUpperCase()}`);

  const needsPngPreview = PNG_PREVIEW_FORMATS.has(targetFormat as ImageOutputFormat);
  let previewBuffer: ArrayBuffer | undefined;
  if (needsPngPreview) {
    const previewBlob = await canvas.convertToBlob({ type: 'image/png' });
    previewBuffer = await previewBlob.arrayBuffer();
  }

  const encoded = await convertCanvasToTarget(
    canvas,
    ctx,
    targetFormat as ImageOutputFormat,
    options,
    originalByteLength,
    targetWidth,
    targetHeight,
  );

  postProgress(id, 100, 'Conversion completed');

  const transfer: Transferable[] = [encoded.buffer];
  if (previewBuffer) transfer.push(previewBuffer);

  postSuccess(
    {
      id,
      buffer: encoded.buffer,
      previewBuffer,
      targetFormat,
      quality: encoded.quality,
      qualityAdjusted: encoded.qualityAdjusted,
      mimeType: encoded.mimeType,
      width: targetWidth,
      height: targetHeight,
      size: encoded.buffer.byteLength,
    },
    transfer,
  );
}

self.onmessage = async (event: MessageEvent<WorkerInboundMessage>): Promise<void> => {
  const message = event.data;
  if (message.type !== 'CONVERT_REQUEST') return;
  try {
    await processConversion(message.payload);
  } catch (err: unknown) {
    const errorMessageText = err instanceof Error ? err.message : 'Unknown worker conversion error';
    const errorMessage: WorkerOutboundMessage = {
      type: 'CONVERT_ERROR',
      payload: {
        id: message.payload.id,
        error: errorMessageText,
      },
    };
    self.postMessage(errorMessage);
  }
};
