import React, { useState, useRef, useEffect, MouseEvent, TouchEvent } from 'react';
import X from 'lucide-react/icons/x';
import Download from 'lucide-react/icons/download';
import Columns from 'lucide-react/icons/columns-2';
import SplitSquareVertical from 'lucide-react/icons/square-split-vertical';
import ArrowRight from 'lucide-react/icons/arrow-right';
import ShieldCheck from 'lucide-react/icons/shield-check';
import ChevronsLeftRight from 'lucide-react/icons/chevrons-left-right';
import Table from 'lucide-react/icons/table';
import { QueueItem } from '../types/converter';
import { t } from '../utils/i18n';

interface PreviewModalProps {
  item: QueueItem | null;
  onClose: () => void;
  onDownload: (item: QueueItem) => void;
}

const PreviewModalComponent: React.FC<PreviewModalProps> = ({
  item,
  onClose,
  onDownload,
}): React.ReactElement | null => {
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [comparisonMode, setComparisonMode] = useState<'slider' | 'side-by-side'>('slider');
  const [convertedImgError, setConvertedImgError] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!item) return null;

  const originalSrc = item.previewUrl;
  const convertedSrc =
    !convertedImgError && item.result
      ? item.result.previewUrl || item.result.url
      : item.previewUrl;

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handlePointerMove = (clientX: number): void => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const position = ((clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, position)));
  };

  const handleMouseDown = (): void => {
    isDraggingRef.current = true;
  };

  const handleMouseUp = (): void => {
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>): void => {
    if (isDraggingRef.current) {
      handlePointerMove(e.clientX);
    }
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>): void => {
    if (e.touches.length > 0) {
      handlePointerMove(e.touches[0].clientX);
    }
  };

  const savings =
    item.result && item.originalSize > 0
      ? Math.round(((item.originalSize - item.result.size) / item.originalSize) * 100)
      : null;

  const isDocument = item.category === 'document';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md"
    >
      <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
      onClick={(e) => e.stopPropagation()}
      className="relative w-full max-w-5xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]"
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/60 flex-wrap gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <h2 id="preview-title" className="font-semibold text-xs sm:text-sm md:text-base text-zinc-900 dark:text-zinc-100 truncate max-w-[180px] sm:max-w-xs md:max-w-md">
              {item.name}
            </h2>
            <span className="text-[10px] sm:text-xs uppercase font-bold px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-cyan-700 dark:text-cyan-400 border border-zinc-300 dark:border-zinc-700">
              {item.sourceFormat} → {item.options.targetFormat}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isDocument && (
              <div className="flex items-center bg-zinc-200 dark:bg-zinc-900 rounded-xl p-1 border border-zinc-300 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setComparisonMode('slider')}
                  className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    comparisonMode === 'slider'
                      ? 'bg-cyan-500 text-zinc-950 font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                  title={t.preview.modes.sliderTitle}
                  aria-label={t.preview.modes.sliderAria}
                >
                  <SplitSquareVertical className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setComparisonMode('side-by-side')}
                  className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    comparisonMode === 'side-by-side'
                      ? 'bg-cyan-500 text-zinc-950 font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                  title={t.preview.modes.sideBySideTitle}
                  aria-label={t.preview.modes.sideBySideAria}
                >
                  <Columns className="w-4 h-4" />
                </button>
              </div>
            )}

            {item.result && (
              <button
                type="button"
                onClick={() => onDownload(item)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs transition-colors cursor-pointer"
                title={t.preview.actions.downloadTitle}
                aria-label={t.preview.actions.downloadAria}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.preview.actions.download}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              aria-label={t.preview.header.closeAria}
              title={t.preview.header.closeTitle}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3 sm:p-6 flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-950/90 min-h-[300px] sm:min-h-[420px]">
          {isDocument ? (
            <div className="flex flex-col items-center justify-center gap-4 w-full max-w-lg p-6 bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center">
              <div className="p-4 rounded-2xl bg-pink-50 dark:bg-pink-950/60 text-pink-500">
                <Table className="w-12 h-12" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 mb-1">{item.name}</h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">{t.preview.media.document.title}</p>
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl max-h-60 overflow-auto w-full text-left">
                Format: {item.sourceFormat.toUpperCase()} → {item.options.targetFormat.toUpperCase()}
              </div>
            </div>
          ) : comparisonMode === 'slider' ? (
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              onTouchMove={handleTouchMove}
              className="relative w-full max-w-4xl aspect-[4/3] sm:aspect-video rounded-xl sm:rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 select-none bg-zinc-200 dark:bg-zinc-900 cursor-ew-resize shadow-inner flex items-center justify-center"
            >
              <img
                src={convertedSrc}
                alt={t.preview.overlays.convertedImageAlt}
                onError={() => setConvertedImgError(true)}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />

              <img
                src={originalSrc}
                alt={t.preview.overlays.originalImageAlt}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-none"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              />

              <div
                className="absolute top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.8)] pointer-events-none"
                style={{ left: `${sliderPosition}%` }}
              >
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-cyan-500 text-zinc-950 flex items-center justify-center shadow-lg font-bold text-xs"
                  aria-label={t.preview.overlays.sliderHandleAria}
                >
                  <ChevronsLeftRight className="w-4 h-4" />
                </div>
              </div>

              <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm text-[10px] sm:text-[11px] font-semibold text-white pointer-events-none">
                {t('preview.overlays.originalBadge', { format: item.sourceFormat.toUpperCase() })}
              </div>
              <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-cyan-900/90 backdrop-blur-sm border border-cyan-700/60 text-[10px] sm:text-[11px] font-semibold text-cyan-200 pointer-events-none">
                {t('preview.overlays.convertedBadge', { format: item.options.targetFormat.toUpperCase() })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full max-w-4xl">
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-400 mb-1.5">
                  {t('preview.overlays.originalBadge', { format: item.sourceFormat.toUpperCase() })}
                </span>
                <div className="w-full aspect-[4/3] sm:aspect-video rounded-xl sm:rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex items-center justify-center p-2 shadow-inner">
                  <img src={originalSrc} alt={t.preview.overlays.originalImageAlt} className="max-w-full max-h-full object-contain" />
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 mb-1.5">
                  {t('preview.overlays.convertedBadge', { format: item.options.targetFormat.toUpperCase() })}
                </span>
                <div className="w-full aspect-[4/3] sm:aspect-video rounded-xl sm:rounded-2xl overflow-hidden border border-cyan-300 dark:border-cyan-900/40 bg-white dark:bg-zinc-900/60 flex items-center justify-center p-2 shadow-inner">
                  <img
                    src={convertedSrc}
                    alt={t.preview.overlays.convertedImageAlt}
                    onError={() => setConvertedImgError(true)}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div>
              <span className="text-zinc-600 dark:text-zinc-400 block mb-0.5 text-[11px]">{t.preview.footer.originalFile}</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-200">
                {formatSize(item.originalSize)}{' '}
                {item.originalWidth > 0 && `(${item.originalWidth} × ${item.originalHeight})`}
              </span>
            </div>

            {item.result && (
              <>
                <ArrowRight className="w-4 h-4 text-zinc-400 dark:text-zinc-600 hidden sm:block" />
                <div>
                  <span className="text-zinc-600 dark:text-zinc-400 block mb-0.5 text-[11px]">{t.preview.footer.convertedFile}</span>
                  <span className="font-semibold text-cyan-600 dark:text-cyan-300">
                    {formatSize(item.result.size)} ({item.result.width} × {item.result.height})
                  </span>
                </div>

                {savings !== null && (
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                        savings >= 0
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {savings >= 0 ? `-${savings}%` : `+${Math.abs(savings)}%`}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span>{t.preview.footer.clientSideGuarantee}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PreviewModal = React.memo(PreviewModalComponent);
