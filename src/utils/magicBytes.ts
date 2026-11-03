import type { InputFormat, MediaCategory } from '../types/converter.ts';
import { getMediaCategory } from '../types/converter.ts';

export interface ValidationSuccess {
  isValid: true;
  format: InputFormat;
  mimeType: string;
  category: MediaCategory;
}

export interface ValidationFailure {
  isValid: false;
  error: string;
}

export type FileValidationResult = ValidationSuccess | ValidationFailure;

export interface ExtensionCheckResult {
  supported: boolean;
  format?: InputFormat;
  category?: MediaCategory;
  extension: string;
}

export interface ContentMatchResult {
  matches: boolean;
  reason?: string;
  detectedFormat?: InputFormat;
}

const MAX_FILE_SIZE_BYTES = 150 * 1024 * 1024;

const EXTENSION_MAP: Record<string, InputFormat> = {
  png: 'png',
  jpg: 'jpeg',
  jpeg: 'jpeg',
  jfif: 'jpeg',
  webp: 'webp',
  avif: 'avif',
  svg: 'svg',
  bmp: 'bmp',
  ico: 'ico',
  gif: 'gif',
  tif: 'tiff',
  tiff: 'tiff',
  psd: 'psd',
  json: 'json',
  csv: 'csv',
  tsv: 'tsv',
  md: 'md',
  markdown: 'md',
  html: 'html',
  htm: 'html',
  txt: 'txt',
  text: 'txt',
  log: 'txt',
  xml: 'xml',
};

export function isExtensionSupported(fileName: string): ExtensionCheckResult {
  const cleanName = fileName.trim().toLowerCase();
  const lastDot = cleanName.lastIndexOf('.');
  if (lastDot === -1 || lastDot === cleanName.length - 1) {
    return { supported: false, extension: '' };
  }

  const ext = cleanName.slice(lastDot + 1);
  const format = EXTENSION_MAP[ext];
  if (!format) {
    return { supported: false, extension: ext };
  }

  return {
    supported: true,
    format,
    category: getMediaCategory(format),
    extension: ext,
  };
}

export function validateMagicBytes(buffer: ArrayBuffer, fileName: string = ''): FileValidationResult {
  if (buffer.byteLength === 0) {
    return { isValid: false, error: 'File buffer is empty.' };
  }

  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    return { isValid: false, error: 'File size exceeds maximum permitted limit of 150MB.' };
  }

  const bytes = new Uint8Array(buffer.slice(0, Math.min(buffer.byteLength, 1024)));
  const lowerName = fileName.toLowerCase();

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { isValid: true, format: 'png', mimeType: 'image/png', category: 'image' };
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { isValid: true, format: 'jpeg', mimeType: 'image/jpeg', category: 'image' };
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  ) {
    const riffType = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (riffType === 'WEBP') {
      return { isValid: true, format: 'webp', mimeType: 'image/webp', category: 'image' };
    }
  }

  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return { isValid: true, format: 'gif', mimeType: 'image/gif', category: 'image' };
  }

  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return { isValid: true, format: 'bmp', mimeType: 'image/bmp', category: 'image' };
  }

  if (bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) {
    return { isValid: true, format: 'ico', mimeType: 'image/x-icon', category: 'image' };
  }

  if (
    bytes.length >= 4 &&
    ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
      (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a))
  ) {
    return { isValid: true, format: 'tiff', mimeType: 'image/tiff', category: 'image' };
  }

  if (
    bytes.length >= 4 &&
    bytes[0] === 0x38 &&
    bytes[1] === 0x42 &&
    bytes[2] === 0x50 &&
    bytes[3] === 0x53
  ) {
    return { isValid: true, format: 'psd', mimeType: 'image/vnd.adobe.photoshop', category: 'image' };
  }

  if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();
    if (brand === 'avif' || brand === 'avis') {
      return { isValid: true, format: 'avif', mimeType: 'image/avif', category: 'image' };
    }
  }

  const hasNullByte = bytes.some((b) => b === 0);

  const textSample = new TextDecoder('utf-8', { fatal: false }).decode(bytes).trim();
  const lowerText = textSample.toLowerCase();

  if (lowerText.includes('<svg') || (lowerText.includes('<?xml') && lowerName.endsWith('.svg'))) {
    return { isValid: true, format: 'svg', mimeType: 'image/svg+xml', category: 'image' };
  }

  if (lowerName.endsWith('.svg') && !hasNullByte) {
    return { isValid: true, format: 'svg', mimeType: 'image/svg+xml', category: 'image' };
  }

  if (lowerText.startsWith('<?xml') || (lowerText.includes('<') && lowerText.includes('>') && lowerName.endsWith('.xml'))) {
    return { isValid: true, format: 'xml', mimeType: 'application/xml', category: 'document' };
  }

  if (
    lowerText.includes('<!doctype html') ||
    lowerText.includes('<html') ||
    lowerName.endsWith('.html') ||
    lowerName.endsWith('.htm')
  ) {
    if (!hasNullByte) {
      return { isValid: true, format: 'html', mimeType: 'text/html', category: 'document' };
    }
  }

  if ((textSample.startsWith('{') || textSample.startsWith('[')) && (lowerName.endsWith('.json') || textSample.includes(':'))) {
    return { isValid: true, format: 'json', mimeType: 'application/json', category: 'document' };
  }

  if (lowerName.endsWith('.json') && !hasNullByte) {
    return { isValid: true, format: 'json', mimeType: 'application/json', category: 'document' };
  }

  if (lowerName.endsWith('.csv') && !hasNullByte) {
    return { isValid: true, format: 'csv', mimeType: 'text/csv', category: 'document' };
  }

  if (lowerName.endsWith('.tsv') && !hasNullByte) {
    return { isValid: true, format: 'tsv', mimeType: 'text/tab-separated-values', category: 'document' };
  }

  if ((lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) && !hasNullByte) {
    return { isValid: true, format: 'md', mimeType: 'text/markdown', category: 'document' };
  }

  if ((lowerName.endsWith('.txt') || lowerName.endsWith('.text') || lowerName.endsWith('.log')) && !hasNullByte) {
    return { isValid: true, format: 'txt', mimeType: 'text/plain', category: 'document' };
  }

  return {
    isValid: false,
    error: 'Unrecognized or unsupported binary signature (Magic Bytes mismatch).',
  };
}

export function verifyContentMatchesFormat(
  buffer: ArrayBuffer,
  expectedFormat: InputFormat,
  fileName: string = ''
): ContentMatchResult {
  if (buffer.byteLength === 0) {
    return { matches: false, reason: 'File buffer is empty.' };
  }

  if (expectedFormat === 'json') {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      JSON.parse(text);
      return { matches: true, detectedFormat: 'json' };
    } catch {
      return { matches: false, reason: 'Content does not parse as valid JSON structure.' };
    }
  }

  const detected = validateMagicBytes(buffer, fileName);
  if (!detected.isValid) {
    return { matches: false, reason: detected.error };
  }

  if (expectedFormat === 'svg') {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    if (!text.includes('<') || !text.includes('>')) {
      return { matches: false, reason: 'Content does not contain valid SVG markup tags.' };
    }
    return { matches: true, detectedFormat: 'svg' };
  }

  if (detected.format === expectedFormat) {
    return { matches: true, detectedFormat: detected.format };
  }

  return {
    matches: false,
    reason: `File content appears to be ${detected.format.toUpperCase()} instead of expected ${expectedFormat.toUpperCase()}.`,
    detectedFormat: detected.format,
  };
}

export function detectFormatFromBuffer(buffer: ArrayBuffer, fileName: string = ''): InputFormat | null {
  const result = validateMagicBytes(buffer, fileName);
  if (result.isValid) {
    return result.format;
  }
  return null;
}

export function getMimeTypeForFormat(format: InputFormat): string {
  switch (format) {
    case 'png':
      return 'image/png';
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'avif':
      return 'image/avif';
    case 'svg':
      return 'image/svg+xml';
    case 'bmp':
      return 'image/bmp';
    case 'ico':
      return 'image/x-icon';
    case 'gif':
      return 'image/gif';
    case 'tiff':
      return 'image/tiff';
    case 'psd':
      return 'image/vnd.adobe.photoshop';
    case 'json':
      return 'application/json';
    case 'csv':
      return 'text/csv';
    case 'tsv':
      return 'text/tab-separated-values';
    case 'md':
      return 'text/markdown';
    case 'html':
      return 'text/html';
    case 'txt':
      return 'text/plain';
    case 'xml':
      return 'application/xml';
  }
}
