import type { ConversionOptionsSchema } from './conversionOptionsSchema';
import type { infer as Infer } from 'zod';

export type MediaCategory = 'image' | 'document';

export type ImageInputFormat =
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'avif'
  | 'heic'
  | 'svg'
  | 'bmp'
  | 'ico'
  | 'gif'
  | 'tiff'
  | 'psd';

export type DocumentInputFormat =
  | 'json'
  | 'csv'
  | 'tsv'
  | 'md'
  | 'html'
  | 'txt'
  | 'xml';

export type InputFormat = ImageInputFormat | DocumentInputFormat;

export type ImageOutputFormat =
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'avif'
  | 'ico'
  | 'bmp'
  | 'tiff'
  | 'pdf';

export type DocumentOutputFormat =
  | 'json'
  | 'csv'
  | 'tsv'
  | 'md'
  | 'html'
  | 'txt'
  | 'xml';

export type OutputFormat = ImageOutputFormat | DocumentOutputFormat;

export type TargetFormat = OutputFormat;

export type ConversionStatus =
  | 'idle'
  | 'validating'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'error'
  | 'canceled';

export type ResizeMode = 'original' | 'percentage' | 'dimensions';
export type PdfPageSize = 'original' | 'a4' | 'letter';
export type PdfOrientation = 'portrait' | 'landscape' | 'auto';

export type ConversionOptions = Infer<typeof ConversionOptionsSchema>;

export interface QueueItem {
  id: string;
  file: File;
  name: string;
  sourceFormat: InputFormat;
  category?: MediaCategory;
  duration?: number;
  originalSize: number;
  originalWidth: number;
  originalHeight: number;
  previewUrl: string;
  status: ConversionStatus;
  progress: number;
  errorMessage?: string;
  options: ConversionOptions;
  result?: {
    blob: Blob;
    url: string;
    previewUrl?: string;
    size: number;
    format: OutputFormat;
    quality?: number;
    qualityAdjusted?: boolean;
    width: number;
    height: number;
    duration?: number;
    mimeType: string;
  };
}

export function getMediaCategory(format: InputFormat): MediaCategory {
  switch (format) {
    case 'png':
    case 'jpeg':
    case 'webp':
    case 'avif':
    case 'heic':
    case 'svg':
    case 'bmp':
    case 'ico':
    case 'gif':
    case 'tiff':
    case 'psd':
      return 'image';
    case 'json':
    case 'csv':
    case 'tsv':
    case 'md':
    case 'html':
    case 'txt':
    case 'xml':
      return 'document';
    default:
      return 'document';
  }
}

export function getCompatibleOutputFormats(sourceFormat: InputFormat): OutputFormat[] {
  const category = getMediaCategory(sourceFormat);
  switch (category) {
    case 'image': {
      const allImageOutputs: ImageOutputFormat[] = [
        'webp',
        'avif',
        'png',
        'jpeg',
        'ico',
        'bmp',
        'tiff',
        'pdf',
      ];
      return allImageOutputs;
    }
    case 'document': {
      switch (sourceFormat) {
        case 'json':
          return ['json', 'csv', 'tsv', 'xml', 'md', 'txt'];
        case 'csv':
          return ['json', 'csv', 'tsv', 'xml', 'txt', 'html'];
        case 'tsv':
          return ['json', 'csv', 'tsv', 'xml', 'txt', 'html'];
        case 'md':
          return ['html', 'txt', 'json'];
        case 'html':
          return ['md', 'txt', 'html'];
        case 'txt':
          return ['md', 'json', 'html', 'txt'];
        case 'xml':
          return ['json', 'csv', 'tsv', 'txt', 'xml'];
        default:
          return [];
      }
    }
    default:
      return [];
  }
}

export function isHomogeneousQueue(items: QueueItem[]): boolean {
  if (items.length <= 1) return true;
  const firstCategory = items[0].category;
  return items.every((item) => item.category === firstCategory);
}

export interface ConvertRequestPayload {
  id: string;
  buffer: ArrayBuffer;
  sourceFormat: InputFormat;
  targetFormat: OutputFormat;
  options: ConversionOptions;
  originalWidth: number;
  originalHeight: number;
  fileName: string;
}

export type WorkerInboundMessage =
  | { type: 'CONVERT_REQUEST'; payload: ConvertRequestPayload }
  | { type: 'CANCEL_REQUEST'; payload: { id: string } };

export type WorkerOutboundMessage =
  | { type: 'CONVERT_PROGRESS'; payload: { id: string; progress: number; stage: string } }
  | {
      type: 'CONVERT_SUCCESS';
      payload: {
        id: string;
        buffer: ArrayBuffer;
        previewBuffer?: ArrayBuffer;
        targetFormat: OutputFormat;
        quality?: number;
        qualityAdjusted?: boolean;
        mimeType: string;
        width: number;
        height: number;
        size: number;
      };
    }
  | { type: 'CONVERT_ERROR'; payload: { id: string; error: string } };
