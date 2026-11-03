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
} from '../core/converters/imageConverter';
import { decodePsdBuffer } from '../core/converters/psdConverter';

async function processConversion(payload: ConvertRequestPayload): Promise<void> {
  const { id, buffer, sourceFormat, targetFormat, options, originalWidth, originalHeight, fileName } =
    payload;

  postProgress(id, 15, 'Decoding image stream');

  let bitmap: ImageBitmap;
  if (sourceFormat === 'psd') {
    const psdResult = await decodePsdBuffer(buffer);
    bitmap = await createImageBitmap(psdResult.imageData);
  } else if (sourceFormat === 'svg') {
    const svgBlob = new Blob([buffer], { type: 'image/svg+xml' });
    bitmap = await createImageBitmap(svgBlob);
  } else {
    const blob = new Blob([buffer]);
    bitmap = await createImageBitmap(blob);
  }

  postProgress(id, 40, 'Resizing and composing canvas');

  const { width: targetWidth, height: targetHeight } = calculateTargetDimensions(
    originalWidth || bitmap.width,
    originalHeight || bitmap.height,
    options
  );

  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Unable to obtain OffscreenCanvas 2D context');
  }

  const isOpaqueTarget = targetFormat === 'jpeg' || targetFormat === 'bmp';
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

  const previewBlob = await canvas.convertToBlob({ type: 'image/png' });
  const previewBuffer = await previewBlob.arrayBuffer();

  const { buffer: resultBuffer, mimeType } = await convertCanvasToTarget(
    canvas,
    ctx,
    targetFormat as ImageOutputFormat,
    options,
    fileName,
    previewBuffer,
    targetWidth,
    targetHeight
  );

  postProgress(id, 100, 'Conversion completed');

  const successMessage: WorkerOutboundMessage = {
    type: 'CONVERT_SUCCESS',
    payload: {
      id,
      buffer: resultBuffer,
      previewBuffer,
      targetFormat,
      mimeType,
      width: targetWidth,
      height: targetHeight,
      size: resultBuffer.byteLength,
    },
  };

  postMessage(successMessage, { transfer: [resultBuffer, previewBuffer] });
}

function postProgress(id: string, progress: number, stage: string): void {
  const msg: WorkerOutboundMessage = {
    type: 'CONVERT_PROGRESS',
    payload: { id, progress, stage },
  };
  self.postMessage(msg);
}

self.onmessage = async (event: MessageEvent<WorkerInboundMessage>): Promise<void> => {
  const message = event.data;
  if (message.type === 'CONVERT_REQUEST') {
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
  }
};
