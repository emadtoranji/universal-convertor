import {
  ConvertRequestPayload,
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from '../types/converter';
import { generatePdfFromImages } from '../core/pdfGenerator';

function calculateTargetDimensions(
  originalWidth: number,
  originalHeight: number,
  options: ConvertRequestPayload['options']
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  if (options.resizeMode === 'percentage') {
    const scale = options.resizePercentage / 100;
    width = Math.round(originalWidth * scale);
    height = Math.round(originalHeight * scale);
  } else if (options.resizeMode === 'dimensions') {
    if (options.targetWidth && options.targetHeight) {
      if (options.maintainAspectRatio) {
        const widthRatio = options.targetWidth / originalWidth;
        const heightRatio = options.targetHeight / originalHeight;
        const bestRatio = Math.min(widthRatio, heightRatio);
        width = Math.round(originalWidth * bestRatio);
        height = Math.round(originalHeight * bestRatio);
      } else {
        width = options.targetWidth;
        height = options.targetHeight;
      }
    } else if (options.targetWidth) {
      width = options.targetWidth;
      height = options.maintainAspectRatio
        ? Math.round((originalHeight * options.targetWidth) / originalWidth)
        : originalHeight;
    } else if (options.targetHeight) {
      height = options.targetHeight;
      width = options.maintainAspectRatio
        ? Math.round((originalWidth * options.targetHeight) / originalHeight)
        : originalWidth;
    }
  }

  const boundedWidth = Math.max(1, Math.min(16384, width));
  const boundedHeight = Math.max(1, Math.min(16384, height));
  return { width: boundedWidth, height: boundedHeight };
}

function encodeBmp(imageData: ImageData): ArrayBuffer {
  const width = imageData.width;
  const height = imageData.height;
  const rowStride = (width * 3 + 3) & ~3;
  const pixelArraySize = rowStride * height;
  const fileSize = 54 + pixelArraySize;
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  bytes[0] = 0x42;
  bytes[1] = 0x4d;
  view.setUint32(2, fileSize, true);
  view.setUint32(6, 0, true);
  view.setUint32(10, 54, true);

  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(30, 0, true);
  view.setUint32(34, pixelArraySize, true);
  view.setInt32(38, 2835, true);
  view.setInt32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  const srcData = imageData.data;
  let dstOffset = 54;

  for (let y = height - 1; y >= 0; y--) {
    const srcRowStart = y * width * 4;
    for (let x = 0; x < width; x++) {
      const pxIndex = srcRowStart + x * 4;
      const r = srcData[pxIndex];
      const g = srcData[pxIndex + 1];
      const b = srcData[pxIndex + 2];

      bytes[dstOffset++] = b;
      bytes[dstOffset++] = g;
      bytes[dstOffset++] = r;
    }
    const padding = rowStride - width * 3;
    for (let p = 0; p < padding; p++) {
      bytes[dstOffset++] = 0;
    }
  }

  return buffer;
}

function encodeTiff(imageData: ImageData): ArrayBuffer {
  const width = imageData.width;
  const height = imageData.height;
  const pixelByteCount = width * height * 3;
  const ifdEntriesCount = 12;
  const ifdSize = 2 + ifdEntriesCount * 12 + 4;
  const headerSize = 8;
  const extraValuesSize = 6 + 8 + 8;
  const dataOffset = headerSize + ifdSize + extraValuesSize;
  const totalSize = dataOffset + pixelByteCount;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  bytes[0] = 0x49;
  bytes[1] = 0x49;
  view.setUint16(2, 42, true);
  view.setUint32(4, 8, true);

  let ifdOffset = 8;
  view.setUint16(ifdOffset, ifdEntriesCount, true);
  ifdOffset += 2;

  const bpsOffset = headerSize + ifdSize;
  const xResOffset = bpsOffset + 6;
  const yResOffset = xResOffset + 8;

  function writeTag(tag: number, type: number, count: number, valueOrOffset: number): void {
    view.setUint16(ifdOffset, tag, true);
    view.setUint16(ifdOffset + 2, type, true);
    view.setUint32(ifdOffset + 4, count, true);
    view.setUint32(ifdOffset + 8, valueOrOffset, true);
    ifdOffset += 12;
  }

  writeTag(256, 4, 1, width);
  writeTag(257, 4, 1, height);
  writeTag(258, 3, 3, bpsOffset);
  writeTag(259, 3, 1, 1);
  writeTag(262, 3, 1, 2);
  writeTag(273, 4, 1, dataOffset);
  writeTag(277, 3, 1, 3);
  writeTag(278, 4, 1, height);
  writeTag(279, 4, 1, pixelByteCount);
  writeTag(282, 5, 1, xResOffset);
  writeTag(283, 5, 1, yResOffset);
  writeTag(296, 3, 1, 2);

  view.setUint32(ifdOffset, 0, true);

  view.setUint16(bpsOffset, 8, true);
  view.setUint16(bpsOffset + 2, 8, true);
  view.setUint16(bpsOffset + 4, 8, true);

  view.setUint32(xResOffset, 72, true);
  view.setUint32(xResOffset + 4, 1, true);

  view.setUint32(yResOffset, 72, true);
  view.setUint32(yResOffset + 4, 1, true);

  const srcData = imageData.data;
  let dstPos = dataOffset;
  const totalPixels = width * height;
  for (let i = 0; i < totalPixels; i++) {
    const srcIndex = i * 4;
    bytes[dstPos++] = srcData[srcIndex];
    bytes[dstPos++] = srcData[srcIndex + 1];
    bytes[dstPos++] = srcData[srcIndex + 2];
  }

  return buffer;
}

async function encodeIco(sourceCanvas: OffscreenCanvas): Promise<ArrayBuffer> {
  const targetSizes = [16, 32, 48, 64, 128, 256];
  const pngBuffers: { size: number; bytes: Uint8Array }[] = [];

  for (const s of targetSizes) {
    const icoCanvas = new OffscreenCanvas(s, s);
    const icoCtx = icoCanvas.getContext('2d');
    if (icoCtx) {
      icoCtx.imageSmoothingEnabled = true;
      icoCtx.imageSmoothingQuality = 'high';
      icoCtx.drawImage(sourceCanvas, 0, 0, s, s);
      const blob = await icoCanvas.convertToBlob({ type: 'image/png' });
      const ab = await blob.arrayBuffer();
      pngBuffers.push({ size: s, bytes: new Uint8Array(ab) });
    }
  }

  const iconCount = pngBuffers.length;
  const headerSize = 6;
  const directorySize = iconCount * 16;
  let currentOffset = headerSize + directorySize;

  let totalSize = currentOffset;
  for (const item of pngBuffers) {
    totalSize += item.bytes.length;
  }

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const outBytes = new Uint8Array(buffer);

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, iconCount, true);

  let dirOffset = 6;
  for (const item of pngBuffers) {
    const wByte = item.size >= 256 ? 0 : item.size;
    const hByte = item.size >= 256 ? 0 : item.size;
    outBytes[dirOffset] = wByte;
    outBytes[dirOffset + 1] = hByte;
    outBytes[dirOffset + 2] = 0;
    outBytes[dirOffset + 3] = 0;
    view.setUint16(dirOffset + 4, 1, true);
    view.setUint16(dirOffset + 6, 32, true);
    view.setUint32(dirOffset + 8, item.bytes.length, true);
    view.setUint32(dirOffset + 12, currentOffset, true);

    outBytes.set(item.bytes, currentOffset);
    currentOffset += item.bytes.length;
    dirOffset += 16;
  }

  return buffer;
}

async function processConversion(payload: ConvertRequestPayload): Promise<void> {
  const { id, buffer, sourceFormat, targetFormat, options, originalWidth, originalHeight, fileName } =
    payload;

  postProgress(id, 15, 'Decoding image stream');

  let bitmap: ImageBitmap;
  if (sourceFormat === 'svg') {
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

  postProgress(id, 70, `Encoding to ${targetFormat.toUpperCase()}`);

  const previewBlob = await canvas.convertToBlob({ type: 'image/png' });
  const previewBuffer = await previewBlob.arrayBuffer();

  let resultBuffer: ArrayBuffer;
  let mimeType: string;

  if (targetFormat === 'png') {
    resultBuffer = previewBuffer.slice(0);
    mimeType = 'image/png';
  } else if (targetFormat === 'jpeg') {
    const qualityDecimal = Math.max(0.01, Math.min(1, options.quality / 100));
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: qualityDecimal });
    resultBuffer = await blob.arrayBuffer();
    mimeType = 'image/jpeg';
  } else if (targetFormat === 'webp') {
    const qualityDecimal = Math.max(0.01, Math.min(1, options.quality / 100));
    const blob = await canvas.convertToBlob({ type: 'image/webp', quality: qualityDecimal });
    resultBuffer = await blob.arrayBuffer();
    mimeType = 'image/webp';
  } else if (targetFormat === 'avif') {
    const qualityDecimal = Math.max(0.01, Math.min(1, options.quality / 100));
    let blob: Blob;
    try {
      blob = await canvas.convertToBlob({ type: 'image/avif', quality: qualityDecimal });
      if (blob.type !== 'image/avif') {
        blob = await canvas.convertToBlob({ type: 'image/webp', quality: qualityDecimal });
      }
    } catch {
      blob = await canvas.convertToBlob({ type: 'image/webp', quality: qualityDecimal });
    }
    resultBuffer = await blob.arrayBuffer();
    mimeType = blob.type;
  } else if (targetFormat === 'bmp') {
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    resultBuffer = encodeBmp(imgData);
    mimeType = 'image/bmp';
  } else if (targetFormat === 'tiff') {
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    resultBuffer = encodeTiff(imgData);
    mimeType = 'image/tiff';
  } else if (targetFormat === 'ico') {
    resultBuffer = await encodeIco(canvas);
    mimeType = 'image/x-icon';
  } else if (targetFormat === 'pdf') {
    const pdfBytes = await generatePdfFromImages(
      [
        {
          buffer: previewBuffer.slice(0),
          mimeType: 'image/png',
          name: fileName,
          width: targetWidth,
          height: targetHeight,
        },
      ],
      {
        pageSize: options.pdfPageSize,
        orientation: options.pdfOrientation,
      }
    );
    const pdfBufferCopy = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    );
    resultBuffer = pdfBufferCopy as ArrayBuffer;
    mimeType = 'application/pdf';
  } else {
    throw new Error(`Unsupported target output format: ${targetFormat}`);
  }

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
