import conversionWorkerUrl from '../workers/conversion.worker.ts?worker&url';
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

const getTrustedWorkerUrl = (url: URL): string | URL => {
  const trustedTypes = window.trustedTypes;
  if (!trustedTypes) return url;

  trustedWorkerPolicy ??= trustedTypes.createPolicy('universal-convertor-worker', {
    createScriptURL: (value) => {
      const parsedUrl = new URL(value, window.location.href);
      if (parsedUrl.origin !== window.location.origin) {
        throw new TypeError('Worker scripts must be same-origin');
      }
      return value;
    },
  });

  return trustedWorkerPolicy.createScriptURL(url.href);
};

export class ConversionWorkerPool {
  private workers: ActiveWorkerSlot[] = [];
  private taskQueue: WorkerTask[] = [];
  private poolSize: number;
  private isDestroyed = false;
  private activeTasksMap = new Map<string, WorkerTask>();

  constructor() {
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2;
    this.poolSize = Math.min(2, Math.max(1, cores));
  }

  private initWorker(): ActiveWorkerSlot {
    const worker = new Worker(getTrustedWorkerUrl(new URL(conversionWorkerUrl, import.meta.url)), {
      type: 'module',
    });

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
                const { generatePdfFromImages } = await import('./pdfGenerator');
                const pdfBytes = await generatePdfFromImages(
                  [
                    {
                      buffer: msg.payload.buffer,
                      mimeType: msg.payload.mimeType || 'image/jpeg',
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
    if (this.isDestroyed) return;

    while (this.taskQueue.length > 0) {
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
  }
}
