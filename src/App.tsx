import {
    lazy,
    Suspense,
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
    type ReactElement,
} from 'react';
import { Header } from './components/Header';
import { Dropzone } from './components/Dropzone';
import {
    ConversionOptions,
    OutputFormat,
    QueueItem,
    InputFormat,
    getCompatibleOutputFormats,
    isHomogeneousQueue,
} from './types/converter';
import {
    isExtensionSupported,
    verifyContentMatchesFormat,
} from './utils/magicBytes';
import { sanitizeSvgString } from './utils/svgSanitizer';
import type { ConversionWorkerPool } from './core/workerPool';
import type { DocumentFormat } from './core/documentConverter';
import { t } from './utils/i18n';
import {
    BadgeCheck,
    CloudOff,
    Infinity,
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

const ConversionToolbar = lazy(() =>
    import('./components/ConversionToolbar').then(({ ConversionToolbar }) => ({
        default: ConversionToolbar,
    })),
);
const FileQueueItem = lazy(() =>
    import('./components/FileQueueItem').then(({ FileQueueItem }) => ({
        default: FileQueueItem,
    })),
);
const PreviewModal = lazy(() =>
    import('./components/PreviewModal').then(({ PreviewModal }) => ({
        default: PreviewModal,
    })),
);

const DEFAULT_OPTIONS: ConversionOptions = {
    targetFormat: 'webp',
    quality: 85,
    resizeMode: 'original',
    resizePercentage: 100,
    maintainAspectRatio: true,
    backgroundColor: '#ffffff',
    stripExif: true,
    grayscale: false,
    pdfPageSize: 'original',
    pdfOrientation: 'auto',
};

const PAGE_SIZE = 25;
const INGESTION_CHUNK_SIZE = 20;

export default function App(): ReactElement {
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [globalOptions, setGlobalOptions] =
        useState<ConversionOptions>(DEFAULT_OPTIONS);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [previewItem, setPreviewItem] = useState<QueueItem | null>(null);
    const [isDark, setIsDark] = useState<boolean>(
        () => getOrInitEffectiveTheme() === 'dark',
    );
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
    const [isWindowDragOver, setIsWindowDragOver] = useState<boolean>(false);
    const [isBoxDragOver, setIsBoxDragOver] = useState<boolean>(false);
    const dragCounterRef = useRef<number>(0);
    const abortProcessingRef = useRef<boolean>(false);
    const processIncomingFilesRef = useRef<(files: File[]) => Promise<void>>(
        () => Promise.resolve(),
    );

    const workerPoolRef = useRef<ConversionWorkerPool | null>(null);

    useEffect(() => {
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
                processIncomingFilesRef.current(
                    Array.from(e.dataTransfer.files),
                );
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
            case 'json':
                return 'json';
            case 'csv':
                return 'csv';
            case 'tsv':
                return 'tsv';
            case 'md':
                return 'md';
            case 'html':
                return 'html';
            case 'txt':
                return 'txt';
            case 'xml':
                return 'xml';
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
                        if (
                            !extCheck.supported ||
                            !extCheck.format ||
                            !extCheck.category
                        ) {
                            chunkItems.push({
                                id,
                                file,
                                name: file.name,
                                sourceFormat: (extCheck.extension ||
                                    'json') as InputFormat,
                                category: 'document',
                                originalSize: file.size,
                                originalWidth: 0,
                                originalHeight: 0,
                                previewUrl: '',
                                status: 'error',
                                progress: 0,
                                errorMessage: `Unsupported file format (.${extCheck.extension || 'unknown'}). Supported: PNG, JPG, JPEG, JFIF, WebP, AVIF, HEIC, HEIF, SVG, BMP, ICO, TIFF, PSD, GIF, MD, HTML, TXT, XML, JSON, CSV, TSV.`,
                                options: { ...globalOptions },
                            });
                            continue;
                        }

                        const sourceFormat = extCheck.format;
                        const category = extCheck.category;
                        let width = 0;
                        let height = 0;
                        let previewUrl = '';

                        if (category === 'image') {
                            if (sourceFormat === 'svg') {
                                const text = await file.text();
                                const cleanSvg = sanitizeSvgString(text);
                                const cleanBlob = new Blob([cleanSvg], {
                                    type: 'image/svg+xml',
                                });
                                previewUrl = URL.createObjectURL(cleanBlob);
                                try {
                                    const bitmap =
                                        await createImageBitmap(cleanBlob);
                                    width = bitmap.width;
                                    height = bitmap.height;
                                    bitmap.close();
                                } catch {}
                            } else if (sourceFormat === 'psd') {
                                try {
                                    const ab = await file.arrayBuffer();
                                    const { decodePsdBuffer } =
                                        await import('./core/converters/psdConverter');
                                    const psdRes = await decodePsdBuffer(ab);
                                    width = psdRes.width;
                                    height = psdRes.height;
                                    const c = document.createElement('canvas');
                                    c.width = width;
                                    c.height = height;
                                    const cCtx = c.getContext('2d');
                                    if (cCtx) {
                                        cCtx.putImageData(
                                            psdRes.imageData,
                                            0,
                                            0,
                                        );
                                        previewUrl = c.toDataURL('image/png');
                                    }
                                } catch {}
                            } else {
                                const imageSource =
                                    sourceFormat === 'heic'
                                        ? new Blob([file], {
                                              type: 'image/heic',
                                          })
                                        : file;
                                previewUrl = URL.createObjectURL(imageSource);
                                try {
                                    const bitmap =
                                        await createImageBitmap(imageSource);
                                    width = bitmap.width;
                                    height = bitmap.height;
                                    bitmap.close();
                                } catch {}
                            }
                        }

                        const compatible =
                            getCompatibleOutputFormats(sourceFormat);
                        const initialTarget = compatible.includes(
                            globalOptions.targetFormat,
                        )
                            ? globalOptions.targetFormat
                            : compatible[0] ||
                              (category === 'document' ? 'json' : 'webp');

                        chunkItems.push({
                            id,
                            file,
                            name: file.name,
                            sourceFormat,
                            category,
                            originalSize: file.size,
                            originalWidth: width,
                            originalHeight: height,
                            previewUrl,
                            status: 'idle',
                            progress: 0,
                            options: {
                                ...globalOptions,
                                targetFormat: initialTarget,
                            },
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
        [globalOptions],
    );

    processIncomingFilesRef.current = processIncomingFiles;

    const handleGlobalOptionsChange = useCallback(
        (newOptions: ConversionOptions): void => {
            setGlobalOptions(newOptions);
            setQueue((prev) =>
                prev.map((item) => {
                    if (item.status === 'idle') {
                        const compatible = getCompatibleOutputFormats(
                            item.sourceFormat,
                        );
                        const target = compatible.includes(
                            newOptions.targetFormat,
                        )
                            ? newOptions.targetFormat
                            : compatible[0] || item.options.targetFormat;
                        return {
                            ...item,
                            options: { ...newOptions, targetFormat: target },
                        };
                    }
                    return item;
                }),
            );
        },
        [],
    );

    const handleItemFormatChange = useCallback(
        (id: string, targetFormat: OutputFormat): void => {
            setQueue((prev) =>
                prev.map((item) =>
                    item.id === id
                        ? {
                              ...item,
                              options: { ...item.options, targetFormat },
                          }
                        : item,
                ),
            );
        },
        [],
    );

    const handleItemOptionsChange = useCallback(
        (id: string, newOptions: ConversionOptions): void => {
            setQueue((prev) =>
                prev.map((item) =>
                    item.id === id ? { ...item, options: newOptions } : item,
                ),
            );
        },
        [],
    );

    const handleRegenerate = useCallback((id: string): void => {
        setQueue((prev) =>
            prev.map((item) => {
                if (item.id === id) {
                    if (item.result) {
                        URL.revokeObjectURL(item.result.url);
                        if (
                            item.result.previewUrl &&
                            item.result.previewUrl !== item.result.url
                        ) {
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
            }),
        );
    }, []);

    const handleRemoveItem = useCallback((id: string): void => {
        setQueue((prev) => {
            const target = prev.find((i) => i.id === id);
            if (target) {
                URL.revokeObjectURL(target.previewUrl);
                if (target.result) {
                    URL.revokeObjectURL(target.result.url);
                    if (
                        target.result.previewUrl &&
                        target.result.previewUrl !== target.result.url
                    ) {
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
                    if (
                        item.result.previewUrl &&
                        item.result.previewUrl !== item.result.url
                    ) {
                        URL.revokeObjectURL(item.result.previewUrl);
                    }
                }
            }
            return [];
        });
        setCurrentPage(1);
    }, []);

    const handleResetAll = useCallback((): void => {
        setQueue((prev) =>
            prev.map((item) => {
                if (item.result) {
                    URL.revokeObjectURL(item.result.url);
                    if (
                        item.result.previewUrl &&
                        item.result.previewUrl !== item.result.url
                    ) {
                        URL.revokeObjectURL(item.result.previewUrl);
                    }
                }
                return {
                    ...item,
                    status: 'idle',
                    progress: 0,
                    result: undefined,
                };
            }),
        );
    }, []);

    const convertSingleItem = useCallback(
        async (id: string): Promise<boolean> => {
            const item = queue.find((i) => i.id === id);
            if (!item) return false;

            setQueue((prev) =>
                prev.map((i) =>
                    i.id === id
                        ? { ...i, status: 'processing', progress: 15 }
                        : i,
                ),
            );

            try {
                const sampleBuffer = await item.file
                    .slice(0, 4096)
                    .arrayBuffer();
                const verifyResult = verifyContentMatchesFormat(
                    sampleBuffer,
                    item.sourceFormat,
                    item.name,
                );
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
                                : i,
                        ),
                    );
                    return false;
                }

                if (item.category === 'document') {
                    const inputData = await item.file.text();
                    const targetFmt = item.options
                        .targetFormat as DocumentFormat;
                    const { convertDocument } =
                        await import('./core/documentConverter');
                    const result = await convertDocument(inputData, {
                        sourceFormat: item.sourceFormat as DocumentFormat,
                        targetFormat: targetFmt,
                        fileName: item.name,
                        prettyJson: item.options.quality > 50,
                        jsonIndent: item.options.jsonIndent ?? 2,
                        jsonSortKeys: item.options.jsonSortKeys ?? false,
                    });

                    const blobData =
                        typeof result.data === 'string'
                            ? new TextEncoder().encode(result.data)
                            : result.data;
                    const blob = new Blob([blobData as BlobPart], {
                        type: result.mimeType,
                    });
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
                                          width: 0,
                                          height: 0,
                                          mimeType: result.mimeType,
                                      },
                                  }
                                : i,
                        ),
                    );
                    return true;
                }

                if (!workerPoolRef.current) {
                    const { ConversionWorkerPool } =
                        await import('./core/workerPool');
                    workerPoolRef.current = new ConversionWorkerPool();
                }
                const pool = workerPoolRef.current;

                let fullBuffer: ArrayBuffer;
                if (item.sourceFormat === 'svg') {
                    const text = await item.file.text();
                    const cleanSvg = sanitizeSvgString(text);
                    const encoded = new TextEncoder().encode(cleanSvg);
                    fullBuffer = encoded.buffer.slice(
                        encoded.byteOffset,
                        encoded.byteOffset + encoded.byteLength,
                    ) as ArrayBuffer;
                } else {
                    fullBuffer = await item.file.arrayBuffer();
                }

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
                                prev.map((i) =>
                                    i.id === id ? { ...i, progress } : i,
                                ),
                            );
                        },
                        onSuccess: (resultPayload) => {
                            const finalBuffer = resultPayload.buffer.slice(0);
                            const finalMime = resultPayload.mimeType;

                            const mainBlob = new Blob([finalBuffer], {
                                type: finalMime,
                            });
                            const mainDownloadUrl =
                                URL.createObjectURL(mainBlob);

                            let previewDisplayUrl: string;
                            if (resultPayload.previewBuffer) {
                                const previewBlob = new Blob(
                                    [resultPayload.previewBuffer.slice(0)],
                                    {
                                        type: 'image/png',
                                    },
                                );
                                previewDisplayUrl =
                                    URL.createObjectURL(previewBlob);
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
                                                  quality:
                                                      resultPayload.quality,
                                                  qualityAdjusted:
                                                      resultPayload.qualityAdjusted,
                                                  width: resultPayload.width,
                                                  height: resultPayload.height,
                                                  mimeType: finalMime,
                                              },
                                          }
                                        : i,
                                ),
                            );
                            resolve(true);
                        },
                        onError: (errorMessage) => {
                            setQueue((prev) =>
                                prev.map((i) =>
                                    i.id === id
                                        ? {
                                              ...i,
                                              status: 'error',
                                              errorMessage,
                                          }
                                        : i,
                                ),
                            );
                            resolve(false);
                        },
                    });
                });
            } catch (err: unknown) {
                const msg =
                    err instanceof Error
                        ? err.message
                        : 'Conversion execution failed';
                setQueue((prev) =>
                    prev.map((i) =>
                        i.id === id
                            ? { ...i, status: 'error', errorMessage: msg }
                            : i,
                    ),
                );
                return false;
            }
        },
        [queue],
    );

    const handleConvertAll = useCallback(async (): Promise<void> => {
        if (isProcessing) return;
        setIsProcessing(true);
        abortProcessingRef.current = false;
        const idleIds = queue
            .filter((i) => i.status === 'idle')
            .map((i) => i.id);

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
            const baseName =
                item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
            const downloadFileName = `${baseName}.${ext}`;

            const anchor = document.createElement('a');
            anchor.href = item.result.url;
            anchor.download = downloadFileName;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
        },
        [getFormatExtension],
    );

    const handleDownloadZip = useCallback(async (): Promise<void> => {
        const completedItems = queue.filter(
            (i) => i.status === 'completed' && i.result,
        );
        if (completedItems.length === 0) return;

        const fileEntries: { fileName: string; buffer: ArrayBuffer }[] = [];

        for (const item of completedItems) {
            if (item.result) {
                const ext = getFormatExtension(item.result.format);
                const baseName =
                    item.name.substring(0, item.name.lastIndexOf('.')) ||
                    item.name;
                const ab = await item.result.blob.arrayBuffer();
                fileEntries.push({
                    fileName: `${baseName}.${ext}`,
                    buffer: ab,
                });
            }
        }

        const { createZipArchive } = await import('./core/zipArchiver');
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
        const completedItems = queue.filter(
            (i) =>
                i.status === 'completed' &&
                i.result &&
                (i.category === 'image' ||
                    i.result.mimeType.startsWith('image/') ||
                    i.result.mimeType === 'application/pdf'),
        );
        if (completedItems.length === 0) return;

        const pdfInputs = await Promise.all(
            completedItems.map(async (item) => {
                const ab = item.result
                    ? await item.result.blob.arrayBuffer()
                    : new ArrayBuffer(0);
                return {
                    buffer: ab,
                    mimeType: item.result?.mimeType ?? 'image/png',
                    name: item.name,
                    width: item.result?.width ?? 800,
                    height: item.result?.height ?? 600,
                };
            }),
        );

        const { generatePdfFromImages } = await import('./core/pdfGenerator');
        const pdfBytes = await generatePdfFromImages(pdfInputs, {
            pageSize: globalOptions.pdfPageSize,
            orientation: globalOptions.pdfOrientation,
        });

        const pdfBufferCopy = pdfBytes.buffer.slice(
            pdfBytes.byteOffset,
            pdfBytes.byteOffset + pdfBytes.byteLength,
        );
        const pdfBlob = new Blob([pdfBufferCopy as ArrayBuffer], {
            type: 'application/pdf',
        });
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
        [queue],
    );

    const totalOriginalBytes = useMemo(
        () => queue.reduce((acc, curr) => acc + curr.originalSize, 0),
        [queue],
    );

    const totalConvertedBytes = useMemo(
        () => queue.reduce((acc, curr) => acc + (curr.result?.size ?? 0), 0),
        [queue],
    );

    const canConvertAll = useMemo(() => isHomogeneousQueue(queue), [queue]);

    const canMergeToPdf = useMemo(
        () =>
            queue.some(
                (i) =>
                    i.status === 'completed' &&
                    i.result &&
                    (i.category === 'image' ||
                        i.result.mimeType.startsWith('image/') ||
                        i.result.mimeType === 'application/pdf'),
            ),
        [queue],
    );

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil(queue.length / PAGE_SIZE)),
        [queue.length],
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
        <div className='flex min-h-screen flex-col bg-zinc-50 font-sans text-zinc-900 transition-colors duration-200 dark:bg-zinc-950 dark:text-zinc-100'>
            {isWindowDragOver && !isBoxDragOver && (
                <div className='pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-cyan-500/10 p-4 backdrop-blur-[2px] transition-all duration-300 sm:p-6 dark:bg-cyan-500/15'>
                    <div className='flex h-full w-full animate-pulse items-center justify-center rounded-3xl border-4 border-dashed border-cyan-500/80 dark:border-cyan-400/90'>
                        <div className='flex items-center gap-3 rounded-2xl border border-cyan-500/40 bg-white/95 px-6 py-3.5 text-sm font-bold text-cyan-600 shadow-2xl sm:text-base dark:bg-zinc-900/95 dark:text-cyan-400'>
                            <UploadCloud className='h-6 w-6 animate-bounce' />
                            <span>Drop files anywhere to upload</span>
                        </div>
                    </div>
                </div>
            )}

            <Header
                isDark={isDark}
                onToggleTheme={handleToggleTheme}
            />

            <main className='mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-3 py-3 sm:gap-8 sm:px-6 sm:py-6 lg:px-8'>
                <section
                    aria-label='Conversion Operations'
                    className='w-full space-y-4'
                >
                    <Dropzone
                        onFilesSelected={processIncomingFiles}
                        onHoverStateChange={setIsBoxDragOver}
                    />

                    {queue.length > 0 && (
                        <div className='space-y-4 pt-2 sm:space-y-6'>
                            <Suspense
                                fallback={
                                    <div
                                        className='min-h-24'
                                        aria-hidden='true'
                                    />
                                }
                            >
                                <ConversionToolbar
                                    globalOptions={globalOptions}
                                    onOptionsChange={handleGlobalOptionsChange}
                                    onConvertAll={handleConvertAll}
                                    onDownloadZip={handleDownloadZip}
                                    onMergeToPdf={handleMergeToPdf}
                                    onClearQueue={handleClearQueue}
                                    onResetAll={handleResetAll}
                                    isProcessing={isProcessing}
                                    totalCount={queue.length}
                                    completedCount={completedCount}
                                    totalOriginalBytes={totalOriginalBytes}
                                    totalConvertedBytes={totalConvertedBytes}
                                    canConvertAll={canConvertAll}
                                    canMergeToPdf={canMergeToPdf}
                                />
                            </Suspense>

                            <div className='space-y-2.5'>
                                <div className='flex items-center justify-between px-1'>
                                    <h2 className='text-xs font-semibold tracking-wide text-zinc-600 uppercase sm:text-sm dark:text-zinc-400'>
                                        {t.queue.header.title}{' '}
                                        {t('queue.header.countBadge', {
                                            count: queue.length,
                                        })}
                                    </h2>
                                    {totalPages > 1 && (
                                        <div className='flex items-center gap-2 text-xs'>
                                            <span className='font-mono text-[11px] text-zinc-600 dark:text-zinc-400'>
                                                {(currentPage - 1) * PAGE_SIZE +
                                                    1}
                                                –
                                                {Math.min(
                                                    currentPage * PAGE_SIZE,
                                                    queue.length,
                                                )}{' '}
                                                / {queue.length}
                                            </span>
                                            <div className='flex items-center gap-1'>
                                                <button
                                                    type='button'
                                                    disabled={currentPage === 1}
                                                    onClick={() =>
                                                        setCurrentPage((p) =>
                                                            Math.max(1, p - 1),
                                                        )
                                                    }
                                                    className='cursor-pointer rounded-lg border border-zinc-200 bg-white p-1 text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                                    aria-label='Previous Page'
                                                >
                                                    <ChevronLeft className='h-3.5 w-3.5' />
                                                </button>
                                                <span className='px-1.5 py-0.5 font-mono text-[11px] font-semibold text-zinc-700 dark:text-zinc-300'>
                                                    {currentPage}/{totalPages}
                                                </span>
                                                <button
                                                    type='button'
                                                    disabled={
                                                        currentPage ===
                                                        totalPages
                                                    }
                                                    onClick={() =>
                                                        setCurrentPage((p) =>
                                                            Math.min(
                                                                totalPages,
                                                                p + 1,
                                                            ),
                                                        )
                                                    }
                                                    className='cursor-pointer rounded-lg border border-zinc-200 bg-white p-1 text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                                    aria-label='Next Page'
                                                >
                                                    <ChevronRight className='h-3.5 w-3.5' />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className='grid grid-cols-1 gap-2.5 sm:gap-3'>
                                    {visibleItems.map((item) => (
                                        <div
                                            key={item.id}
                                            style={{
                                                contentVisibility: 'auto',
                                                containIntrinsicSize: '84px',
                                            }}
                                        >
                                            <Suspense
                                                fallback={
                                                    <div
                                                        className='min-h-20'
                                                        aria-hidden='true'
                                                    />
                                                }
                                            >
                                                <FileQueueItem
                                                    item={item}
                                                    onRemove={handleRemoveItem}
                                                    onConvertSingle={
                                                        convertSingleItem
                                                    }
                                                    onDownloadSingle={
                                                        handleDownloadSingle
                                                    }
                                                    onPreview={handleOpenPreview}
                                                    onTargetFormatChange={
                                                        handleItemFormatChange
                                                    }
                                                    onOptionsChange={
                                                        handleItemOptionsChange
                                                    }
                                                    onRegenerate={
                                                        handleRegenerate
                                                    }
                                                />
                                            </Suspense>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                <section className='mx-auto max-w-4xl space-y-3 border-t border-zinc-200/80 pt-4 text-center sm:space-y-4 sm:pt-6 dark:border-zinc-800/80'>
                    <div className='mx-auto inline-flex max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-1 rounded-full border border-cyan-300 bg-cyan-100 px-2.5 py-1 text-center text-xs leading-tight font-semibold text-cyan-800 shadow-xs sm:px-3.5 dark:border-cyan-800/80 dark:bg-cyan-950/60 dark:text-cyan-400'>
                        <span
                            className='feature-badge__rotator'
                            aria-hidden='true'
                        >
                            {t.features.badge
                                .split(' • ')
                                .map((phrase, index) => {
                                    const Icon =
                                        index === 0
                                            ? BadgeCheck
                                            : index === 1
                                              ? Infinity
                                              : CloudOff;
                                    return (
                                        <span
                                            key={`${index}-${phrase}`}
                                            className='feature-badge__phrase mx-auto text-center'
                                        >
                                            <Icon className='feature-badge__icon h-4 w-4 shrink-0' />
                                            {phrase}
                                        </span>
                                    );
                                })}
                        </span>
                        <span className='sr-only'>{t.features.badge}</span>
                    </div>

                    <h1 className='text-2xl leading-tight font-black tracking-tight text-zinc-900 sm:text-4xl md:text-5xl dark:text-white'>
                        {t.features.heroTitle}{' '}
                        <span className='bg-gradient-to-r from-cyan-600 via-teal-500 to-indigo-600 bg-clip-text text-transparent dark:from-cyan-400 dark:via-teal-300 dark:to-indigo-400'>
                            {t.features.heroTitleAccent}
                        </span>
                    </h1>

                    <p className='mx-auto max-w-3xl text-xs leading-relaxed text-zinc-600 sm:text-sm md:text-base dark:text-zinc-400'>
                        {t.features.heroSubtitle}
                    </p>
                </section>

                <section
                    aria-label='Key Features'
                    className='grid grid-cols-1 gap-4 text-xs text-zinc-600 sm:grid-cols-3 sm:gap-6 dark:text-zinc-400'
                >
                    <h2 className='sr-only'>Key Features</h2>
                    {t.features.cards.slice(0, 3).map((card) => (
                        <div
                            key={card.id}
                            className='flex items-start gap-3.5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs sm:p-5 dark:border-zinc-800/90 dark:bg-zinc-900/40'
                        >
                            <div className='flex-shrink-0 rounded-xl bg-cyan-50 p-2 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400'>
                                {card.id === 'privacy' ? (
                                    <ShieldCheck className='h-5 w-5 text-emerald-500' />
                                ) : card.id === 'performance' ? (
                                    <Zap className='h-5 w-5 text-cyan-500' />
                                ) : (
                                    <Layers className='h-5 w-5 text-indigo-500' />
                                )}
                            </div>
                            <div>
                                <h3 className='mb-1 text-sm font-bold text-zinc-900 dark:text-zinc-100'>
                                    {card.title}
                                </h3>
                                <p className='leading-relaxed'>
                                    {card.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </section>

                <section
                    aria-label='Format Matrix and Specifications'
                    className='space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs sm:rounded-3xl sm:p-7 dark:border-zinc-800/90 dark:bg-zinc-900/40'
                >
                    <div className='flex items-center gap-2.5'>
                        <div className='rounded-lg bg-cyan-100 p-1.5 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-400'>
                            <FileCheck className='h-4 w-4' />
                        </div>
                        <h2 className='text-base font-bold text-zinc-900 sm:text-lg dark:text-zinc-100'>
                            {t.matrix.title}
                        </h2>
                    </div>

                    <div className='grid grid-cols-1 gap-4 text-xs md:grid-cols-2'>
                        {Object.values(t.matrix.categories).map((cat) => (
                            <div
                                key={cat.id}
                                className='space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/60'
                            >
                                <h3 className='flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-200'>
                                    <span className='h-2 w-2 rounded-full bg-cyan-500' />
                                    {cat.title}
                                </h3>
                                <p className='text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400'>
                                    {cat.description}
                                </p>
                                <div className='space-y-1 pt-1 text-[11px]'>
                                    <div>
                                        <span className='font-semibold text-zinc-700 dark:text-zinc-300'>
                                            Inputs:{' '}
                                        </span>
                                        <span className='text-zinc-600 dark:text-zinc-400'>
                                            {cat.inputs.join(', ')}
                                        </span>
                                    </div>
                                    <div>
                                        <span className='font-semibold text-cyan-700 dark:text-cyan-400'>
                                            Outputs:{' '}
                                        </span>
                                        <span className='text-zinc-600 dark:text-zinc-400'>
                                            {cat.outputs.join(', ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section
                    aria-label='Frequently Asked Questions'
                    className='space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs sm:rounded-3xl sm:p-7 dark:border-zinc-800/90 dark:bg-zinc-900/40'
                >
                    <div className='flex items-center gap-2.5'>
                        <div className='rounded-lg bg-indigo-100 p-1.5 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-400'>
                            <HelpCircle className='h-4 w-4' />
                        </div>
                        <h2 className='text-base font-bold text-zinc-900 sm:text-lg dark:text-zinc-100'>
                            {t.faq.title}
                        </h2>
                    </div>

                    <div className='space-y-2.5'>
                        {t.faq.items.map((faqItem, idx) => (
                            <div
                                key={faqItem.id}
                                className='overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/50'
                            >
                                <button
                                    type='button'
                                    onClick={() => toggleFaq(idx)}
                                    className='flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-xs font-semibold text-zinc-900 sm:text-sm dark:text-zinc-100'
                                >
                                    <span>{faqItem.question}</span>
                                    <ChevronDown
                                        className={`h-4 w-4 flex-shrink-0 text-zinc-600 transition-transform duration-200 dark:text-zinc-400 ${
                                            openFaqIndex === idx
                                                ? 'rotate-180 text-cyan-500'
                                                : ''
                                        }`}
                                    />
                                </button>
                                {openFaqIndex === idx && (
                                    <div className='border-t border-zinc-200/50 px-4 pt-2 pb-3.5 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800/50 dark:text-zinc-400'>
                                        {faqItem.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                <section
                    aria-label='Terms of Service & Disclaimer'
                    className='space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs sm:rounded-3xl sm:p-7 dark:border-zinc-800/90 dark:bg-zinc-900/40'
                >
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                        <div className='flex items-center gap-2.5'>
                            <div className='rounded-lg bg-emerald-100 p-1.5 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400'>
                                <Scale className='h-4 w-4' />
                            </div>
                            <h2 className='text-base font-bold text-zinc-900 sm:text-lg dark:text-zinc-100'>
                                {t.terms.title}
                            </h2>
                        </div>
                        <div className='inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'>
                            <FileCode className='h-3 w-3 text-cyan-500' />
                            <span>{t.terms.badge}</span>
                        </div>
                    </div>

                    <p className='text-xs leading-relaxed text-zinc-500 dark:text-zinc-400'>
                        {t.terms.subtitle}
                    </p>

                    <div className='grid grid-cols-1 gap-3.5 text-xs md:grid-cols-2'>
                        {t.terms.items.map((item) => (
                            <div
                                key={item.id}
                                className='space-y-1.5 rounded-xl border border-zinc-200/80 bg-zinc-50 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-950/60'
                            >
                                <div className='flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-200'>
                                    {item.id === 'warranty' ||
                                    item.id === 'liability' ? (
                                        <AlertTriangle className='h-3.5 w-3.5 flex-shrink-0 text-amber-500' />
                                    ) : item.id === 'privacy' ? (
                                        <ShieldCheck className='h-3.5 w-3.5 flex-shrink-0 text-emerald-500' />
                                    ) : (
                                        <FileCode className='h-3.5 w-3.5 flex-shrink-0 text-cyan-500' />
                                    )}
                                    <span>{item.title}</span>
                                </div>
                                <p className='text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400'>
                                    {item.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                <footer className='pt-4 pb-6 text-center text-xs text-zinc-600 dark:text-zinc-400'>
                    <p>
                        © {new Date().getFullYear()} Universal Convertor • 100%
                        Free Client-Side File Converter & Compressor
                    </p>
                </footer>
            </main>

            {previewItem && (
                <Suspense fallback={null}>
                    <PreviewModal
                        item={previewItem}
                        onClose={handleClosePreview}
                        onDownload={handleDownloadSingle}
                    />
                </Suspense>
            )}
        </div>
    );
}
