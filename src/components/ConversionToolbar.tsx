import React, { useState, ChangeEvent } from 'react';
import Play from 'lucide-react/icons/play';
import FileArchive from 'lucide-react/icons/file-archive';
import FileText from 'lucide-react/icons/file-text';
import Trash2 from 'lucide-react/icons/trash';
import Sliders from 'lucide-react/icons/sliders-vertical';
import Maximize2 from 'lucide-react/icons/maximize-2';
import Palette from 'lucide-react/icons/palette';
import Shield from 'lucide-react/icons/shield';
import Lock from 'lucide-react/icons/lock';
import Unlock from 'lucide-react/icons/lock-open';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import CheckCircle2 from 'lucide-react/icons/circle-check';
import Sparkles from 'lucide-react/icons/sparkles';
import ChevronDown from 'lucide-react/icons/chevron-down';
import {
    ConversionOptions,
    OutputFormat,
    PdfPageSize,
    PdfOrientation,
    ResizeMode,
} from '../types/converter';
import { t } from '../utils/i18n';

interface ConversionToolbarProps {
    globalOptions: ConversionOptions;
    onOptionsChange: (newOptions: ConversionOptions) => void;
    onConvertAll: () => void;
    onDownloadZip: () => void;
    onMergeToPdf: () => void;
    onClearQueue: () => void;
    onResetAll?: () => void;
    isProcessing: boolean;
    totalCount: number;
    completedCount: number;
    totalOriginalBytes: number;
    totalConvertedBytes: number;
    canConvertAll?: boolean;
    canMergeToPdf?: boolean;
}

const OUTPUT_FORMAT_GROUPS: {
    group: string;
    formats: { label: string; format: OutputFormat }[];
}[] = [
    {
        group: 'Images',
        formats: [
            { label: t.toolbar.formats.webp, format: 'webp' },
            { label: t.toolbar.formats.avif, format: 'avif' },
            { label: t.toolbar.formats.png, format: 'png' },
            { label: t.toolbar.formats.jpeg, format: 'jpeg' },
            { label: t.toolbar.formats.ico, format: 'ico' },
            { label: t.toolbar.formats.bmp, format: 'bmp' },
            { label: t.toolbar.formats.tiff, format: 'tiff' },
            { label: t.toolbar.formats.pdf, format: 'pdf' },
        ],
    },
    {
        group: 'Documents & Data',
        formats: [
            { label: t.toolbar.formats.json, format: 'json' },
            { label: t.toolbar.formats.csv, format: 'csv' },
            { label: t.toolbar.formats.tsv, format: 'tsv' },
            { label: t.toolbar.formats.md, format: 'md' },
            { label: t.toolbar.formats.html, format: 'html' },
            { label: t.toolbar.formats.txt, format: 'txt' },
            { label: t.toolbar.formats.xml, format: 'xml' },
        ],
    },
];

const ConversionToolbarComponent: React.FC<ConversionToolbarProps> = ({
    globalOptions,
    onOptionsChange,
    onConvertAll,
    onDownloadZip,
    onMergeToPdf,
    onClearQueue,
    onResetAll,
    isProcessing,
    totalCount,
    completedCount,
    totalOriginalBytes,
    totalConvertedBytes,
    canConvertAll,
    canMergeToPdf = true,
}): React.ReactElement => {
    const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
    const [showMoreControls, setShowMoreControls] = useState<boolean>(false);
    const [manualShowSettings, setManualShowSettings] =
        useState<boolean>(false);

    const isAllCompleted = totalCount > 0 && completedCount === totalCount;
    const isSettingsHidden = isAllCompleted && !manualShowSettings;

    const formatSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    };

    const savingsPercentage =
        totalOriginalBytes > 0 && totalConvertedBytes > 0
            ? Math.round(
                  ((totalOriginalBytes - totalConvertedBytes) /
                      totalOriginalBytes) *
                      100,
              )
            : 0;

    const handleFormatChange = (e: ChangeEvent<HTMLSelectElement>): void => {
        onOptionsChange({
            ...globalOptions,
            targetFormat: e.target.value as OutputFormat,
        });
    };

    const handleQualityChange = (e: ChangeEvent<HTMLInputElement>): void => {
        onOptionsChange({
            ...globalOptions,
            quality: Number(e.target.value),
        });
    };

    const handleResizeModeChange = (mode: ResizeMode): void => {
        onOptionsChange({
            ...globalOptions,
            resizeMode: mode,
        });
    };

    const handlePercentageChange = (e: ChangeEvent<HTMLInputElement>): void => {
        onOptionsChange({
            ...globalOptions,
            resizePercentage: Number(e.target.value),
        });
    };

    const handleWidthChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const val = e.target.value ? Number(e.target.value) : undefined;
        onOptionsChange({
            ...globalOptions,
            targetWidth: val,
        });
    };

    const handleHeightChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const val = e.target.value ? Number(e.target.value) : undefined;
        onOptionsChange({
            ...globalOptions,
            targetHeight: val,
        });
    };

    const handleAspectRatioToggle = (): void => {
        onOptionsChange({
            ...globalOptions,
            maintainAspectRatio: !globalOptions.maintainAspectRatio,
        });
    };

    const handleBgColorChange = (e: ChangeEvent<HTMLInputElement>): void => {
        onOptionsChange({
            ...globalOptions,
            backgroundColor: e.target.value,
        });
    };

    const handleStripExifToggle = (): void => {
        onOptionsChange({
            ...globalOptions,
            stripExif: !globalOptions.stripExif,
        });
    };

    const handleGrayscaleToggle = (): void => {
        onOptionsChange({
            ...globalOptions,
            grayscale: !globalOptions.grayscale,
        });
    };

    const handlePdfPageSizeChange = (
        e: ChangeEvent<HTMLSelectElement>,
    ): void => {
        onOptionsChange({
            ...globalOptions,
            pdfPageSize: e.target.value as PdfPageSize,
        });
    };

    const handlePdfOrientationChange = (
        e: ChangeEvent<HTMLSelectElement>,
    ): void => {
        onOptionsChange({
            ...globalOptions,
            pdfOrientation: e.target.value as PdfOrientation,
        });
    };

    const handleJsonIndentChange = (
        e: ChangeEvent<HTMLSelectElement>,
    ): void => {
        onOptionsChange({
            ...globalOptions,
            jsonIndent: Number(e.target.value),
        });
    };

    const handleDelimiterChange = (e: ChangeEvent<HTMLSelectElement>): void => {
        onOptionsChange({
            ...globalOptions,
            documentDelimiter: e.target.value as ',' | '\t' | ';',
        });
    };

    const handleReset = (): void => {
        setManualShowSettings(false);
        if (onResetAll) {
            onResetAll();
        }
    };

    return (
        <div className='w-full rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg backdrop-blur-xl transition-all sm:rounded-3xl sm:p-5 dark:border-zinc-800/90 dark:bg-zinc-900/80'>
            {isSettingsHidden ? (
                <div className='flex flex-col items-stretch justify-between gap-4 py-1 sm:flex-row sm:items-center'>
                    <div className='flex items-center gap-3'>
                        <div className='rounded-2xl border border-emerald-300 bg-emerald-100 p-2.5 text-emerald-600 dark:border-emerald-800/70 dark:bg-emerald-950/80 dark:text-emerald-400'>
                            <CheckCircle2 className='h-5 w-5' />
                        </div>
                        <div>
                            <div className='flex items-center gap-2'>
                                <span className='text-sm font-bold text-zinc-900 sm:text-base dark:text-zinc-100'>
                                    All {totalCount} files converted
                                    successfully
                                </span>
                                {savingsPercentage !== 0 && (
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-bold text-nowrap ${
                                            savingsPercentage > 0
                                                ? 'border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/80 dark:text-emerald-400'
                                                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                        }`}
                                    >
                                        {savingsPercentage > 0
                                            ? `-${savingsPercentage}% saved`
                                            : `+${Math.abs(savingsPercentage)}%`}
                                    </span>
                                )}
                            </div>
                            <p className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>
                                Processed locally in browser memory with zero
                                network uploads.
                            </p>
                        </div>
                    </div>

                    <div className='flex flex-wrap items-center gap-2'>
                        <button
                            type='button'
                            onClick={handleReset}
                            className='flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-xs font-semibold text-cyan-700 shadow-xs transition-all hover:bg-cyan-100 sm:text-sm dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-400 dark:hover:bg-cyan-500/20'
                            title={t.toolbar.actions.resetConversionTitle}
                        >
                            <RotateCcw className='h-4 w-4' />
                            <span>{t.toolbar.actions.resetConversion}</span>
                        </button>

                        {completedCount > 0 && (
                            <>
                                <button
                                    type='button'
                                    onClick={onDownloadZip}
                                    className='flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-100 px-3.5 py-2.5 text-xs font-medium text-zinc-800 transition-all hover:bg-zinc-200 sm:text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
                                    title={t.toolbar.actions.downloadZipTitle}
                                    aria-label={
                                        t.toolbar.actions.downloadZipAria
                                    }
                                >
                                    <FileArchive className='h-4 w-4 text-cyan-600 dark:text-cyan-400' />
                                    <span className='hidden sm:inline'>
                                        {t.toolbar.actions.downloadZip}
                                    </span>
                                </button>

                                {canMergeToPdf && (
                                    <button
                                        type='button'
                                        onClick={onMergeToPdf}
                                        className='flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-100 px-3.5 py-2.5 text-xs font-medium text-zinc-800 transition-all hover:bg-zinc-200 sm:text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
                                        title={t.toolbar.actions.mergePdfTitle}
                                        aria-label={
                                            t.toolbar.actions.mergePdfAria
                                        }
                                    >
                                        <FileText className='h-4 w-4 text-pink-600 dark:text-pink-400' />
                                        <span className='hidden sm:inline'>
                                            {t.toolbar.actions.mergePdf}
                                        </span>
                                    </button>
                                )}
                            </>
                        )}

                        <button
                            type='button'
                            onClick={onClearQueue}
                            className='cursor-pointer rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-rose-600 transition-all hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60'
                            title={t.toolbar.actions.clearQueueTitle}
                            aria-label={t.toolbar.actions.clearQueueAria}
                        >
                            <Trash2 className='h-4 w-4' />
                        </button>
                    </div>
                </div>
            ) : (
                <div className='flex flex-col items-stretch justify-between gap-4 lg:flex-row lg:items-center'>
                    <div className='flex flex-col flex-wrap items-stretch gap-3 sm:flex-row sm:items-center'>
                        <div className='flex w-full min-w-[210px] flex-col gap-1 sm:w-auto'>
                            <div className='flex items-center justify-between text-xs'>
                                <label className='font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400'>
                                    {t.toolbar.targetFormat.label}
                                </label>
                            </div>
                            <select
                                value={globalOptions.targetFormat}
                                onChange={handleFormatChange}
                                className='w-full cursor-pointer rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-900 focus:ring-2 focus:ring-cyan-500/50 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none sm:text-sm dark:border-zinc-700/80 dark:bg-zinc-950 dark:text-zinc-100'
                            >
                                {OUTPUT_FORMAT_GROUPS.map((grp) => (
                                    <optgroup
                                        key={grp.group}
                                        label={grp.group}
                                        className='bg-white font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100'
                                    >
                                        {grp.formats.map((item) => (
                                            <option
                                                key={item.format}
                                                value={item.format}
                                                className='bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100'
                                            >
                                                {item.label}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>

                        <div className='flex w-full min-w-[170px] flex-col gap-1 sm:w-auto'>
                            <div className='flex items-center justify-between text-xs'>
                                <span className='font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400'>
                                    {t.toolbar.quality.label}
                                </span>
                                <span className='font-mono font-bold text-cyan-600 dark:text-cyan-400'>
                                    {globalOptions.quality}%
                                </span>
                            </div>
                            <div className='flex h-9 items-center gap-2'>
                                <input
                                    type='range'
                                    min='1'
                                    max='100'
                                    value={globalOptions.quality}
                                    onChange={handleQualityChange}
                                    disabled={
                                        globalOptions.targetFormat === 'png' ||
                                        globalOptions.targetFormat === 'bmp' ||
                                        globalOptions.targetFormat === 'csv' ||
                                        globalOptions.targetFormat === 'tsv' ||
                                        globalOptions.targetFormat === 'md' ||
                                        globalOptions.targetFormat === 'html' ||
                                        globalOptions.targetFormat === 'txt' ||
                                        globalOptions.targetFormat === 'xml'
                                    }
                                    className='h-2 w-full cursor-pointer rounded-lg bg-zinc-200 accent-cyan-500 disabled:opacity-40 dark:bg-zinc-800'
                                />
                            </div>
                        </div>

                        <button
                            type='button'
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className={`flex cursor-pointer items-center justify-center gap-2 self-stretch rounded-xl border px-3.5 py-2.5 text-xs font-medium transition-all sm:self-end sm:text-sm ${
                                showAdvanced
                                    ? 'border-cyan-400 bg-cyan-50 text-cyan-700 shadow-sm dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-400'
                                    : 'border-zinc-200 bg-zinc-100 text-zinc-700 hover:text-zinc-900 dark:border-zinc-700/80 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:text-zinc-100'
                            }`}
                        >
                            <Sliders className='h-4 w-4 text-cyan-500' />
                            <span>
                                {showAdvanced
                                    ? t.toolbar.advancedToggle.hide
                                    : t.toolbar.advancedToggle.show}
                            </span>
                        </button>
                    </div>

                    <div className='flex flex-wrap items-center gap-2 self-stretch sm:self-end lg:self-center'>
                        <button
                            type='button'
                            onClick={onConvertAll}
                            disabled={
                                isProcessing ||
                                totalCount === 0 ||
                                canConvertAll === false
                            }
                            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 px-5 py-2.5 text-xs font-bold text-zinc-950 shadow-md shadow-cyan-500/25 transition-all hover:from-cyan-400 hover:to-teal-400 sm:flex-initial sm:text-sm ${
                                canConvertAll === false ||
                                totalCount === 0 ||
                                isProcessing
                                    ? 'pointer-events-none cursor-not-allowed opacity-30 shadow-none hover:from-cyan-500 hover:to-teal-500'
                                    : ''
                            }`}
                            title={
                                canConvertAll === false
                                    ? 'Batch conversion disabled: Queue contains mixed file categories. Convert items individually below.'
                                    : t.toolbar.actions.convertAll
                            }
                        >
                            <Play
                                className={`h-4 w-4 fill-current ${isProcessing ? 'animate-spin' : ''}`}
                            />
                            <span>
                                {isProcessing
                                    ? t.toolbar.actions.converting
                                    : t.toolbar.actions.convertAll}
                            </span>
                        </button>

                        {completedCount > 0 && (
                            <>
                                <button
                                    type='button'
                                    onClick={onDownloadZip}
                                    className='flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-100 px-3.5 py-2.5 text-xs font-medium text-zinc-800 transition-all hover:bg-zinc-200 sm:text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
                                    title={t.toolbar.actions.downloadZipTitle}
                                    aria-label={
                                        t.toolbar.actions.downloadZipAria
                                    }
                                >
                                    <FileArchive className='h-4 w-4 text-cyan-600 dark:text-cyan-400' />
                                    <span className='hidden sm:inline'>
                                        {t.toolbar.actions.downloadZip}
                                    </span>
                                </button>

                                {canMergeToPdf && (
                                    <button
                                        type='button'
                                        onClick={onMergeToPdf}
                                        className='flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-100 px-3.5 py-2.5 text-xs font-medium text-zinc-800 transition-all hover:bg-zinc-200 sm:text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
                                        title={t.toolbar.actions.mergePdfTitle}
                                        aria-label={
                                            t.toolbar.actions.mergePdfAria
                                        }
                                    >
                                        <FileText className='h-4 w-4 text-pink-600 dark:text-pink-400' />
                                        <span className='hidden sm:inline'>
                                            {t.toolbar.actions.mergePdf}
                                        </span>
                                    </button>
                                )}
                            </>
                        )}

                        {totalCount > 0 && (
                            <button
                                type='button'
                                onClick={onClearQueue}
                                disabled={isProcessing}
                                className='cursor-pointer rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-rose-600 transition-all hover:bg-rose-100 disabled:opacity-40 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60'
                                title={t.toolbar.actions.clearQueueTitle}
                                aria-label={t.toolbar.actions.clearQueueAria}
                            >
                                <Trash2 className='h-4 w-4' />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {totalCount > 0 && (
                <div className='mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-3 text-xs text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-400'>
                    <div className='flex flex-wrap items-center gap-3'>
                        <span>
                            {t.toolbar.stats.queueLabel}{' '}
                            <strong className='font-semibold text-zinc-800 dark:text-zinc-200'>
                                {t('toolbar.stats.completedOfTotal', {
                                    completed: completedCount,
                                    total: totalCount,
                                })}
                            </strong>
                        </span>
                        <span>
                            {t.toolbar.stats.inputLabel}{' '}
                            <strong className='font-semibold text-zinc-800 dark:text-zinc-200'>
                                {formatSize(totalOriginalBytes)}
                            </strong>
                        </span>
                        {completedCount > 0 && totalConvertedBytes > 0 && (
                            <span>
                                {t.toolbar.stats.outputLabel}{' '}
                                <strong className='font-semibold text-zinc-800 dark:text-zinc-200'>
                                    {formatSize(totalConvertedBytes)}
                                </strong>
                            </span>
                        )}
                    </div>

                    {completedCount > 0 && savingsPercentage !== 0 && (
                        <div className='flex items-center gap-1.5'>
                            <span>{t.toolbar.stats.savedLabel}</span>
                            <span
                                className={`rounded-md px-2 py-0.5 font-semibold ${
                                    savingsPercentage > 0
                                        ? 'border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/80 dark:text-emerald-400'
                                        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                }`}
                            >
                                {savingsPercentage > 0
                                    ? `-${savingsPercentage}%`
                                    : `+${Math.abs(savingsPercentage)}%`}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {canConvertAll === false && totalCount > 0 && (
                <div className='mt-3 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-700 dark:text-amber-400'>
                    <span className='font-semibold'>
                        Batch convert disabled:
                    </span>
                    <span>
                        Queue contains mixed file categories. Convert files
                        individually below.
                    </span>
                </div>
            )}

            {showAdvanced && !isSettingsHidden && (
                <div className='mt-4 space-y-4 border-t border-zinc-200 pt-4 text-xs dark:border-zinc-800/80'>
                    <div>
                        <button
                            type='button'
                            onClick={() => setShowMoreControls((prev) => !prev)}
                            className='flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-cyan-700 transition-colors hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300'
                        >
                            <Sliders className='h-3.5 w-3.5' />
                            <span>More Options</span>
                            <ChevronDown
                                className={`h-3.5 w-3.5 transition-transform duration-300 ${
                                    showMoreControls ? 'rotate-180' : ''
                                }`}
                            />
                        </button>

                        <div
                            className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                showMoreControls
                                    ? 'mt-3 max-h-[1000px] pt-1 opacity-100'
                                    : 'max-h-0 opacity-0'
                            }`}
                        >
                            <div className='grid grid-cols-1 gap-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 md:grid-cols-2 lg:grid-cols-4 dark:border-zinc-800/80 dark:bg-zinc-950/40'>
                                <div className='space-y-2 rounded-xl border border-zinc-200/80 bg-white/80 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/80'>
                                    <div className='flex items-center gap-2 font-semibold text-zinc-700 dark:text-zinc-300'>
                                        <Maximize2 className='h-4 w-4 text-cyan-500' />
                                        <span>{t.toolbar.resize.title}</span>
                                    </div>
                                    <div className='flex gap-1.5'>
                                        {(
                                            [
                                                'original',
                                                'percentage',
                                                'dimensions',
                                            ] as ResizeMode[]
                                        ).map((mode) => (
                                            <button
                                                key={mode}
                                                type='button'
                                                onClick={() =>
                                                    handleResizeModeChange(mode)
                                                }
                                                className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-all ${
                                                    globalOptions.resizeMode ===
                                                    mode
                                                        ? 'border border-cyan-300 bg-cyan-100 text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-500/20 dark:text-cyan-300'
                                                        : 'border border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400'
                                                }`}
                                            >
                                                {t.toolbar.resize.modes[mode]}
                                            </button>
                                        ))}
                                    </div>

                                    {globalOptions.resizeMode ===
                                        'percentage' && (
                                        <div className='space-y-1'>
                                            <div className='flex justify-between text-zinc-500 dark:text-zinc-400'>
                                                <span>
                                                    {
                                                        t.toolbar.resize
                                                            .scaleFactor
                                                    }
                                                </span>
                                                <span className='font-mono font-semibold text-cyan-600 dark:text-cyan-400'>
                                                    {
                                                        globalOptions.resizePercentage
                                                    }
                                                    %
                                                </span>
                                            </div>
                                            <input
                                                type='range'
                                                min='10'
                                                max='300'
                                                value={
                                                    globalOptions.resizePercentage
                                                }
                                                onChange={
                                                    handlePercentageChange
                                                }
                                                className='h-1.5 w-full cursor-pointer rounded-lg bg-zinc-200 accent-cyan-500 dark:bg-zinc-800'
                                            />
                                        </div>
                                    )}

                                    {globalOptions.resizeMode ===
                                        'dimensions' && (
                                        <div className='space-y-2'>
                                            <div className='flex items-center gap-2'>
                                                <input
                                                    type='number'
                                                    placeholder={
                                                        t.toolbar.resize
                                                            .widthPlaceholder
                                                    }
                                                    value={
                                                        globalOptions.targetWidth ??
                                                        ''
                                                    }
                                                    onChange={handleWidthChange}
                                                    className='w-full rounded-lg border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-900 focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100'
                                                />
                                                <span className='text-zinc-400'>
                                                    ×
                                                </span>
                                                <input
                                                    type='number'
                                                    placeholder={
                                                        t.toolbar.resize
                                                            .heightPlaceholder
                                                    }
                                                    value={
                                                        globalOptions.targetHeight ??
                                                        ''
                                                    }
                                                    onChange={
                                                        handleHeightChange
                                                    }
                                                    className='w-full rounded-lg border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-900 focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100'
                                                />
                                                <button
                                                    type='button'
                                                    onClick={
                                                        handleAspectRatioToggle
                                                    }
                                                    className='cursor-pointer rounded-lg border border-zinc-200 bg-zinc-100 p-1.5 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400'
                                                    title={
                                                        globalOptions.maintainAspectRatio
                                                            ? t.toolbar.resize
                                                                  .lockAspectRatio
                                                            : t.toolbar.resize
                                                                  .unlockAspectRatio
                                                    }
                                                >
                                                    {globalOptions.maintainAspectRatio ? (
                                                        <Lock className='h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400' />
                                                    ) : (
                                                        <Unlock className='h-3.5 w-3.5 text-zinc-400' />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <p className='pt-1 text-[11px] leading-tight text-zinc-500 opacity-85 dark:text-zinc-400'>
                                        Resize and scale images by percentage or
                                        custom resolution.
                                    </p>
                                </div>

                                <div className='space-y-2 rounded-xl border border-zinc-200/80 bg-white/80 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/80'>
                                    <div className='flex items-center gap-2 font-semibold text-zinc-700 dark:text-zinc-300'>
                                        <Palette className='h-4 w-4 text-teal-500' />
                                        <span>
                                            {t.toolbar.backgroundColor.title}
                                        </span>
                                    </div>
                                    <div className='flex items-center gap-2.5'>
                                        <input
                                            type='color'
                                            value={
                                                globalOptions.backgroundColor ||
                                                '#ffffff'
                                            }
                                            onChange={handleBgColorChange}
                                            className='h-7 w-7 cursor-pointer rounded-lg border border-zinc-300 bg-transparent dark:border-zinc-700'
                                            aria-label={
                                                t.toolbar.backgroundColor
                                                    .ariaLabel
                                            }
                                        />
                                        <span className='font-mono text-xs text-zinc-800 dark:text-zinc-300'>
                                            {globalOptions.backgroundColor ||
                                                '#ffffff'}
                                        </span>
                                    </div>
                                    <p className='pt-1 text-[11px] leading-tight text-zinc-500 opacity-85 dark:text-zinc-400'>
                                        Fill transparent or padded background
                                        areas with chosen color.
                                    </p>
                                </div>

                                <div className='space-y-2 rounded-xl border border-zinc-200/80 bg-white/80 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/80'>
                                    <div className='flex items-center gap-2 font-semibold text-zinc-700 dark:text-zinc-300'>
                                        <Sparkles className='h-4 w-4 text-amber-500' />
                                        <span>Black & White</span>
                                    </div>
                                    <label className='flex cursor-pointer items-center gap-2 pt-0.5 text-zinc-700 dark:text-zinc-300'>
                                        <input
                                            type='checkbox'
                                            checked={globalOptions.grayscale}
                                            onChange={handleGrayscaleToggle}
                                            className='rounded border-zinc-300 bg-white text-cyan-600 focus:ring-cyan-500 dark:border-zinc-700 dark:bg-zinc-950'
                                        />
                                        <span>
                                            {t.toolbar.colorEffects.grayscale}
                                        </span>
                                    </label>
                                    <p className='pt-1 text-[11px] leading-tight text-zinc-500 opacity-85 dark:text-zinc-400'>
                                        Transform all color channels into
                                        monochrome grayscale.
                                    </p>
                                </div>

                                <div className='space-y-2 rounded-xl border border-zinc-200/80 bg-white/80 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/80'>
                                    <div className='flex items-center gap-2 font-semibold text-zinc-700 dark:text-zinc-300'>
                                        <Shield className='h-4 w-4 text-emerald-500' />
                                        <span>Metadata Privacy</span>
                                    </div>
                                    <label className='flex cursor-pointer items-center gap-2 pt-0.5 text-zinc-700 dark:text-zinc-300'>
                                        <input
                                            type='checkbox'
                                            checked={globalOptions.stripExif}
                                            onChange={handleStripExifToggle}
                                            className='rounded border-zinc-300 bg-white text-cyan-600 focus:ring-cyan-500 dark:border-zinc-700 dark:bg-zinc-950'
                                        />
                                        <span>
                                            {t.toolbar.metadata.stripExif}
                                        </span>
                                    </label>
                                    <p className='pt-1 text-[11px] leading-tight text-zinc-500 opacity-85 dark:text-zinc-400'>
                                        Safely strip camera, GPS, and private
                                        EXIF tags from files.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='grid grid-cols-1 gap-4 border-t border-zinc-200/60 pt-2 md:grid-cols-2 dark:border-zinc-800/60'>
                        <div className='space-y-2'>
                            <div className='flex items-center gap-2 font-semibold tracking-wider text-zinc-700 uppercase dark:text-zinc-300'>
                                <FileText className='h-4 w-4 text-pink-500' />
                                <span>{t.toolbar.pdfSettings.title}</span>
                            </div>
                            <div className='grid grid-cols-2 gap-2'>
                                <div>
                                    <label className='mb-1 block text-[11px] text-zinc-600 dark:text-zinc-400'>
                                        {t.toolbar.pdfSettings.pageSizeLabel}
                                    </label>
                                    <select
                                        value={globalOptions.pdfPageSize}
                                        onChange={handlePdfPageSizeChange}
                                        className='w-full rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200'
                                    >
                                        <option value='original'>
                                            {
                                                t.toolbar.pdfSettings.pageSizes
                                                    .original
                                            }
                                        </option>
                                        <option value='a4'>
                                            {t.toolbar.pdfSettings.pageSizes.a4}
                                        </option>
                                        <option value='letter'>
                                            {
                                                t.toolbar.pdfSettings.pageSizes
                                                    .letter
                                            }
                                        </option>
                                    </select>
                                </div>
                                <div>
                                    <label className='mb-1 block text-[11px] text-zinc-600 dark:text-zinc-400'>
                                        {t.toolbar.pdfSettings.orientationLabel}
                                    </label>
                                    <select
                                        value={globalOptions.pdfOrientation}
                                        onChange={handlePdfOrientationChange}
                                        className='w-full rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200'
                                    >
                                        <option value='auto'>
                                            {
                                                t.toolbar.pdfSettings
                                                    .orientations.auto
                                            }
                                        </option>
                                        <option value='portrait'>
                                            {
                                                t.toolbar.pdfSettings
                                                    .orientations.portrait
                                            }
                                        </option>
                                        <option value='landscape'>
                                            {
                                                t.toolbar.pdfSettings
                                                    .orientations.landscape
                                            }
                                        </option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className='space-y-2'>
                            <span className='block text-[11px] font-semibold tracking-wider text-zinc-700 uppercase dark:text-zinc-300'>
                                {t.toolbar.documentSettings.title}
                            </span>
                            <div className='grid grid-cols-2 gap-2'>
                                <div>
                                    <label className='mb-0.5 block text-[10px] text-zinc-600 dark:text-zinc-400'>
                                        {
                                            t.toolbar.documentSettings
                                                .jsonIndentLabel
                                        }
                                    </label>
                                    <select
                                        value={globalOptions.jsonIndent ?? 2}
                                        onChange={handleJsonIndentChange}
                                        className='w-full rounded border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200'
                                    >
                                        <option value={2}>
                                            {
                                                t.toolbar.documentSettings
                                                    .indentations.spaces2
                                            }
                                        </option>
                                        <option value={4}>
                                            {
                                                t.toolbar.documentSettings
                                                    .indentations.spaces4
                                            }
                                        </option>
                                        <option value={0}>
                                            {
                                                t.toolbar.documentSettings
                                                    .indentations.minified
                                            }
                                        </option>
                                    </select>
                                </div>
                                <div>
                                    <label className='mb-0.5 block text-[10px] text-zinc-600 dark:text-zinc-400'>
                                        {
                                            t.toolbar.documentSettings
                                                .delimiterLabel
                                        }
                                    </label>
                                    <select
                                        value={
                                            globalOptions.documentDelimiter ??
                                            ','
                                        }
                                        onChange={handleDelimiterChange}
                                        className='w-full rounded border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200'
                                    >
                                        <option value=','>
                                            {
                                                t.toolbar.documentSettings
                                                    .delimiters.comma
                                            }
                                        </option>
                                        <option value={'\t'}>
                                            {
                                                t.toolbar.documentSettings
                                                    .delimiters.tab
                                            }
                                        </option>
                                        <option value=';'>
                                            {
                                                t.toolbar.documentSettings
                                                    .delimiters.semicolon
                                            }
                                        </option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const ConversionToolbar = React.memo(ConversionToolbarComponent);
