import { z } from 'zod';

export type MediaCategory = 'image' | 'document';

export type ImageInputFormat =
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'avif'
  | 'svg'
  | 'bmp'
  | 'ico'
  | 'gif';

export type DocumentInputFormat =
  | 'json'
  | 'csv'
  | 'tsv';

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
  | 'tsv';

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

export const ConversionOptionsSchema = z.object({
  targetFormat: z.enum([
    'png',
    'jpeg',
    'webp',
    'avif',
    'ico',
    'bmp',
    'tiff',
    'pdf',
    'json',
    'csv',
    'tsv',
  ]),
  quality: z.number().min(1).max(100).default(90),
  resizeMode: z.enum(['original', 'percentage', 'dimensions']).default('original'),
  resizePercentage: z.number().min(5).max(500).default(100),
  targetWidth: z.number().int().min(1).max(16384).optional(),
  targetHeight: z.number().int().min(1).max(16384).optional(),
  maintainAspectRatio: z.boolean().default(true),
  backgroundColor: z.string().default('#ffffff'),
  stripExif: z.boolean().default(true),
  pdfPageSize: z.enum(['original', 'a4', 'letter']).default('original'),
  pdfOrientation: z.enum(['portrait', 'landscape', 'auto']).default('auto'),
  documentDelimiter: z.enum([',', '\t']).default(',').optional(),
  documentWrapLines: z.boolean().default(true).optional(),
  jsonIndent: z.number().int().min(0).max(8).default(2).optional(),
  jsonSortKeys: z.boolean().default(false).optional(),
});

export type ConversionOptions = z.infer<typeof ConversionOptionsSchema>;

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
    case 'svg':
    case 'bmp':
    case 'ico':
    case 'gif':
      return 'image';
    case 'json':
    case 'csv':
    case 'tsv':
      return 'document';
    default:
      return 'document';
  }
}

export function getCompatibleOutputFormats(sourceFormat: InputFormat): OutputFormat[] {
  const category = getMediaCategory(sourceFormat);
  switch (category) {
    case 'image': {
      const allImageOutputs: ImageOutputFormat[] = ['webp', 'png', 'jpeg', 'avif', 'ico', 'bmp', 'tiff', 'pdf'];
      return allImageOutputs.filter((fmt) => fmt !== sourceFormat);
    }
    case 'document': {
      switch (sourceFormat) {
        case 'json':
          return ['json', 'csv', 'tsv'];
        case 'csv':
          return ['json', 'tsv'];
        case 'tsv':
          return ['json', 'csv'];
        default:
          return [];
      }
    }
    default:
      return [];
  }
}

export function isHomogeneousQueue(items: QueueItem[]): boolean {
  const pending = items.filter((item) => item.status !== 'completed' && item.status !== 'error');
  if (pending.length <= 1) return true;
  const firstCategory = pending[0].category;
  return pending.every((item) => item.category === firstCategory);
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
        mimeType: string;
        width: number;
        height: number;
        size: number;
      };
    }
  | { type: 'CONVERT_ERROR'; payload: { id: string; error: string } };
