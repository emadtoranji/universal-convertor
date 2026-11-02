import React, { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileImage, FileAudio, FileVideo, FileText } from 'lucide-react';
import { t } from '../utils/i18n';

interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  onHoverStateChange?: (isHoveringBox: boolean) => void;
}

const DropzoneComponent: React.FC<DropzoneProps> = ({
  onFilesSelected,
  onHoverStateChange,
}): React.ReactElement => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent): void => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        onFilesSelected(pastedFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [onFilesSelected]);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    onHoverStateChange?.(true);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    onHoverStateChange?.(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    onHoverStateChange?.(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    onHoverStateChange?.(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFilesSelected(files);
      e.target.value = '';
    }
  };

  const triggerBrowse = (): void => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerBrowse}
        className={`relative group rounded-2xl sm:rounded-3xl border-2 border-dashed transition-all duration-300 p-6 sm:p-9 md:p-11 text-center cursor-pointer overflow-hidden ${
          isDragOver
            ? 'border-cyan-500 bg-cyan-500/15 shadow-2xl shadow-cyan-500/20 scale-[1.01] ring-2 ring-cyan-500/30'
            : 'border-zinc-300 dark:border-zinc-800 hover:border-cyan-500 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 shadow-sm dark:shadow-none'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent pointer-events-none" />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,audio/*,video/*,.svg,.tiff,.tif,.bmp,.ico,.heic,.heif,.mp3,.wav,.ogg,.aac,.flac,.m4a,.mp4,.webm,.mov,.ogv,.md,.markdown,.json,.csv,.tsv,.txt,.pdf,.xml,.yaml,.yml"
          onChange={handleFileInputChange}
          className="hidden"
          aria-label={t.dropzone.aria.fileInput}
        />

        <div className="relative z-10 flex flex-col items-center justify-center max-w-xl mx-auto">
          <div
            className={`w-12 h-12 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 transition-all duration-300 ${
              isDragOver
                ? 'bg-cyan-500 text-zinc-950 scale-110 shadow-md shadow-cyan-500/40 rotate-3'
                : 'bg-zinc-100 dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 group-hover:scale-105 ring-1 ring-black/5 dark:ring-white/10'
            }`}
          >
            <UploadCloud className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9" />
          </div>

          <h2 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1.5">
            {t.dropzone.title}{' '}
            <span className="text-cyan-600 dark:text-cyan-400 underline decoration-cyan-500/40 underline-offset-4">
              {t.dropzone.browse}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-4 sm:mb-5">
            {t.dropzone.subtitle}{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 font-mono text-xs">
              {t.dropzone.pasteKey}
            </kbd>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border bg-zinc-100 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
              <FileImage className="w-3.5 h-3.5 text-cyan-500" />
              Images
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border bg-zinc-100 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
              <FileAudio className="w-3.5 h-3.5 text-emerald-500" />
              Audio
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border bg-zinc-100 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
              <FileVideo className="w-3.5 h-3.5 text-indigo-500" />
              Video
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border bg-zinc-100 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
              <FileText className="w-3.5 h-3.5 text-pink-500" />
              Documents & Data
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Dropzone = React.memo(DropzoneComponent);
