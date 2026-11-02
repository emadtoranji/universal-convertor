import { z } from 'zod';

export type MediaCategory = 'image' | 'audio' | 'video' | 'document';

export type ImageInputFormat =
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'avif'
  | 'svg'
  | 'bmp'
  | 'ico'
  | 'gif'
  | 'tiff'
  | 'heic';

export type AudioInputFormat = 'wav' | 'mp3' | 'ogg' | 'flac' | 'aac' | 'm4a';

export type VideoInputFormat = 'mp4' | 'webm' | 'mov' | 'mkv' | 'ogv';

export type DocumentInputFormat =
  | 'pdf'
  | 'md'
  | 'html'
  | 'json'
  | 'csv'
  | 'tsv'
  | 'txt'
  | 'xml'
  | 'yaml'
  | 'yml';

export type InputFormat =
  | ImageInputFormat
  | AudioInputFormat
  | VideoInputFormat
  | DocumentInputFormat;

export type ImageOutputFormat =
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'avif'
  | 'ico'
  | 'bmp'
  | 'tiff'
  | 'pdf';

export type AudioOutputFormat = 'wav';

export type VideoOutputFormat = 'wav' | 'png' | 'jpeg' | 'webp';

export type DocumentOutputFormat =
  | 'html'
  | 'md'
  | 'csv'
  | 'tsv'
  | 'json'
  | 'pdf'
  | 'txt'
  | 'xml'
  | 'yaml';

export type OutputFormat =
  | ImageOutputFormat
  | AudioOutputFormat
  | VideoOutputFormat
  | DocumentOutputFormat;

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
export type AudioBitDepth = '16' | '24' | '32';
export type AudioChannels = 'mono' | 'stereo';
export type AudioChannelMode = 'mono' | 'stereo' | 'original';
export type AudioSampleRate = 16000 | 22050 | 44100 | 48000;

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
    'wav',
    'html',
    'md',
    'json',
    'csv',
    'tsv',
    'txt',
    'xml',
    'yaml',
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
  audioBitDepth: z.enum(['16', '24', '32']).default('16').optional(),
  audioSampleRate: z.number().default(44100).optional(),
  audioChannels: z.enum(['mono', 'stereo']).default('stereo').optional(),
  videoSnapshotPoint: z.enum(['start', 'mid', 'end']).default('mid').optional(),
  videoSnapshotTime: z.number().min(0).default(0).optional(),
  videoExtractAudio: z.boolean().default(false).optional(),
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
    case 'tiff':
    case 'heic':
      return 'image';
    case 'wav':
    case 'mp3':
    case 'ogg':
    case 'flac':
    case 'aac':
    case 'm4a':
      return 'audio';
    case 'mp4':
    case 'webm':
    case 'mov':
    case 'mkv':
    case 'ogv':
      return 'video';
    case 'pdf':
    case 'md':
    case 'html':
    case 'json':
    case 'csv':
    case 'tsv':
    case 'txt':
    case 'xml':
    case 'yaml':
    case 'yml':
      return 'document';
    default:
      return 'document';
  }
}

export function getCompatibleOutputFormats(sourceFormat: InputFormat): OutputFormat[] {
  const category = getMediaCategory(sourceFormat);
  switch (category) {
    case 'image': {
      const allImageOutputs: OutputFormat[] = ['webp', 'png', 'jpeg', 'avif', 'ico', 'bmp', 'tiff', 'pdf'];
      const normalizedSource = sourceFormat === 'heic' ? 'jpeg' : sourceFormat;
      return allImageOutputs.filter((fmt) => fmt !== normalizedSource);
    }
    case 'audio':
      return ['wav'];
    case 'video':
      return ['wav', 'png', 'jpeg', 'webp'];
    case 'document': {
      switch (sourceFormat) {
        case 'md':
          return ['html', 'pdf', 'txt'];
        case 'html':
          return ['md', 'pdf', 'txt'];
        case 'json':
          return ['json', 'csv', 'tsv', 'yaml', 'xml', 'txt'];
        case 'csv':
          return ['json', 'tsv', 'yaml', 'txt'];
        case 'tsv':
          return ['json', 'csv', 'yaml', 'txt'];
        case 'xml':
          return ['xml', 'json', 'yaml', 'txt'];
        case 'yaml':
        case 'yml':
          return ['yaml', 'json', 'xml', 'txt'];
        case 'txt':
          return ['pdf', 'md', 'html'];
        case 'pdf':
          return ['txt', 'html', 'md', 'json', 'pdf', 'png'];
        default:
          return ['txt', 'pdf'];
      }
    }
    default:
      return ['txt', 'pdf'];
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
