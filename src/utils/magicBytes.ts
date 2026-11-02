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
  webp: 'webp',
  avif: 'avif',
  svg: 'svg',
  bmp: 'bmp',
  ico: 'ico',
  gif: 'gif',
  tiff: 'tiff',
  tif: 'tiff',
  heic: 'heic',
  heif: 'heic',
  wav: 'wav',
  wave: 'wav',
  mp3: 'mp3',
  ogg: 'ogg',
  flac: 'flac',
  aac: 'aac',
  m4a: 'm4a',
  mp4: 'mp4',
  m4v: 'mp4',
  webm: 'webm',
  mov: 'mov',
  mkv: 'mkv',
  ogv: 'ogv',
  pdf: 'pdf',
  md: 'md',
  markdown: 'md',
  html: 'html',
  htm: 'html',
  json: 'json',
  csv: 'csv',
  tsv: 'tsv',
  txt: 'txt',
  text: 'txt',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
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
    if (riffType === 'WAVE') {
      return { isValid: true, format: 'wav', mimeType: 'audio/wav', category: 'audio' };
    }
    if (riffType === 'AVI ') {
      return { isValid: true, format: 'mp4', mimeType: 'video/x-msvideo', category: 'video' };
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

  if (
    (bytes.length >= 4 && bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
    (bytes.length >= 4 && bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a)
  ) {
    return { isValid: true, format: 'tiff', mimeType: 'image/tiff', category: 'image' };
  }

  if (bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) {
    return { isValid: true, format: 'ico', mimeType: 'image/x-icon', category: 'image' };
  }

  if (bytes.length >= 4 && bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43) {
    return { isValid: true, format: 'flac', mimeType: 'audio/flac', category: 'audio' };
  }

  if (bytes.length >= 4 && bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
    if (lowerName.endsWith('.ogv')) {
      return { isValid: true, format: 'ogv', mimeType: 'video/ogg', category: 'video' };
    }
    return { isValid: true, format: 'ogg', mimeType: 'audio/ogg', category: 'audio' };
  }

  if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return { isValid: true, format: 'mp3', mimeType: 'audio/mpeg', category: 'audio' };
  }

  if (
    bytes.length >= 2 &&
    bytes[0] === 0xff &&
    (bytes[1] === 0xfb || bytes[1] === 0xf3 || bytes[1] === 0xf2 || bytes[1] === 0xfa)
  ) {
    return { isValid: true, format: 'mp3', mimeType: 'audio/mpeg', category: 'audio' };
  }

  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] === 0xf1 || bytes[1] === 0xf9)) {
    return { isValid: true, format: 'aac', mimeType: 'audio/aac', category: 'audio' };
  }

  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return { isValid: true, format: 'pdf', mimeType: 'application/pdf', category: 'document' };
  }

  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    const textSample = new TextDecoder('utf-8', { fatal: false }).decode(bytes).toLowerCase();
    if (textSample.includes('webm') || lowerName.endsWith('.webm')) {
      return { isValid: true, format: 'webm', mimeType: 'video/webm', category: 'video' };
    }
    return { isValid: true, format: 'mkv', mimeType: 'video/x-matroska', category: 'video' };
  }

  if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();
    if (brand === 'avif' || brand === 'avis') {
      return { isValid: true, format: 'avif', mimeType: 'image/avif', category: 'image' };
    }
    if (brand === 'heic' || brand === 'heix' || brand === 'mif1' || brand === 'msf1') {
      return { isValid: true, format: 'heic', mimeType: 'image/heic', category: 'image' };
    }
    if (brand === 'm4a ' || brand === 'm4b ') {
      return { isValid: true, format: 'm4a', mimeType: 'audio/mp4', category: 'audio' };
    }
    if (brand === 'qt  ') {
      return { isValid: true, format: 'mov', mimeType: 'video/quicktime', category: 'video' };
    }
    return { isValid: true, format: 'mp4', mimeType: 'video/mp4', category: 'video' };
  }

  const textSample = new TextDecoder('utf-8', { fatal: false }).decode(bytes).trim();
  const lowerText = textSample.toLowerCase();

  if (lowerText.includes('<svg') || (lowerText.includes('<?xml') && lowerName.endsWith('.svg'))) {
    return { isValid: true, format: 'svg', mimeType: 'image/svg+xml', category: 'image' };
  }

  if (lowerName.endsWith('.svg')) {
    return { isValid: true, format: 'svg', mimeType: 'image/svg+xml', category: 'image' };
  }

  if (lowerText.startsWith('<!doctype html') || lowerText.startsWith('<html') || lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
    return { isValid: true, format: 'html', mimeType: 'text/html', category: 'document' };
  }

  if (lowerText.startsWith('<?xml') || lowerName.endsWith('.xml')) {
    return { isValid: true, format: 'xml', mimeType: 'application/xml', category: 'document' };
  }

  if (lowerName.endsWith('.yaml') || lowerName.endsWith('.yml')) {
    return { isValid: true, format: 'yaml', mimeType: 'application/yaml', category: 'document' };
  }

  if ((textSample.startsWith('{') || textSample.startsWith('[')) && (lowerName.endsWith('.json') || textSample.includes(':'))) {
    return { isValid: true, format: 'json', mimeType: 'application/json', category: 'document' };
  }

  if (lowerName.endsWith('.json')) {
    return { isValid: true, format: 'json', mimeType: 'application/json', category: 'document' };
  }

  if (lowerName.endsWith('.csv')) {
    return { isValid: true, format: 'csv', mimeType: 'text/csv', category: 'document' };
  }

  if (lowerName.endsWith('.tsv')) {
    return { isValid: true, format: 'tsv', mimeType: 'text/tab-separated-values', category: 'document' };
  }

  if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) {
    return { isValid: true, format: 'md', mimeType: 'text/markdown', category: 'document' };
  }

  if (lowerName.endsWith('.txt')) {
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

  if (expectedFormat === 'xml' || expectedFormat === 'svg') {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    if (!text.includes('<') || !text.includes('>')) {
      return { matches: false, reason: 'Content does not contain valid XML/SVG markup tags.' };
    }
    return { matches: true, detectedFormat: expectedFormat };
  }

  if (detected.format === expectedFormat) {
    return { matches: true, detectedFormat: detected.format };
  }

  if (expectedFormat === 'jpeg' && (detected.format === 'jpeg' || detected.format === 'heic')) {
    return { matches: true, detectedFormat: detected.format };
  }

  if ((expectedFormat === 'mp4' || expectedFormat === 'mov') && (detected.format === 'mp4' || detected.format === 'mov')) {
    return { matches: true, detectedFormat: detected.format };
  }

  if ((expectedFormat === 'webm' || expectedFormat === 'mkv') && (detected.format === 'webm' || detected.format === 'mkv')) {
    return { matches: true, detectedFormat: detected.format };
  }

  if (expectedFormat === 'csv' || expectedFormat === 'tsv' || expectedFormat === 'txt' || expectedFormat === 'md' || expectedFormat === 'html' || expectedFormat === 'yaml' || expectedFormat === 'yml') {
    const bytes = new Uint8Array(buffer.slice(0, Math.min(buffer.byteLength, 1024)));
    let hasNull = false;
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] === 0) {
        hasNull = true;
        break;
      }
    }
    if (!hasNull) {
      return { matches: true, detectedFormat: expectedFormat };
    }
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
    case 'heic':
      return 'image/heic';
    case 'wav':
      return 'audio/wav';
    case 'mp3':
      return 'audio/mpeg';
    case 'ogg':
      return 'audio/ogg';
    case 'flac':
      return 'audio/flac';
    case 'aac':
      return 'audio/aac';
    case 'm4a':
      return 'audio/mp4';
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'mov':
      return 'video/quicktime';
    case 'mkv':
      return 'video/x-matroska';
    case 'ogv':
      return 'video/ogg';
    case 'pdf':
      return 'application/pdf';
    case 'md':
      return 'text/markdown';
    case 'html':
      return 'text/html';
    case 'json':
      return 'application/json';
    case 'csv':
      return 'text/csv';
    case 'tsv':
      return 'text/tab-separated-values';
    case 'txt':
      return 'text/plain';
    case 'xml':
      return 'application/xml';
    case 'yaml':
    case 'yml':
      return 'application/yaml';
  }
}
