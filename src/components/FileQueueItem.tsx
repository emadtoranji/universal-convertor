import React, { useState, ChangeEvent } from 'react';
import {
  Download,
  Trash2,
  Play,
  CheckCircle2,
  AlertCircle,
  Eye,
  ArrowRight,
  Loader2,
  RotateCcw,
  Sliders,
  Lock,
  Unlock,
  Shield,
  FileImage,
  Table,
  Sparkles,
} from 'lucide-react';
import {
  QueueItem,
  OutputFormat,
  getCompatibleOutputFormats,
  ConversionOptions,
  ResizeMode,
  PdfPageSize,
  PdfOrientation,
} from '../types/converter';
import { t } from '../utils/i18n';

interface FileQueueItemProps {
  item: QueueItem;
  onRemove: (id: string) => void;
  onConvertSingle: (id: string) => void;
  onDownloadSingle: (item: QueueItem) => void;
  onPreview: (item: QueueItem) => void;
  onTargetFormatChange: (id: string, format: OutputFormat) => void;
  onOptionsChange?: (id: string, options: ConversionOptions) => void;
  onRegenerate: (id: string) => void;
}

const FileQueueItemComponent: React.FC<FileQueueItemProps> = ({
  item,
  onRemove,
  onConvertSingle,
  onDownloadSingle,
  onPreview,
  onTargetFormatChange,
  onOptionsChange,
  onRegenerate,
}): React.ReactElement => {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleFormatChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    onTargetFormatChange(item.id, e.target.value as OutputFormat);
  };

  const updateItemOption = <K extends keyof ConversionOptions>(key: K, value: ConversionOptions[K]): void => {
    if (onOptionsChange) {
      onOptionsChange(item.id, {
        ...item.options,
        [key]: value,
      });
    }
  };

  const savings =
    item.result && item.originalSize > 0
      ? Math.round(((item.originalSize - item.result.size) / item.originalSize) * 100)
      : null;

  const compatibleFormats = getCompatibleOutputFormats(item.sourceFormat) ?? [];
  const displayThumbnail = item.result
    ? item.result.previewUrl || item.result.url
    : item.previewUrl;

  const isDocument = item.category === 'document';

  return (
    <div className="group relative rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800/80 hover:border-cyan-500/40 dark:hover:border-zinc-700/90 transition-all p-3.5 sm:p-4 shadow-sm dark:shadow-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1 w-full sm:w-auto">
          <div
            onClick={() => {
              if (item.status !== 'error' && (displayThumbnail || item.previewUrl || isDocument)) {
                onPreview(item);
              }
            }}
            className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 overflow-hidden flex-shrink-0 cursor-pointer group/thumb shadow-inner flex items-center justify-center"
            title={t.queue.actions.previewTitle}
            aria-label={t.queue.actions.previewAria}
          >
            {isDocument ? (
              <Table className="w-6 h-6 text-pink-500" />
            ) : displayThumbnail ? (
              <img
                src={displayThumbnail}
                alt={item.name}
                className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
              />
            ) : (
              <FileImage className="w-6 h-6 text-cyan-500" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
              <Eye className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
              <span className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                {item.name}
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                {item.sourceFormat}
              </span>
              {item.status === 'completed' && item.result && (
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/60">
                  → {item.result.format}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>{formatBytes(item.originalSize)}</span>
              {item.originalWidth > 0 && item.originalHeight > 0 && (
                <>
                  <span className="text-zinc-400 dark:text-zinc-600">•</span>
                  <span>
                    {item.originalWidth} × {item.originalHeight}
                  </span>
                </>
              )}

              {item.result && (
                <>
                  <ArrowRight className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                  <span className="font-semibold text-zinc-900 dark:text-zinc-200">
                    {formatBytes(item.result.size)}
                  </span>
                  {savings !== null && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        savings >= 0
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {savings >= 0 ? `-${savings}%` : `+${Math.abs(savings)}%`}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-100 dark:border-zinc-800/80">
          {item.status !== 'completed' && item.status !== 'error' && compatibleFormats.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-500 uppercase font-semibold">{t.queue.meta.to}</span>
              <select
                value={item.options.targetFormat}
                onChange={handleFormatChange}
                disabled={item.status === 'processing'}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-200 uppercase font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer disabled:opacity-50"
              >
                {compatibleFormats.map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {fmt}
                  </option>
                ))}
              </select>
            </div>
          ) : item.status === 'completed' ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onRegenerate(item.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                title={t.queue.actions.regenerateTitle}
                aria-label={t.queue.actions.regenerateAria}
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Reset</span>
              </button>
            </div>
          ) : null}

          <div className="flex items-center gap-1 sm:gap-1.5">
            {item.status === 'idle' && (
              <button
                type="button"
                onClick={() => setShowAdvanced((prev) => !prev)}
                className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                  showAdvanced
                    ? 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-400 dark:border-cyan-500/40 text-cyan-700 dark:text-cyan-400'
                    : 'bg-zinc-100 dark:bg-zinc-950 hover:bg-zinc-200 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
                title={t.queue.actions.advancedTitle}
                aria-label={t.queue.actions.advancedAria}
              >
                <Sliders className="w-4 h-4" />
              </button>
            )}

            {item.status === 'completed' && (
              <>
                <button
                  type="button"
                  onClick={() => onPreview(item)}
                  className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                  title={t.queue.actions.previewTitle}
                  aria-label={t.queue.actions.previewAria}
                >
                  <Eye className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                </button>
                <button
                  type="button"
                  onClick={() => onDownloadSingle(item)}
                  className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30 transition-colors cursor-pointer"
                  title={t.queue.actions.downloadTitle}
                  aria-label={t.queue.actions.downloadAria}
                >
                  <Download className="w-4 h-4" />
                </button>
              </>
            )}

            {item.status === 'idle' && (
              <button
                type="button"
                onClick={() => onConvertSingle(item.id)}
                className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold transition-colors cursor-pointer"
                title={t.queue.actions.convertSingleTitle}
                aria-label={t.queue.actions.convertSingleAria}
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            )}

            {item.status === 'processing' && (
              <div className="p-2 text-cyan-500 animate-spin">
                <Loader2 className="w-4 h-4" />
              </div>
            )}

            {item.status === 'error' && (
              <div className="p-2 text-rose-500" title={item.errorMessage || t.queue.messages.errorFallback}>
                <AlertCircle className="w-4 h-4" />
              </div>
            )}

            <button
              type="button"
              onClick={() => onRemove(item.id)}
              disabled={item.status === 'processing'}
              className="p-2 rounded-lg bg-zinc-100 hover:bg-rose-100 dark:bg-zinc-950/60 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-40"
              title={t.queue.actions.removeTitle}
              aria-label={t.queue.actions.removeAria}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showAdvanced && item.status === 'idle' && (
        <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs bg-zinc-50 dark:bg-zinc-950/50 p-3 rounded-xl">
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400 font-medium">
              <span>{t.queue.advanced.quality}</span>
              <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{item.options.quality}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={item.options.quality}
              onChange={(e) => updateItemOption('quality', Number(e.target.value))}
              disabled={
                item.options.targetFormat === 'png' ||
                item.options.targetFormat === 'bmp' ||
                item.options.targetFormat === 'csv' ||
                item.options.targetFormat === 'tsv' ||
                item.options.targetFormat === 'md' ||
                item.options.targetFormat === 'html' ||
                item.options.targetFormat === 'txt' ||
                item.options.targetFormat === 'xml'
              }
              className="w-full accent-cyan-500 bg-zinc-200 dark:bg-zinc-800 rounded-lg cursor-pointer h-1.5 disabled:opacity-40"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium block">{t.queue.advanced.resize}</span>
            <div className="flex gap-1.5">
              {(['original', 'percentage', 'dimensions'] as ResizeMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateItemOption('resizeMode', mode)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium capitalize transition-all cursor-pointer ${
                    item.options.resizeMode === mode
                      ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40'
                      : 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {item.options.resizeMode === 'percentage' && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="range"
                  min="10"
                  max="300"
                  value={item.options.resizePercentage}
                  onChange={(e) => updateItemOption('resizePercentage', Number(e.target.value))}
                  className="w-full accent-cyan-500 bg-zinc-200 dark:bg-zinc-800 rounded-lg cursor-pointer h-1.5"
                />
                <span className="font-mono text-xs text-cyan-600 dark:text-cyan-400 font-semibold min-w-[36px]">
                  {item.options.resizePercentage}%
                </span>
              </div>
            )}

            {item.options.resizeMode === 'dimensions' && (
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="number"
                  placeholder="W"
                  value={item.options.targetWidth ?? ''}
                  onChange={(e) => updateItemOption('targetWidth', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-16 px-1.5 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100"
                />
                <span>×</span>
                <input
                  type="number"
                  placeholder="H"
                  value={item.options.targetHeight ?? ''}
                  onChange={(e) => updateItemOption('targetHeight', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-16 px-1.5 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={() => updateItemOption('maintainAspectRatio', !item.options.maintainAspectRatio)}
                  className="p-1 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  {item.options.maintainAspectRatio ? <Lock className="w-3 h-3 text-cyan-500" /> : <Unlock className="w-3 h-3 text-zinc-400" />}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium block">{t.queue.advanced.backgroundColor}</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={item.options.backgroundColor || '#ffffff'}
                onChange={(e) => updateItemOption('backgroundColor', e.target.value)}
                className="w-7 h-7 rounded-md cursor-pointer bg-transparent border border-zinc-300 dark:border-zinc-700"
              />
              <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{item.options.backgroundColor || '#ffffff'}</span>
              <label className="flex items-center gap-1.5 ml-auto text-zinc-600 dark:text-zinc-400 cursor-pointer text-[11px]">
                <input
                  type="checkbox"
                  checked={item.options.stripExif}
                  onChange={(e) => updateItemOption('stripExif', e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-cyan-600 focus:ring-cyan-500"
                />
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>EXIF</span>
              </label>
            </div>
            <div className="pt-1">
              <label className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 cursor-pointer text-[11px]">
                <input
                  type="checkbox"
                  checked={item.options.grayscale}
                  onChange={(e) => updateItemOption('grayscale', e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-cyan-600 focus:ring-cyan-500"
                />
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Black & White</span>
              </label>
            </div>
          </div>

          {item.options.targetFormat === 'pdf' && (
            <div className="space-y-1.5 col-span-full border-t border-zinc-200/50 dark:border-zinc-800/50 pt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">{t.queue.advanced.pdfPageSize}</label>
                <select
                  value={item.options.pdfPageSize}
                  onChange={(e) => updateItemOption('pdfPageSize', e.target.value as PdfPageSize)}
                  className="w-full px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100"
                >
                  <option value="original">Original Ratio</option>
                  <option value="a4">A4 Standard</option>
                  <option value="letter">US Letter</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">{t.queue.advanced.pdfOrientation}</label>
                <select
                  value={item.options.pdfOrientation}
                  onChange={(e) => updateItemOption('pdfOrientation', e.target.value as PdfOrientation)}
                  className="w-full px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100"
                >
                  <option value="auto">Auto Detect</option>
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {item.status === 'processing' && (
        <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="flex justify-between items-center text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">
            <span>{t.queue.messages.converting}</span>
            <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">{item.progress}%</span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-950 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full transition-all duration-300 rounded-full"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        </div>
      )}

      {item.status === 'completed' && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{t.queue.messages.completed}</span>
        </div>
      )}

      {item.status === 'error' && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-500 font-medium">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{item.errorMessage || t.queue.messages.errorFallback}</span>
        </div>
      )}
    </div>
  );
};

export const FileQueueItem = React.memo(FileQueueItemComponent);
