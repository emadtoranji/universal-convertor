import type { ConversionOptions, ImageOutputFormat } from '../../types/converter.ts';

export interface RawImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

export function calculateTargetDimensions(
  originalWidth: number,
  originalHeight: number,
  options: ConversionOptions
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

export function applyGrayscale(ctx: OffscreenCanvasRenderingContext2D, width: number, height: number): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const len = data.length;
  for (let i = 0; i < len; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  ctx.putImageData(imgData, 0, 0);
}

export function encodeBmp(imageData: ImageData | RawImageData): ArrayBuffer {
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

export function encodeTiff(imageData: ImageData | RawImageData): ArrayBuffer {
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

export async function encodeIco(sourceCanvas: OffscreenCanvas): Promise<ArrayBuffer> {
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

const PASSTHROUGH_FORMATS = new Set<ImageOutputFormat>([
  'png',
  'jpeg',
  'webp',
  'avif',
  'bmp',
  'tiff',
  'ico',
]);

const LOSSY_QUALITY_FLOOR = 40;

export interface EncodedImage {
  buffer: ArrayBuffer;
  mimeType: string;
  quality?: number;
  qualityAdjusted?: boolean;
}

export function shouldPassthroughSource(
  sourceFormat: string,
  targetFormat: string,
  options: ConversionOptions,
): boolean {
  if (sourceFormat !== targetFormat) return false;
  if (!PASSTHROUGH_FORMATS.has(targetFormat as ImageOutputFormat)) return false;
  if (options.grayscale) return false;
  if (options.resizeMode === 'dimensions') return false;
  if (options.resizeMode === 'percentage' && options.resizePercentage !== 100) return false;

  const background = (options.backgroundColor || '#ffffff').trim().toLowerCase();
  if (background !== '#ffffff' && background !== 'transparent') return false;

  if (
    (targetFormat === 'jpeg' || targetFormat === 'webp' || targetFormat === 'avif') &&
    options.quality < 85
  ) {
    return false;
  }

  return true;
}

async function encodeAtQuality(
  canvas: OffscreenCanvas,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  const decimal = Math.max(0.01, Math.min(1, quality / 100));
  try {
    const blob = await canvas.convertToBlob({ type: mimeType, quality: decimal });
    if (mimeType === 'image/avif' && blob.type !== 'image/avif') {
      return canvas.convertToBlob({ type: 'image/webp', quality: decimal });
    }
    return blob;
  } catch (error) {
    if (mimeType !== 'image/avif') throw error;
    return canvas.convertToBlob({ type: 'image/webp', quality: decimal });
  }
}

export async function encodeLossyCanvas(
  canvas: OffscreenCanvas,
  mimeType: 'image/jpeg' | 'image/webp' | 'image/avif',
  requestedQuality: number,
  originalSize: number,
): Promise<{ blob: Blob; mimeType: string; quality: number; qualityAdjusted: boolean }> {
  const requested = Math.max(1, Math.min(100, Math.round(requestedQuality)));
  let blob = await encodeAtQuality(canvas, mimeType, requested);
  let bestBlob = blob;
  let bestQuality = requested;

  if (blob.size <= originalSize) {
    return {
      blob,
      mimeType: blob.type || mimeType,
      quality: requested,
      qualityAdjusted: false,
    };
  }

  const floor = Math.min(LOSSY_QUALITY_FLOOR, requested);
  for (let quality = requested - 5; quality >= floor; quality -= 5) {
    const next = await encodeAtQuality(canvas, blob.type || mimeType, quality);
    if (next.size < bestBlob.size) {
      bestBlob = next;
      bestQuality = quality;
    }
    if (next.size <= originalSize) {
      bestBlob = next;
      bestQuality = quality;
      break;
    }
  }

  return {
    blob: bestBlob,
    mimeType: bestBlob.type || mimeType,
    quality: bestQuality,
    qualityAdjusted: bestQuality < requested,
  };
}

export async function convertCanvasToTarget(
  canvas: OffscreenCanvas,
  ctx: OffscreenCanvasRenderingContext2D,
  targetFormat: ImageOutputFormat,
  options: ConversionOptions,
  originalSize: number,
  targetWidth: number,
  targetHeight: number,
): Promise<EncodedImage> {
  if (targetFormat === 'png') {
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return { buffer: await blob.arrayBuffer(), mimeType: 'image/png' };
  }

  if (targetFormat === 'jpeg' || targetFormat === 'pdf') {
    const encoded = await encodeLossyCanvas(canvas, 'image/jpeg', options.quality, originalSize);
    return {
      buffer: await encoded.blob.arrayBuffer(),
      mimeType: 'image/jpeg',
      quality: encoded.quality,
      qualityAdjusted: encoded.qualityAdjusted,
    };
  }

  if (targetFormat === 'webp') {
    const encoded = await encodeLossyCanvas(canvas, 'image/webp', options.quality, originalSize);
    return {
      buffer: await encoded.blob.arrayBuffer(),
      mimeType: encoded.mimeType || 'image/webp',
      quality: encoded.quality,
      qualityAdjusted: encoded.qualityAdjusted,
    };
  }

  if (targetFormat === 'avif') {
    const encoded = await encodeLossyCanvas(canvas, 'image/avif', options.quality, originalSize);
    return {
      buffer: await encoded.blob.arrayBuffer(),
      mimeType: encoded.mimeType || 'image/avif',
      quality: encoded.quality,
      qualityAdjusted: encoded.qualityAdjusted,
    };
  }

  if (targetFormat === 'bmp') {
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    return { buffer: encodeBmp(imgData), mimeType: 'image/bmp' };
  }

  if (targetFormat === 'tiff') {
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    return { buffer: encodeTiff(imgData), mimeType: 'image/tiff' };
  }

  if (targetFormat === 'ico') {
    return { buffer: await encodeIco(canvas), mimeType: 'image/x-icon' };
  }

  throw new Error(`Unsupported target output format: ${targetFormat}`);
}
