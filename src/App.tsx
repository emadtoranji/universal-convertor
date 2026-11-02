import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { Dropzone } from './components/Dropzone';
import { ConversionToolbar } from './components/ConversionToolbar';
import { FileQueueItem } from './components/FileQueueItem';
import { PreviewModal } from './components/PreviewModal';
import {
  ConversionOptions,
  OutputFormat,
  QueueItem,
  InputFormat,
  getCompatibleOutputFormats,
  isHomogeneousQueue,
} from './types/converter';
import { isExtensionSupported, verifyContentMatchesFormat } from './utils/magicBytes';
import { sanitizeSvgString } from './utils/svgSanitizer';
import { ConversionWorkerPool } from './core/workerPool';
import { createZipArchive } from './core/zipArchiver';
import { generatePdfFromImages } from './core/pdfGenerator';
import { convertAudioToWav, extractAudioMetadata, AudioSampleRate } from './core/audioConverter';
import { captureVideoSnapshot, extractAudioFromVideo, extractVideoMetadata } from './core/videoConverter';
import { convertDocument, DocumentFormat } from './core/documentConverter';
import { t } from './utils/i18n';
import {
  Layers,
  ShieldCheck,
  Zap,
  FileCheck,
  HelpCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Scale,
  FileCode,
  AlertTriangle,
  UploadCloud,
} from 'lucide-react';
import {
  getOrInitEffectiveTheme,
  setThemeCookie,
  applyThemeToDocument,
  getThemeCookie,
  ThemeMode,
} from './utils/theme';

const DEFAULT_OPTIONS: ConversionOptions = {
  targetFormat: 'webp',
  quality: 90,
  resizeMode: 'original',
  resizePercentage: 100,
  maintainAspectRatio: true,
  backgroundColor: '#ffffff',
  stripExif: true,
  audioBitDepth: '16',
  audioSampleRate: 44100,
  audioChannels: 'stereo',
  videoSnapshotPoint: 'mid',
  pdfPageSize: 'original',
  pdfOrientation: 'auto',
};

const PAGE_SIZE = 25;
const INGESTION_CHUNK_SIZE = 20;

export default function App(): React.ReactElement {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [globalOptions, setGlobalOptions] = useState<ConversionOptions>(DEFAULT_OPTIONS);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewItem, setPreviewItem] = useState<QueueItem | null>(null);
  const [isDark, setIsDark] = useState<boolean>(() => getOrInitEffectiveTheme() === 'dark');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [isWindowDragOver, setIsWindowDragOver] = useState<boolean>(false);
  const [isBoxDragOver, setIsBoxDragOver] = useState<boolean>(false);
  const dragCounterRef = useRef<number>(0);
  const abortProcessingRef = useRef<boolean>(false);
  const processIncomingFilesRef = useRef<(files: File[]) => Promise<void>>(() => Promise.resolve());

  const workerPoolRef = useRef<ConversionWorkerPool | null>(null);

  useEffect(() => {
    workerPoolRef.current = new ConversionWorkerPool();
    applyThemeToDocument(getOrInitEffectiveTheme());

    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/');
    }

    const handleWindowDragEnter = (e: DragEvent): void => {
      e.preventDefault();
      dragCounterRef.current++;
      setIsWindowDragOver(true);
    };

    const handleWindowDragOver = (e: DragEvent): void => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      setIsWindowDragOver(true);
    };

    const handleWindowDragLeave = (e: DragEvent): void => {
      e.preventDefault();
      dragCounterRef.current--;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsWindowDragOver(false);
        setIsBoxDragOver(false);
      }
    };

    const handleWindowDrop = (e: DragEvent): void => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsWindowDragOver(false);
      setIsBoxDragOver(false);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        processIncomingFilesRef.current(Array.from(e.dataTransfer.files));
      }
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      workerPoolRef.current?.destroy();
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent): void => {
      const existingCookie = getThemeCookie();
      if (!existingCookie) {
        const newTheme: ThemeMode = e.matches ? 'dark' : 'light';
        setThemeCookie(newTheme);
        applyThemeToDocument(newTheme);
        setIsDark(newTheme === 'dark');
      }
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  const handleToggleTheme = useCallback((): void => {
    setIsDark((prev) => {
      const nextMode: ThemeMode = prev ? 'light' : 'dark';
      setThemeCookie(nextMode);
      applyThemeToDocument(nextMode);
      return !prev;
    });
  }, []);

  const getFormatExtension = useCallback((format: OutputFormat): string => {
    switch (format) {
      case 'jpeg':
        return 'jpg';
      case 'tiff':
        return 'tiff';
      case 'ico':
        return 'ico';
      case 'bmp':
        return 'bmp';
      case 'pdf':
        return 'pdf';
      case 'avif':
        return 'avif';
      case 'webp':
        return 'webp';
      case 'wav':
        return 'wav';
      case 'html':
        return 'html';
      case 'md':
        return 'md';
      case 'json':
        return 'json';
      case 'csv':
        return 'csv';
      case 'tsv':
        return 'tsv';
      case 'txt':
        return 'txt';
      case 'xml':
        return 'xml';
      case 'yaml':
        return 'yaml';
      case 'png':
      default:
        return 'png';
    }
  }, []);

  const processIncomingFiles = useCallback(
    async (files: File[]): Promise<void> => {
      for (let i = 0; i < files.length; i += INGESTION_CHUNK_SIZE) {
        const chunk = files.slice(i, i + INGESTION_CHUNK_SIZE);
        const chunkItems: QueueItem[] = [];

        for (const file of chunk) {
          const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          try {
            const extCheck = isExtensionSupported(file.name);
            if (!extCheck.supported || !extCheck.format || !extCheck.category) {
              chunkItems.push({
                id,
                file,
                name: file.name,
                sourceFormat: (extCheck.extension || 'txt') as InputFormat,
                category: 'document',
                originalSize: file.size,
                originalWidth: 0,
                originalHeight: 0,
                previewUrl: '',
                status: 'error',
                progress: 0,
                errorMessage: `Unsupported file format (.${extCheck.extension || 'unknown'}). Supported: PNG, JPG, WebP, MP4, WAV, PDF, JSON, XML, YAML, etc.`,
                options: { ...globalOptions },
              });
              continue;
            }

            const sourceFormat = extCheck.format;
            const category = extCheck.category;
            let width = 0;
            let height = 0;
            let duration: number | undefined;
            let previewUrl = '';

            if (category === 'image') {
              if (sourceFormat === 'svg') {
                const text = await file.text();
                const cleanSvg = sanitizeSvgString(text);
                const cleanBlob = new Blob([cleanSvg], { type: 'image/svg+xml' });
                previewUrl = URL.createObjectURL(cleanBlob);
                try {
                  const bitmap = await createImageBitmap(cleanBlob);
                  width = bitmap.width;
                  height = bitmap.height;
                  bitmap.close();
                } catch {}
              } else {
                previewUrl = URL.createObjectURL(file);
                try {
                  const bitmap = await createImageBitmap(file);
                  width = bitmap.width;
                  height = bitmap.height;
                  bitmap.close();
                } catch {}
              }
            } else if (category === 'audio') {
              try {
                const ab = await file.slice(0, 8192).arrayBuffer();
                const meta = await extractAudioMetadata(ab);
                duration = meta.duration;
              } catch {}
            } else if (category === 'video') {
              previewUrl = URL.createObjectURL(file);
              try {
                const meta = await extractVideoMetadata(file);
                duration = meta.duration;
                width = meta.videoWidth;
                height = meta.videoHeight;
              } catch {}
            }

            const compatible = getCompatibleOutputFormats(sourceFormat);
            const initialTarget = compatible.includes(globalOptions.targetFormat)
              ? globalOptions.targetFormat
              : compatible[0] || (category === 'audio' ? 'wav' : category === 'video' ? 'wav' : category === 'document' ? 'json' : 'webp');

            chunkItems.push({
              id,
              file,
              name: file.name,
              sourceFormat,
              category,
              originalSize: file.size,
              originalWidth: width,
              originalHeight: height,
              duration,
              previewUrl,
              status: 'idle',
              progress: 0,
              options: { ...globalOptions, targetFormat: initialTarget },
            });
          } catch {
            chunkItems.push({
              id,
              file,
              name: file.name,
              sourceFormat: 'png',
              category: 'image',
              originalSize: file.size,
              originalWidth: 0,
              originalHeight: 0,
              previewUrl: '',
              status: 'error',
              progress: 0,
              errorMessage: 'Unable to process file.',
              options: { ...globalOptions },
            });
          }
        }

        setQueue((prev) => [...prev, ...chunkItems]);

        if (i + INGESTION_CHUNK_SIZE < files.length) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    },
    [globalOptions]
  );

  processIncomingFilesRef.current = processIncomingFiles;

  const handleGlobalOptionsChange = useCallback((newOptions: ConversionOptions): void => {
    setGlobalOptions(newOptions);
    setQueue((prev) =>
      prev.map((item) => {
        if (item.status === 'idle') {
          const compatible = getCompatibleOutputFormats(item.sourceFormat);
          const target = compatible.includes(newOptions.targetFormat)
            ? newOptions.targetFormat
            : compatible[0] || item.options.targetFormat;
          return { ...item, options: { ...newOptions, targetFormat: target } };
        }
        return item;
      })
    );
  }, []);

  const handleItemFormatChange = useCallback((id: string, targetFormat: OutputFormat): void => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, options: { ...item.options, targetFormat } } : item
      )
    );
  }, []);

  const handleItemOptionsChange = useCallback((id: string, newOptions: ConversionOptions): void => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, options: newOptions } : item))
    );
  }, []);

  const handleRegenerate = useCallback((id: string): void => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (item.result) {
            URL.revokeObjectURL(item.result.url);
            if (item.result.previewUrl && item.result.previewUrl !== item.result.url) {
              URL.revokeObjectURL(item.result.previewUrl);
            }
          }
          return {
            ...item,
            status: 'idle',
            progress: 0,
            result: undefined,
          };
        }
        return item;
      })
    );
  }, []);

  const handleRemoveItem = useCallback((id: string): void => {
    setQueue((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        if (target.result) {
          URL.revokeObjectURL(target.result.url);
          if (target.result.previewUrl && target.result.previewUrl !== target.result.url) {
            URL.revokeObjectURL(target.result.previewUrl);
          }
        }
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const handleClearQueue = useCallback((): void => {
    abortProcessingRef.current = true;
    setIsProcessing(false);
    setQueue((prev) => {
      for (const item of prev) {
        URL.revokeObjectURL(item.previewUrl);
        if (item.result) {
          URL.revokeObjectURL(item.result.url);
          if (item.result.previewUrl && item.result.previewUrl !== item.result.url) {
            URL.revokeObjectURL(item.result.previewUrl);
          }
        }
      }
      return [];
    });
    setCurrentPage(1);
  }, []);

  const convertSingleItem = useCallback(
    async (id: string): Promise<boolean> => {
      const item = queue.find((i) => i.id === id);
      if (!item) return false;

      setQueue((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: 'processing', progress: 15 } : i))
      );

      try {
        const sampleBuffer = await item.file.slice(0, 4096).arrayBuffer();
        const verifyResult = verifyContentMatchesFormat(sampleBuffer, item.sourceFormat, item.name);
        if (!verifyResult.matches) {
          setQueue((prev) =>
            prev.map((i) =>
              i.id === id
                ? {
                    ...i,
                    status: 'error',
                    progress: 0,
                    errorMessage: `Content mismatch: ${verifyResult.reason || 'File content does not match extension.'}`,
                  }
                : i
            )
          );
          return false;
        }

        if (item.category === 'audio') {
          const bitDepth = item.options.audioBitDepth ? (Number(item.options.audioBitDepth) as 16 | 24 | 32) : 16;
          const sampleRate = item.options.audioSampleRate ? (item.options.audioSampleRate as AudioSampleRate) : undefined;
          const ab = await item.file.arrayBuffer();
          const result = await convertAudioToWav(
            ab,
            {
              bitDepth,
              sampleRate,
              channelMode: item.options.audioChannels,
            }
          );

          const resultUrl = URL.createObjectURL(result.blob);
          setQueue((prev) =>
            prev.map((i) =>
              i.id === id
                ? {
                    ...i,
                    status: 'completed',
                    progress: 100,
                    result: {
                      blob: result.blob,
                      url: resultUrl,
                      previewUrl: resultUrl,
                      size: result.size,
                      format: 'wav',
                      width: 0,
                      height: 0,
                      duration: result.duration,
                      mimeType: 'audio/wav',
                    },
                  }
                : i
            )
          );
          return true;
        }

        if (item.category === 'video') {
          if (item.options.targetFormat === 'wav') {
            const result = await extractAudioFromVideo(item.file);
            const resultUrl = URL.createObjectURL(result.blob);
            setQueue((prev) =>
              prev.map((i) =>
                i.id === id
                  ? {
                      ...i,
                      status: 'completed',
                      progress: 100,
                      result: {
                        blob: result.blob,
                        url: resultUrl,
                        previewUrl: resultUrl,
                        size: result.size,
                        format: 'wav',
                        width: 0,
                        height: 0,
                        duration: result.duration,
                        mimeType: 'audio/wav',
                      },
                    }
                  : i
              )
            );
            return true;
          } else {
            const format = (item.options.targetFormat === 'jpeg' ? 'jpeg' : item.options.targetFormat === 'webp' ? 'webp' : 'png') as 'png' | 'jpeg' | 'webp';
            const result = await captureVideoSnapshot(item.file, {
              timePoint: item.options.videoSnapshotPoint ?? 'mid',
              format,
              quality: item.options.quality,
            });
            setQueue((prev) =>
              prev.map((i) =>
                i.id === id
                  ? {
                      ...i,
                      status: 'completed',
                      progress: 100,
                      result: {
                        blob: result.blob,
                        url: result.url,
                        previewUrl: result.url,
                        size: result.size,
                        format: result.format,
                        width: result.width,
                        height: result.height,
                        mimeType: result.blob.type,
                      },
                    }
                  : i
              )
            );
            return true;
          }
        }

        if (item.category === 'document') {
          const inputData = item.sourceFormat === 'pdf' ? await item.file.arrayBuffer() : await item.file.text();
          const targetFmt = item.options.targetFormat as DocumentFormat;
          const result = await convertDocument(inputData, {
            sourceFormat: item.sourceFormat as DocumentFormat,
            targetFormat: targetFmt,
            fileName: item.name,
            prettyJson: item.options.quality > 50,
            jsonIndent: item.options.jsonIndent ?? 2,
            jsonSortKeys: item.options.jsonSortKeys ?? false,
            pdfPageSize: item.options.pdfPageSize === 'original' ? 'a4' : item.options.pdfPageSize,
            pdfOrientation: item.options.pdfOrientation === 'auto' ? 'portrait' : item.options.pdfOrientation,
          });

          const blobData = typeof result.data === 'string' ? new TextEncoder().encode(result.data) : result.data;
          const blob = new Blob([blobData as BlobPart], { type: result.mimeType });
          const resultUrl = URL.createObjectURL(blob);
          setQueue((prev) =>
            prev.map((i) =>
              i.id === id
                ? {
                    ...i,
                    status: 'completed',
                    progress: 100,
                    result: {
                      blob,
                      url: resultUrl,
                      previewUrl: resultUrl,
                      size: blob.size,
                      format: item.options.targetFormat,
                      width: targetFmt === 'png' ? 800 : 0,
                      height: targetFmt === 'png' ? 1132 : 0,
                      mimeType: result.mimeType,
                    },
                  }
                : i
            )
          );
          return true;
        }

        const pool = workerPoolRef.current;
        if (!pool) return false;

        const fullBuffer = await item.file.arrayBuffer();

        return await new Promise<boolean>((resolve) => {
          pool.enqueueTask({
            payload: {
              id: item.id,
              buffer: fullBuffer,
              sourceFormat: item.sourceFormat,
              targetFormat: item.options.targetFormat,
              options: item.options,
              originalWidth: item.originalWidth,
              originalHeight: item.originalHeight,
              fileName: item.name,
            },
            transferables: [fullBuffer],
            onProgress: (progress) => {
              setQueue((prev) =>
                prev.map((i) => (i.id === id ? { ...i, progress } : i))
              );
            },
            onSuccess: async (resultPayload) => {
              let finalBuffer = resultPayload.buffer.slice(0);
              let finalMime = resultPayload.mimeType;

              if (resultPayload.targetFormat === 'pdf') {
                const pdfBytes = await generatePdfFromImages(
                  [
                    {
                      buffer: finalBuffer,
                      mimeType: 'image/png',
                      name: item.name,
                      width: resultPayload.width,
                      height: resultPayload.height,
                    },
                  ],
                  {
                    pageSize: item.options.pdfPageSize,
                    orientation: item.options.pdfOrientation,
                  }
                );
                const copy = pdfBytes.buffer.slice(
                  pdfBytes.byteOffset,
                  pdfBytes.byteOffset + pdfBytes.byteLength
                );
                finalBuffer = copy as ArrayBuffer;
                finalMime = 'application/pdf';
              }

              const mainBlob = new Blob([finalBuffer], { type: finalMime });
              const mainDownloadUrl = URL.createObjectURL(mainBlob);

              let previewDisplayUrl: string;
              if (resultPayload.previewBuffer) {
                const previewBlob = new Blob([resultPayload.previewBuffer.slice(0)], {
                  type: 'image/png',
                });
                previewDisplayUrl = URL.createObjectURL(previewBlob);
              } else {
                previewDisplayUrl = mainDownloadUrl;
              }

              setQueue((prev) =>
                prev.map((i) =>
                  i.id === id
                    ? {
                        ...i,
                        status: 'completed',
                        progress: 100,
                        result: {
                          blob: mainBlob,
                          url: mainDownloadUrl,
                          previewUrl: previewDisplayUrl,
                          size: finalBuffer.byteLength,
                          format: resultPayload.targetFormat,
                          width: resultPayload.width,
                          height: resultPayload.height,
                          mimeType: finalMime,
                        },
                      }
                    : i
                )
              );
              resolve(true);
            },
            onError: (errorMessage) => {
              setQueue((prev) =>
                prev.map((i) => (i.id === id ? { ...i, status: 'error', errorMessage } : i))
              );
              resolve(false);
            },
          });
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Conversion execution failed';
        setQueue((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status: 'error', errorMessage: msg } : i))
        );
        return false;
      }
    },
    [queue]
  );

  const handleConvertAll = useCallback(async (): Promise<void> => {
    if (isProcessing) return;
    setIsProcessing(true);
    abortProcessingRef.current = false;
    const idleIds = queue.filter((i) => i.status === 'idle').map((i) => i.id);

    for (const id of idleIds) {
      if (abortProcessingRef.current) break;
      await convertSingleItem(id);
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
    setIsProcessing(false);
  }, [queue, convertSingleItem, isProcessing]);

  const handleDownloadSingle = useCallback(
    (item: QueueItem): void => {
      if (!item.result) return;
      const ext = getFormatExtension(item.result.format);
      const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
      const downloadFileName = `${baseName}.${ext}`;

      const anchor = document.createElement('a');
      anchor.href = item.result.url;
      anchor.download = downloadFileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    },
    [getFormatExtension]
  );

  const handleDownloadZip = useCallback(async (): Promise<void> => {
    const completedItems = queue.filter((i) => i.status === 'completed' && i.result);
    if (completedItems.length === 0) return;

    const fileEntries: { fileName: string; buffer: ArrayBuffer }[] = [];

    for (const item of completedItems) {
      if (item.result) {
        const ext = getFormatExtension(item.result.format);
        const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
        const ab = await item.result.blob.arrayBuffer();
        fileEntries.push({
          fileName: `${baseName}.${ext}`,
          buffer: ab,
        });
      }
    }

    const zipBlob = createZipArchive(fileEntries);
    const zipUrl = URL.createObjectURL(zipBlob);
    const anchor = document.createElement('a');
    anchor.href = zipUrl;
    anchor.download = `universal_convertor_${Date.now()}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(zipUrl), 2000);
  }, [queue, getFormatExtension]);

  const handleMergeToPdf = useCallback(async (): Promise<void> => {
    const completedItems = queue.filter((i) => i.status === 'completed' && i.result);
    if (completedItems.length === 0) return;

    const pdfInputs = await Promise.all(
      completedItems.map(async (item) => {
        const ab = item.result ? await item.result.blob.arrayBuffer() : new ArrayBuffer(0);
        return {
          buffer: ab,
          mimeType: item.result?.mimeType ?? 'image/png',
          name: item.name,
          width: item.result?.width ?? 800,
          height: item.result?.height ?? 600,
        };
      })
    );

    const pdfBytes = await generatePdfFromImages(pdfInputs, {
      pageSize: globalOptions.pdfPageSize,
      orientation: globalOptions.pdfOrientation,
    });

    const pdfBufferCopy = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    );
    const pdfBlob = new Blob([pdfBufferCopy as ArrayBuffer], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(pdfBlob);

    const anchor = document.createElement('a');
    anchor.href = pdfUrl;
    anchor.download = `universal_convertor_merged_${Date.now()}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 2000);
  }, [queue, globalOptions.pdfPageSize, globalOptions.pdfOrientation]);

  const handleOpenPreview = useCallback((item: QueueItem): void => {
    setPreviewItem(item);
  }, []);

  const handleClosePreview = useCallback((): void => {
    setPreviewItem(null);
  }, []);

  const toggleFaq = useCallback((index: number): void => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  }, []);

  const completedCount = useMemo(
    () => queue.filter((i) => i.status === 'completed').length,
    [queue]
  );

  const totalOriginalBytes = useMemo(
    () => queue.reduce((acc, curr) => acc + curr.originalSize, 0),
    [queue]
  );

  const totalConvertedBytes = useMemo(
    () => queue.reduce((acc, curr) => acc + (curr.result?.size ?? 0), 0),
    [queue]
  );

  const canConvertAll = useMemo(
    () => isHomogeneousQueue(queue),
    [queue]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(queue.length / PAGE_SIZE)),
    [queue.length]
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const visibleItems = useMemo(() => {
    if (queue.length <= PAGE_SIZE) return queue;
    const start = (currentPage - 1) * PAGE_SIZE;
    return queue.slice(start, start + PAGE_SIZE);
  }, [queue, currentPage]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      {isWindowDragOver && !isBoxDragOver && (
        <div className="fixed inset-0 z-50 pointer-events-none transition-all duration-300 bg-cyan-500/10 dark:bg-cyan-500/15 backdrop-blur-[2px] p-4 sm:p-6 flex items-center justify-center">
          <div className="w-full h-full border-4 border-dashed border-cyan-500/80 dark:border-cyan-400/90 rounded-3xl flex items-center justify-center animate-pulse">
            <div className="px-6 py-3.5 rounded-2xl bg-white/95 dark:bg-zinc-900/95 border border-cyan-500/40 shadow-2xl flex items-center gap-3 text-cyan-600 dark:text-cyan-400 font-bold text-sm sm:text-base">
              <UploadCloud className="w-6 h-6 animate-bounce" />
              <span>Drop files anywhere to upload</span>
            </div>
          </div>
        </div>
      )}

      <Header
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 flex flex-col gap-6 sm:gap-8">
        <section aria-label="Conversion Operations" className="w-full space-y-4">
          <Dropzone
            onFilesSelected={processIncomingFiles}
            onHoverStateChange={setIsBoxDragOver}
          />

          {queue.length > 0 && (
            <div className="space-y-4 sm:space-y-6 pt-2">
              <ConversionToolbar
                globalOptions={globalOptions}
                onOptionsChange={handleGlobalOptionsChange}
                onConvertAll={handleConvertAll}
                onDownloadZip={handleDownloadZip}
                onMergeToPdf={handleMergeToPdf}
                onClearQueue={handleClearQueue}
                isProcessing={isProcessing}
                totalCount={queue.length}
                completedCount={completedCount}
                totalOriginalBytes={totalOriginalBytes}
                totalConvertedBytes={totalConvertedBytes}
                canConvertAll={canConvertAll}
              />

              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs sm:text-sm font-semibold tracking-wide uppercase text-zinc-600 dark:text-zinc-400">
                    {t.queue.header.title} {t('queue.header.countBadge', { count: queue.length })}
                  </h2>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-500 font-mono text-[11px]">
                        {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, queue.length)} / {queue.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className="p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          aria-label="Previous Page"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-1.5 py-0.5 font-mono text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                          {currentPage}/{totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className="p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          aria-label="Next Page"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                  {visibleItems.map((item) => (
                    <div key={item.id} style={{ contentVisibility: 'auto', containIntrinsicSize: '84px' }}>
                      <FileQueueItem
                        item={item}
                        onRemove={handleRemoveItem}
                        onConvertSingle={convertSingleItem}
                        onDownloadSingle={handleDownloadSingle}
                        onPreview={handleOpenPreview}
                        onTargetFormatChange={handleItemFormatChange}
                        onOptionsChange={handleItemOptionsChange}
                        onRegenerate={handleRegenerate}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="text-center max-w-4xl mx-auto space-y-3 sm:space-y-4 pt-4 sm:pt-6 border-t border-zinc-200/80 dark:border-zinc-800/80">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-800/80 text-cyan-800 dark:text-cyan-400 text-xs font-semibold shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t.features.badge}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-zinc-900 dark:text-white leading-tight">
            {t.features.heroTitle}{' '}
            <span className="bg-gradient-to-r from-cyan-600 via-teal-500 to-indigo-600 dark:from-cyan-400 dark:via-teal-300 dark:to-indigo-400 bg-clip-text text-transparent">
              {t.features.heroTitleAccent}
            </span>
          </h1>

          <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm md:text-base leading-relaxed max-w-3xl mx-auto">
            {t.features.heroSubtitle}
          </p>
        </section>

        <section aria-label="Key Features" className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-zinc-600 dark:text-zinc-400 text-xs">
          {t.features.cards.slice(0, 3).map((card) => (
            <div key={card.id} className="flex items-start gap-3.5 p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/90 shadow-xs">
              <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex-shrink-0">
                {card.id === 'privacy' ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                ) : card.id === 'performance' ? (
                  <Zap className="w-5 h-5 text-cyan-500" />
                ) : (
                  <Layers className="w-5 h-5 text-indigo-500" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mb-1">{card.title}</h3>
                <p className="leading-relaxed">{card.description}</p>
              </div>
            </div>
          ))}
        </section>

        <section aria-label="Format Matrix and Specifications" className="rounded-2xl sm:rounded-3xl p-5 sm:p-7 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-400">
              <FileCheck className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {t.matrix.title}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {Object.values(t.matrix.categories).map((cat) => (
              <div key={cat.id} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  {cat.title}
                </h4>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                  {cat.description}
                </p>
                <div className="pt-1 space-y-1 text-[11px]">
                  <div>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">Inputs: </span>
                    <span className="text-zinc-500">{cat.inputs.join(', ')}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-cyan-700 dark:text-cyan-400">Outputs: </span>
                    <span className="text-zinc-500">{cat.outputs.join(', ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Frequently Asked Questions" className="rounded-2xl sm:rounded-3xl p-5 sm:p-7 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400">
              <HelpCircle className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {t.faq.title}
            </h2>
          </div>

          <div className="space-y-2.5">
            {t.faq.items.map((faqItem, idx) => (
              <div
                key={faqItem.id}
                className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/50 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 cursor-pointer"
                >
                  <span>{faqItem.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-500 transition-transform duration-200 flex-shrink-0 ${
                      openFaqIndex === idx ? 'rotate-180 text-cyan-500' : ''
                    }`}
                  />
                </button>
                {openFaqIndex === idx && (
                  <div className="px-4 pb-3.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-200/50 dark:border-zinc-800/50 pt-2">
                    {faqItem.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Terms of Service & Disclaimer" className="rounded-2xl sm:rounded-3xl p-5 sm:p-7 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400">
                <Scale className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {t.terms.title}
              </h2>
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 text-[11px] font-medium border border-zinc-200 dark:border-zinc-800">
              <FileCode className="w-3 h-3 text-cyan-500" />
              <span>{t.terms.badge}</span>
            </div>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {t.terms.subtitle}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            {t.terms.items.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-1.5"
              >
                <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-200">
                  {item.id === 'warranty' || item.id === 'liability' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  ) : item.id === 'privacy' ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <FileCode className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                  )}
                  <span>{item.title}</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <footer className="pt-4 pb-6 text-center text-xs text-zinc-500 dark:text-zinc-500">
          <p>© {new Date().getFullYear()} Universal Convertor • 100% Free Client-Side Conversion Engine</p>
        </footer>
      </main>

      <PreviewModal
        item={previewItem}
        onClose={handleClosePreview}
        onDownload={handleDownloadSingle}
      />
    </div>
  );
}
