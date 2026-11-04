import {
  ConvertRequestPayload,
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from '../types/converter';

export interface WorkerTask {
  payload: ConvertRequestPayload;
  transferables: Transferable[];
  onProgress: (progress: number, stage: string) => void;
  onSuccess: (result: Extract<WorkerOutboundMessage, { type: 'CONVERT_SUCCESS' }>['payload']) => void | Promise<void>;
  onError: (error: string) => void;
}

interface ActiveWorkerSlot {
  worker: Worker;
  busy: boolean;
  currentTaskId: string | null;
  timeoutId: ReturnType<typeof setTimeout> | null;
}

interface TrustedWorkerPolicy {
  createScriptURL: (value: string) => string;
}

interface TrustedWorkerTypes {
  createPolicy: (
    name: string,
    rules: { createScriptURL: (value: string) => string }
  ) => TrustedWorkerPolicy;
}

declare global {
  interface Window {
    trustedTypes?: TrustedWorkerTypes;
  }
}

let trustedWorkerPolicy: TrustedWorkerPolicy | null = null;

const getTrustedWorkerUrl = (url: string): string => {
  const trustedTypes = window.trustedTypes;
  if (!trustedTypes) return url;

  trustedWorkerPolicy ??= trustedTypes.createPolicy('universal-convertor-worker', {
    createScriptURL: (value) => {
      const parsedUrl = new URL(value);
      if (parsedUrl.protocol !== 'blob:' || parsedUrl.origin !== window.location.origin) {
        throw new TypeError('Worker scripts must use a same-origin Blob URL');
      }
      return value;
    },
  });

  return trustedWorkerPolicy.createScriptURL(url);
};

const INLINE_WORKER_CODE = `
function calculateTargetDimensions(originalWidth, originalHeight, options) {
  var width = originalWidth;
  var height = originalHeight;
  if (options.resizeMode === 'percentage') {
    var scale = options.resizePercentage / 100;
    width = Math.round(originalWidth * scale);
    height = Math.round(originalHeight * scale);
  } else if (options.resizeMode === 'dimensions') {
    if (options.targetWidth && options.targetHeight) {
      if (options.maintainAspectRatio) {
        var wRatio = options.targetWidth / originalWidth;
        var hRatio = options.targetHeight / originalHeight;
        var best = Math.min(wRatio, hRatio);
        width = Math.round(originalWidth * best);
        height = Math.round(originalHeight * best);
      } else {
        width = options.targetWidth;
        height = options.targetHeight;
      }
    } else if (options.targetWidth) {
      width = options.targetWidth;
      height = options.maintainAspectRatio ? Math.round((originalHeight * options.targetWidth) / originalWidth) : originalHeight;
    } else if (options.targetHeight) {
      height = options.targetHeight;
      width = options.maintainAspectRatio ? Math.round((originalWidth * options.targetHeight) / originalHeight) : originalWidth;
    }
  }
  return {
    width: Math.max(1, Math.min(16384, width)),
    height: Math.max(1, Math.min(16384, height))
  };
}

function encodeBmp(imageData) {
  var width = imageData.width;
  var height = imageData.height;
  var rowStride = (width * 3 + 3) & ~3;
  var pixelArraySize = rowStride * height;
  var fileSize = 54 + pixelArraySize;
  var buffer = new ArrayBuffer(fileSize);
  var view = new DataView(buffer);
  var bytes = new Uint8Array(buffer);

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

  var srcData = imageData.data;
  var dstOffset = 54;
  for (var y = height - 1; y >= 0; y--) {
    var srcRowStart = y * width * 4;
    for (var x = 0; x < width; x++) {
      var pxIndex = srcRowStart + x * 4;
      bytes[dstOffset++] = srcData[pxIndex + 2];
      bytes[dstOffset++] = srcData[pxIndex + 1];
      bytes[dstOffset++] = srcData[pxIndex];
    }
    var padding = rowStride - width * 3;
    for (var p = 0; p < padding; p++) {
      bytes[dstOffset++] = 0;
    }
  }
  return buffer;
}

function encodeTiff(imageData) {
  var width = imageData.width;
  var height = imageData.height;
  var pixelByteCount = width * height * 3;
  var ifdEntriesCount = 12;
  var ifdSize = 2 + ifdEntriesCount * 12 + 4;
  var headerSize = 8;
  var extraValuesSize = 6 + 8 + 8;
  var dataOffset = headerSize + ifdSize + extraValuesSize;
  var totalSize = dataOffset + pixelByteCount;

  var buffer = new ArrayBuffer(totalSize);
  var view = new DataView(buffer);
  var bytes = new Uint8Array(buffer);

  bytes[0] = 0x49;
  bytes[1] = 0x49;
  view.setUint16(2, 42, true);
  view.setUint32(4, 8, true);

  var ifdOffset = 8;
  view.setUint16(ifdOffset, ifdEntriesCount, true);
  ifdOffset += 2;

  var bpsOffset = headerSize + ifdSize;
  var xResOffset = bpsOffset + 6;
  var yResOffset = xResOffset + 8;

  function writeTag(tag, type, count, val) {
    view.setUint16(ifdOffset, tag, true);
    view.setUint16(ifdOffset + 2, type, true);
    view.setUint32(ifdOffset + 4, count, true);
    view.setUint32(ifdOffset + 8, val, true);
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

  var srcData = imageData.data;
  var dstPos = dataOffset;
  var totalPixels = width * height;
  for (var i = 0; i < totalPixels; i++) {
    var srcIndex = i * 4;
    bytes[dstPos++] = srcData[srcIndex];
    bytes[dstPos++] = srcData[srcIndex + 1];
    bytes[dstPos++] = srcData[srcIndex + 2];
  }
  return buffer;
}

async function encodeIco(sourceCanvas) {
  var targetSizes = [16, 32, 48, 64, 128, 256];
  var pngBuffers = [];
  for (var i = 0; i < targetSizes.length; i++) {
    var s = targetSizes[i];
    var icoCanvas = new OffscreenCanvas(s, s);
    var icoCtx = icoCanvas.getContext('2d');
    if (icoCtx) {
      icoCtx.imageSmoothingEnabled = true;
      icoCtx.imageSmoothingQuality = 'high';
      icoCtx.drawImage(sourceCanvas, 0, 0, s, s);
      var blob = await icoCanvas.convertToBlob({ type: 'image/png' });
      var ab = await blob.arrayBuffer();
      pngBuffers.push({ size: s, bytes: new Uint8Array(ab) });
    }
  }
  var iconCount = pngBuffers.length;
  var headerSize = 6;
  var directorySize = iconCount * 16;
  var currentOffset = headerSize + directorySize;
  var totalSize = currentOffset;
  for (var j = 0; j < pngBuffers.length; j++) {
    totalSize += pngBuffers[j].bytes.length;
  }
  var buffer = new ArrayBuffer(totalSize);
  var view = new DataView(buffer);
  var outBytes = new Uint8Array(buffer);

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, iconCount, true);

  var dirOffset = 6;
  for (var k = 0; k < pngBuffers.length; k++) {
    var item = pngBuffers[k];
    var wByte = item.size >= 256 ? 0 : item.size;
    var hByte = item.size >= 256 ? 0 : item.size;
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

async function encodeLossy(canvas, type, requestedQuality, originalSize, reduceIfLarger) {
  var quality = Math.max(0.01, Math.min(1, requestedQuality));
  var blob;
  try {
    blob = await canvas.convertToBlob({ type: type, quality: quality });
  } catch (error) {
    if (type !== 'image/avif') throw error;
    blob = await canvas.convertToBlob({ type: 'image/webp', quality: quality });
  }
  if (type === 'image/avif' && blob.type !== 'image/avif') {
    blob = await canvas.convertToBlob({ type: 'image/webp', quality: quality });
  }
  var effectiveQuality = Math.round(quality * 100);
  if (reduceIfLarger && blob.size > originalSize) {
    var candidate = Math.floor(quality * 100) - 10;
    while (candidate >= 10) {
      var smallerBlob = await canvas.convertToBlob({ type: blob.type, quality: candidate / 100 });
      if (smallerBlob.size <= originalSize) {
        blob = smallerBlob;
        effectiveQuality = candidate;
        break;
      }
      if (candidate === 10) break;
      candidate = Math.max(10, candidate - 10);
    }
  }
  return { blob: blob, quality: effectiveQuality };
}

self.onmessage = async function(event) {
  var message = event.data;
  if (message.type !== 'CONVERT_REQUEST') return;
  var payload = message.payload;
  var id = payload.id;
  try {
    self.postMessage({ type: 'CONVERT_PROGRESS', payload: { id: id, progress: 20, stage: 'Decoding' } });
    var sourceMimeType = payload.sourceFormat === 'svg'
      ? 'image/svg+xml'
      : payload.sourceFormat === 'heic'
        ? 'image/heic'
        : undefined;
    var blob = new Blob([payload.buffer], sourceMimeType ? { type: sourceMimeType } : undefined);
    var bitmap = await createImageBitmap(blob);

    self.postMessage({ type: 'CONVERT_PROGRESS', payload: { id: id, progress: 50, stage: 'Composing' } });
    var dims = calculateTargetDimensions(payload.originalWidth || bitmap.width, payload.originalHeight || bitmap.height, payload.options);
    var canvas = new OffscreenCanvas(dims.width, dims.height);
    var ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');

    var isOpaque = payload.targetFormat === 'jpeg' || payload.targetFormat === 'bmp';
    if (isOpaque || (payload.options.backgroundColor && payload.options.backgroundColor !== 'transparent')) {
      ctx.fillStyle = payload.options.backgroundColor || '#ffffff';
      ctx.fillRect(0, 0, dims.width, dims.height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, dims.width, dims.height);
    bitmap.close();

    if (payload.options.grayscale) {
      var grayscaleData = ctx.getImageData(0, 0, dims.width, dims.height);
      var pixels = grayscaleData.data;
      for (var pixelOffset = 0; pixelOffset < pixels.length; pixelOffset += 4) {
        var gray = Math.round(
          0.299 * pixels[pixelOffset] +
          0.587 * pixels[pixelOffset + 1] +
          0.114 * pixels[pixelOffset + 2]
        );
        pixels[pixelOffset] = gray;
        pixels[pixelOffset + 1] = gray;
        pixels[pixelOffset + 2] = gray;
      }
      ctx.putImageData(grayscaleData, 0, 0);
    }

    self.postMessage({ type: 'CONVERT_PROGRESS', payload: { id: id, progress: 80, stage: 'Encoding' } });
    
    var previewBlob = await canvas.convertToBlob({ type: 'image/png' });
    var previewBuffer = await previewBlob.arrayBuffer();

    var resultBuffer;
    var mimeType;
    var effectiveQuality;
    var reduceIfLarger =
      payload.options.resizeMode === 'original' &&
      ['jpeg', 'webp', 'avif', 'heic'].indexOf(payload.sourceFormat) !== -1;

    if (payload.targetFormat === 'png') {
      resultBuffer = previewBuffer.slice(0);
      mimeType = 'image/png';
    } else if (payload.targetFormat === 'jpeg') {
      var encodedJpeg = await encodeLossy(
        canvas,
        'image/jpeg',
        payload.options.quality / 100,
        payload.buffer.byteLength,
        reduceIfLarger
      );
      resultBuffer = await encodedJpeg.blob.arrayBuffer();
      mimeType = encodedJpeg.blob.type;
      effectiveQuality = encodedJpeg.quality;
    } else if (payload.targetFormat === 'webp') {
      var encodedWebp = await encodeLossy(
        canvas,
        'image/webp',
        payload.options.quality / 100,
        payload.buffer.byteLength,
        reduceIfLarger
      );
      resultBuffer = await encodedWebp.blob.arrayBuffer();
      mimeType = encodedWebp.blob.type;
      effectiveQuality = encodedWebp.quality;
    } else if (payload.targetFormat === 'avif') {
      var encodedAvif = await encodeLossy(
        canvas,
        'image/avif',
        payload.options.quality / 100,
        payload.buffer.byteLength,
        reduceIfLarger
      );
      resultBuffer = await encodedAvif.blob.arrayBuffer();
      mimeType = encodedAvif.blob.type;
      effectiveQuality = encodedAvif.quality;
    } else if (payload.targetFormat === 'bmp') {
      var imgData = ctx.getImageData(0, 0, dims.width, dims.height);
      resultBuffer = encodeBmp(imgData);
      mimeType = 'image/bmp';
    } else if (payload.targetFormat === 'tiff') {
      var imgData = ctx.getImageData(0, 0, dims.width, dims.height);
      resultBuffer = encodeTiff(imgData);
      mimeType = 'image/tiff';
    } else if (payload.targetFormat === 'ico') {
      resultBuffer = await encodeIco(canvas);
      mimeType = 'image/x-icon';
    } else if (payload.targetFormat === 'pdf') {
      resultBuffer = previewBuffer.slice(0);
      mimeType = 'image/png';
    } else {
      throw new Error('Unsupported format: ' + payload.targetFormat);
    }

    self.postMessage({
      type: 'CONVERT_SUCCESS',
      payload: {
        id: id,
        buffer: resultBuffer,
        previewBuffer: previewBuffer,
        targetFormat: payload.targetFormat,
        quality: effectiveQuality,
        qualityAdjusted:
          effectiveQuality !== undefined && effectiveQuality < payload.options.quality,
        mimeType: mimeType,
        width: dims.width,
        height: dims.height,
        size: resultBuffer.byteLength
      }
    }, [resultBuffer, previewBuffer]);
  } catch (err) {
    self.postMessage({
      type: 'CONVERT_ERROR',
      payload: { id: id, error: err.message || 'Worker conversion failure' }
    });
  }
};
`;

export class ConversionWorkerPool {
  private workers: ActiveWorkerSlot[] = [];
  private taskQueue: WorkerTask[] = [];
  private poolSize: number;
  private isDestroyed = false;
  private workerBlobUrl: string | null = null;
  private activeTasksMap = new Map<string, WorkerTask>();

  constructor() {
    this.poolSize = 1;
  }

  private getWorkerUrl(): string {
    if (!this.workerBlobUrl) {
      const blob = new Blob([INLINE_WORKER_CODE], { type: 'application/javascript' });
      this.workerBlobUrl = URL.createObjectURL(blob);
    }
    return this.workerBlobUrl;
  }

  private initWorker(): ActiveWorkerSlot {
    const worker = new Worker(getTrustedWorkerUrl(this.getWorkerUrl()));

    const slot: ActiveWorkerSlot = {
      worker,
      busy: false,
      currentTaskId: null,
      timeoutId: null,
    };

    worker.onmessage = async (event: MessageEvent<WorkerOutboundMessage>): Promise<void> => {
      const msg = event.data;
      const currentTask = this.currentActiveTask(slot.currentTaskId);

      if (msg.type === 'CONVERT_PROGRESS') {
        if (currentTask && currentTask.payload.id === msg.payload.id) {
          currentTask.onProgress(msg.payload.progress, msg.payload.stage);
        }
      } else if (msg.type === 'CONVERT_SUCCESS') {
        if (slot.timeoutId) {
          clearTimeout(slot.timeoutId);
          slot.timeoutId = null;
        }

        if (currentTask && currentTask.payload.id === msg.payload.id) {
          if (currentTask.payload.targetFormat === 'pdf') {
            const firstBytes = new Uint8Array(msg.payload.buffer.slice(0, 5));
            const isAlreadyPdf =
              firstBytes.length >= 5 &&
              firstBytes[0] === 0x25 &&
              firstBytes[1] === 0x50 &&
              firstBytes[2] === 0x44 &&
              firstBytes[3] === 0x46 &&
              firstBytes[4] === 0x2d;

            if (isAlreadyPdf) {
              this.safeResolveSuccess(currentTask, msg.payload);
            } else {
              try {
                const { generatePdfFromImages } = await import('../core/pdfGenerator');
                const pdfBytes = await generatePdfFromImages(
                  [
                    {
                      buffer: msg.payload.buffer,
                      mimeType: 'image/png',
                      name: currentTask.payload.fileName,
                      width: msg.payload.width,
                      height: msg.payload.height,
                    },
                  ],
                  {
                    pageSize: currentTask.payload.options.pdfPageSize,
                    orientation: currentTask.payload.options.pdfOrientation,
                  }
                );
                const pdfBufferCopy = pdfBytes.buffer.slice(
                  pdfBytes.byteOffset,
                  pdfBytes.byteOffset + pdfBytes.byteLength
                ) as ArrayBuffer;

                this.safeResolveSuccess(currentTask, {
                  ...msg.payload,
                  buffer: pdfBufferCopy,
                  mimeType: 'application/pdf',
                  size: pdfBufferCopy.byteLength,
                });
              } catch (pdfErr) {
                const errorText = pdfErr instanceof Error ? pdfErr.message : 'PDF generation failure';
                currentTask.onError(errorText);
              }
            }
          } else {
            this.safeResolveSuccess(currentTask, msg.payload);
          }
        }
        this.releaseSlot(slot);
      } else if (msg.type === 'CONVERT_ERROR') {
        if (slot.timeoutId) {
          clearTimeout(slot.timeoutId);
          slot.timeoutId = null;
        }
        if (currentTask && currentTask.payload.id === msg.payload.id) {
          currentTask.onError(msg.payload.error);
        }
        this.releaseSlot(slot);
      }
    };

    worker.onerror = (errorEvent: ErrorEvent): void => {
      if (slot.timeoutId) {
        clearTimeout(slot.timeoutId);
        slot.timeoutId = null;
      }
      const currentTask = this.currentActiveTask(slot.currentTaskId);
      if (currentTask) {
        currentTask.onError(errorEvent.message || 'Worker thread execution error');
      }
      this.releaseSlot(slot);
    };

    return slot;
  }

  private safeResolveSuccess(
    task: WorkerTask,
    payload: Extract<WorkerOutboundMessage, { type: 'CONVERT_SUCCESS' }>['payload']
  ): void {
    try {
      const result: unknown = task.onSuccess(payload);
      if (typeof result === 'object' && result !== null && 'catch' in result && typeof (result as Promise<unknown>).catch === 'function') {
        (result as Promise<unknown>).catch((err: unknown) => {
          const errorMsg = err instanceof Error ? err.message : String(err);
          task.onError(errorMsg);
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      task.onError(errorMsg);
    }
  }

  private currentActiveTask(taskId: string | null): WorkerTask | undefined {
    if (!taskId) return undefined;
    return this.activeTasksMap.get(taskId);
  }

  private releaseSlot(slot: ActiveWorkerSlot): void {
    if (slot.currentTaskId) {
      this.activeTasksMap.delete(slot.currentTaskId);
    }
    slot.busy = false;
    slot.currentTaskId = null;
    this.drainQueue();
  }

  private ensureWorkerPool(): void {
    if (this.isDestroyed) return;
    while (this.workers.length < this.poolSize) {
      this.workers.push(this.initWorker());
    }
  }

  public enqueueTask(task: WorkerTask): void {
    if (this.isDestroyed) {
      task.onError('Worker pool is destroyed');
      return;
    }
    this.taskQueue.push(task);
    this.ensureWorkerPool();
    this.drainQueue();
  }

  public cancelTask(id: string): void {
    const queueIndex = this.taskQueue.findIndex((t) => t.payload.id === id);
    if (queueIndex >= 0) {
      const removed = this.taskQueue.splice(queueIndex, 1)[0];
      removed.onError('Conversion canceled by user');
      return;
    }

    for (const slot of this.workers) {
      if (slot.currentTaskId === id) {
        if (slot.timeoutId) {
          clearTimeout(slot.timeoutId);
          slot.timeoutId = null;
        }
        const cancelMsg: WorkerInboundMessage = {
          type: 'CANCEL_REQUEST',
          payload: { id },
        };
        slot.worker.postMessage(cancelMsg);
        slot.worker.terminate();
        this.workers = this.workers.filter((w) => w !== slot);
        this.activeTasksMap.delete(id);
        this.workers.push(this.initWorker());
        this.drainQueue();
        break;
      }
    }
  }

  private drainQueue(): void {
    if (this.isDestroyed || this.taskQueue.length === 0) return;

    const availableSlot = this.workers.find((w) => !w.busy);
    if (!availableSlot) return;

    const nextTask = this.taskQueue.shift();
    if (!nextTask) return;

    availableSlot.busy = true;
    availableSlot.currentTaskId = nextTask.payload.id;
    this.activeTasksMap.set(nextTask.payload.id, nextTask);

    availableSlot.timeoutId = setTimeout(() => {
      if (availableSlot.currentTaskId === nextTask.payload.id) {
        nextTask.onError('Conversion execution timed out (exceeded 60 seconds)');
        availableSlot.worker.terminate();
        this.workers = this.workers.filter((w) => w !== availableSlot);
        this.activeTasksMap.delete(nextTask.payload.id);
        this.workers.push(this.initWorker());
        this.drainQueue();
      }
    }, 60000);

    const message: WorkerInboundMessage = {
      type: 'CONVERT_REQUEST',
      payload: nextTask.payload,
    };

    availableSlot.worker.postMessage(message, nextTask.transferables);
  }

  public destroy(): void {
    this.isDestroyed = true;
    for (const slot of this.workers) {
      if (slot.timeoutId) {
        clearTimeout(slot.timeoutId);
      }
      slot.worker.terminate();
    }
    this.workers = [];
    this.taskQueue = [];
    this.activeTasksMap.clear();
    if (this.workerBlobUrl) {
      URL.revokeObjectURL(this.workerBlobUrl);
      this.workerBlobUrl = null;
    }
  }
}
