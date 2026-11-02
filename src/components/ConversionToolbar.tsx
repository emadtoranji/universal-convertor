import React, { useState, ChangeEvent } from 'react';
import {
  Play,
  FileArchive,
  FileText,
  Trash2,
  Sliders,
  Maximize2,
  Palette,
  Shield,
  Lock,
  Unlock,
} from 'lucide-react';
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
  isProcessing: boolean;
  totalCount: number;
  completedCount: number;
  totalOriginalBytes: number;
  totalConvertedBytes: number;
  canConvertAll?: boolean;
}

const OUTPUT_FORMAT_GROUPS: { group: string; formats: { label: string; format: OutputFormat }[] }[] = [
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
      { label: t.toolbar.formats.csv, format: 'csv' },
      { label: t.toolbar.formats.tsv, format: 'tsv' },
      { label: t.toolbar.formats.json, format: 'json' },
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
  isProcessing,
  totalCount,
  completedCount,
  totalOriginalBytes,
  totalConvertedBytes,
  canConvertAll,
}): React.ReactElement => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const savingsPercentage =
    totalOriginalBytes > 0 && totalConvertedBytes > 0
      ? Math.round(((totalOriginalBytes - totalConvertedBytes) / totalOriginalBytes) * 100)
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

  const handlePdfPageSizeChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    onOptionsChange({
      ...globalOptions,
      pdfPageSize: e.target.value as PdfPageSize,
    });
  };

  const handlePdfOrientationChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    onOptionsChange({
      ...globalOptions,
      pdfOrientation: e.target.value as PdfOrientation,
    });
  };

  return (
    <div className="w-full bg-white dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-lg transition-all">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          <div className="flex flex-col gap-1 w-full sm:w-auto min-w-[190px]">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {t.toolbar.targetFormat.label}
            </label>
            <select
              value={globalOptions.targetFormat}
              onChange={handleFormatChange}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
            >
              {OUTPUT_FORMAT_GROUPS.map((grp) => (
                <optgroup key={grp.group} label={grp.group} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                  {grp.formats.map((item) => (
                    <option key={item.format} value={item.format} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-auto min-w-[160px]">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t.toolbar.quality.label}</span>
              <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{globalOptions.quality}%</span>
            </div>
            <div className="flex items-center gap-2 h-9">
              <input
                type="range"
                min="1"
                max="100"
                value={globalOptions.quality}
                onChange={handleQualityChange}
                disabled={
                  globalOptions.targetFormat === 'png' ||
                  globalOptions.targetFormat === 'bmp' ||
                  globalOptions.targetFormat === 'csv' ||
                  globalOptions.targetFormat === 'tsv'
                }
                className="w-full accent-cyan-500 bg-zinc-200 dark:bg-zinc-800 rounded-lg cursor-pointer h-2 disabled:opacity-40"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer self-stretch sm:self-end ${
              showAdvanced
                ? 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-400 dark:border-cyan-500/40 text-cyan-700 dark:text-cyan-400 shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Sliders className="w-4 h-4 text-cyan-500" />
            <span>{showAdvanced ? t.toolbar.advancedToggle.hide : t.toolbar.advancedToggle.show}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-end lg:self-center">
          <button
            type="button"
            onClick={onConvertAll}
            disabled={isProcessing || totalCount === 0 || canConvertAll === false}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-zinc-950 font-bold text-xs sm:text-sm shadow-md shadow-cyan-500/25 transition-all cursor-pointer ${
              canConvertAll === false || totalCount === 0 || isProcessing
                ? 'opacity-30 cursor-not-allowed hover:from-cyan-500 hover:to-teal-500 shadow-none pointer-events-none'
                : ''
            }`}
            title={
              canConvertAll === false
                ? 'Batch conversion disabled: Queue contains mixed file categories. Convert items individually or remove mismatched types.'
                : t.toolbar.actions.convertAll
            }
          >
            <Play className={`w-4 h-4 fill-current ${isProcessing ? 'animate-spin' : ''}`} />
            <span>{isProcessing ? t.toolbar.actions.converting : t.toolbar.actions.convertAll}</span>
          </button>

          {completedCount > 0 && (
            <>
              <button
                type="button"
                onClick={onDownloadZip}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm font-medium transition-all cursor-pointer"
                title={t.toolbar.actions.downloadZipTitle}
                aria-label={t.toolbar.actions.downloadZipAria}
              >
                <FileArchive className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span className="hidden xs:inline">{t.toolbar.actions.downloadZip}</span>
              </button>

              <button
                type="button"
                onClick={onMergeToPdf}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm font-medium transition-all cursor-pointer"
                title={t.toolbar.actions.mergePdfTitle}
                aria-label={t.toolbar.actions.mergePdfAria}
              >
                <FileText className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                <span className="hidden xs:inline">{t.toolbar.actions.mergePdf}</span>
              </button>
            </>
          )}

          {totalCount > 0 && (
            <button
              type="button"
              onClick={onClearQueue}
              disabled={isProcessing}
              className="p-2.5 rounded-xl bg-zinc-100 hover:bg-rose-100 dark:bg-zinc-900 dark:hover:bg-rose-950/40 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-300 transition-all cursor-pointer disabled:opacity-40"
              title={t.toolbar.actions.clearQueueTitle}
              aria-label={t.toolbar.actions.clearQueueAria}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {totalCount > 0 && (
        <div className="mt-3.5 pt-3 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-wrap items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              {t.toolbar.stats.queueLabel}{' '}
              <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">
                {t('toolbar.stats.completedOfTotal', { completed: completedCount, total: totalCount })}
              </strong>
            </span>
            <span>
              {t.toolbar.stats.inputLabel}{' '}
              <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">{formatSize(totalOriginalBytes)}</strong>
            </span>
            {completedCount > 0 && totalConvertedBytes > 0 && (
              <span>
                {t.toolbar.stats.outputLabel}{' '}
                <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">{formatSize(totalConvertedBytes)}</strong>
              </span>
            )}
          </div>

          {completedCount > 0 && savingsPercentage !== 0 && (
            <div className="flex items-center gap-1.5">
              <span>{t.toolbar.stats.savedLabel}</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded-md ${
                  savingsPercentage > 0
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {savingsPercentage > 0 ? `-${savingsPercentage}%` : `+${Math.abs(savingsPercentage)}%`}
              </span>
            </div>
          )}
        </div>
      )}

      {canConvertAll === false && totalCount > 0 && (
        <div className="mt-3 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
          <span className="font-semibold">Batch convert disabled:</span>
          <span>Files in queue are from mixed categories. Convert files individually below.</span>
        </div>
      )}

      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800/80 grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              <Maximize2 className="w-4 h-4 text-cyan-500" />
              <span>{t.toolbar.resize.title}</span>
            </div>
            <div className="flex gap-2">
              {(['original', 'percentage', 'dimensions'] as ResizeMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleResizeModeChange(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                    globalOptions.resizeMode === mode
                      ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40'
                      : 'bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {t.toolbar.resize.modes[mode]}
                </button>
              ))}
            </div>

            {globalOptions.resizeMode === 'percentage' && (
              <div className="space-y-1">
                <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                  <span>{t.toolbar.resize.scaleFactor}</span>
                  <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">
                    {globalOptions.resizePercentage}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="300"
                  value={globalOptions.resizePercentage}
                  onChange={handlePercentageChange}
                  className="w-full accent-cyan-500 bg-zinc-200 dark:bg-zinc-800 rounded-lg cursor-pointer h-2"
                />
              </div>
            )}

            {globalOptions.resizeMode === 'dimensions' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder={t.toolbar.resize.widthPlaceholder}
                    value={globalOptions.targetWidth ?? ''}
                    onChange={handleWidthChange}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-zinc-400">×</span>
                  <input
                    type="number"
                    placeholder={t.toolbar.resize.heightPlaceholder}
                    value={globalOptions.targetHeight ?? ''}
                    onChange={handleHeightChange}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={handleAspectRatioToggle}
                    className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer"
                    title={
                      globalOptions.maintainAspectRatio
                        ? t.toolbar.resize.lockAspectRatio
                        : t.toolbar.resize.unlockAspectRatio
                    }
                  >
                    {globalOptions.maintainAspectRatio ? (
                      <Lock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2 font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              <Palette className="w-4 h-4 text-teal-500" />
              <span>{t.toolbar.backgroundColor.title}</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={globalOptions.backgroundColor || '#ffffff'}
                onChange={handleBgColorChange}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-zinc-300 dark:border-zinc-700"
                aria-label={t.toolbar.backgroundColor.ariaLabel}
              />
              <div className="flex flex-col">
                <span className="text-zinc-800 dark:text-zinc-300 font-mono">
                  {globalOptions.backgroundColor || '#ffffff'}
                </span>
                <span className="text-[11px] text-zinc-500">{t.toolbar.backgroundColor.description}</span>
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={globalOptions.stripExif}
                  onChange={handleStripExifToggle}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-cyan-600 focus:ring-cyan-500 bg-white dark:bg-zinc-950"
                />
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t.toolbar.metadata.stripExif}</span>
              </label>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2 font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              <FileText className="w-4 h-4 text-pink-500" />
              <span>{t.toolbar.pdfSettings.title}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">{t.toolbar.pdfSettings.pageSizeLabel}</label>
                <select
                  value={globalOptions.pdfPageSize}
                  onChange={handlePdfPageSizeChange}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
                >
                  <option value="original">{t.toolbar.pdfSettings.pageSizes.original}</option>
                  <option value="a4">{t.toolbar.pdfSettings.pageSizes.a4}</option>
                  <option value="letter">{t.toolbar.pdfSettings.pageSizes.letter}</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">{t.toolbar.pdfSettings.orientationLabel}</label>
                <select
                  value={globalOptions.pdfOrientation}
                  onChange={handlePdfOrientationChange}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
                >
                  <option value="auto">{t.toolbar.pdfSettings.orientations.auto}</option>
                  <option value="portrait">{t.toolbar.pdfSettings.orientations.portrait}</option>
                  <option value="landscape">{t.toolbar.pdfSettings.orientations.landscape}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ConversionToolbar = React.memo(ConversionToolbarComponent);
