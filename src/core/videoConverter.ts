import { convertAudioToWav } from './audioConverter.ts';
import type {
  AudioBitDepth,
  AudioChannelMode,
  AudioConversionResult,
  AudioSampleRate,
} from './audioConverter.ts';

export type VideoSnapshotFormat = 'png' | 'jpeg' | 'webp';

export interface VideoSnapshotOptions {
  timePoint?: number | 'start' | 'mid' | 'end';
  format?: VideoSnapshotFormat;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface VideoExtractionOptions {
  bitDepth?: AudioBitDepth;
  sampleRate?: AudioSampleRate | 'original';
  channelMode?: AudioChannelMode;
}

export interface VideoMetadata {
  duration: number;
  videoWidth: number;
  videoHeight: number;
  aspectRatio: number;
}

export interface VideoSnapshotResult {
  buffer: ArrayBuffer;
  blob: Blob;
  url: string;
  format: VideoSnapshotFormat;
  width: number;
  height: number;
  timePoint: number;
  size: number;
}

const MAX_VIDEO_BUFFER_BYTES = 500 * 1024 * 1024;

function toBlob(source: Blob | File | ArrayBuffer, defaultMime = 'video/mp4'): Blob {
  if (source instanceof Blob) {
    return source;
  }
  return new Blob([source], { type: defaultMime });
}

export async function extractVideoMetadata(
  source: Blob | File | ArrayBuffer
): Promise<VideoMetadata> {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    throw new Error('Video conversion requires a browser environment with HTML5 Video support.');
  }

  const blob = toBlob(source);
  if (blob.size === 0) {
    throw new Error('Video source is empty.');
  }

  if (blob.size > MAX_VIDEO_BUFFER_BYTES) {
    throw new Error('Video file exceeds maximum in-browser processing limit of 500MB.');
  }

  const videoUrl = URL.createObjectURL(blob);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout loading video metadata.'));
      }, 10000);

      const onLoadedMetadata = () => {
        cleanup();
        resolve();
      };

      const onError = () => {
        cleanup();
        reject(new Error('Failed to load video metadata. Format may be unsupported or corrupted.'));
      };

      const cleanup = () => {
        clearTimeout(timeout);
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('error', onError);
      };

      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('error', onError);
      video.src = videoUrl;
    });

    const duration = isFinite(video.duration) ? video.duration : 0;
    const videoWidth = video.videoWidth || 0;
    const videoHeight = video.videoHeight || 0;
    const aspectRatio = videoHeight > 0 ? videoWidth / videoHeight : 1;

    return {
      duration,
      videoWidth,
      videoHeight,
      aspectRatio,
    };
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(videoUrl);
  }
}

export async function captureVideoSnapshot(
  source: Blob | File | ArrayBuffer,
  options: VideoSnapshotOptions = {}
): Promise<VideoSnapshotResult> {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    throw new Error(
      'Video snapshot extraction requires a browser environment with HTML5 Video and Canvas support.'
    );
  }

  const blob = toBlob(source);
  if (blob.size === 0) {
    throw new Error('Video source is empty.');
  }

  if (blob.size > MAX_VIDEO_BUFFER_BYTES) {
    throw new Error('Video file exceeds maximum in-browser processing limit of 500MB.');
  }

  const videoUrl = URL.createObjectURL(blob);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout loading video stream.'));
      }, 15000);

      const onLoadedMetadata = () => {
        cleanup();
        resolve();
      };

      const onError = () => {
        cleanup();
        reject(new Error('Failed to load video for snapshot. Format may be unsupported.'));
      };

      const cleanup = () => {
        clearTimeout(timeout);
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('error', onError);
      };

      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('error', onError);
      video.src = videoUrl;
    });

    const duration = isFinite(video.duration) ? video.duration : 0;
    let targetTime = 0;
    if (options.timePoint === 'mid') {
      targetTime = duration > 0 ? duration / 2 : 0;
    } else if (options.timePoint === 'end') {
      targetTime = Math.max(0, duration - 0.2);
    } else if (typeof options.timePoint === 'number') {
      targetTime = Math.min(Math.max(0, options.timePoint), duration);
    } else {
      targetTime = Math.min(0.1, duration);
    }

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout seeking video frame.'));
      }, 10000);

      const onSeeked = () => {
        cleanup();
        resolve();
      };

      const onError = () => {
        cleanup();
        reject(new Error('Failed while seeking video frame.'));
      };

      const cleanup = () => {
        clearTimeout(timeout);
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
      };

      video.addEventListener('seeked', onSeeked);
      video.addEventListener('error', onError);
      video.currentTime = targetTime;
    });

    const naturalWidth = video.videoWidth || 640;
    const naturalHeight = video.videoHeight || 360;

    let targetWidth = naturalWidth;
    let targetHeight = naturalHeight;

    if (options.maxWidth || options.maxHeight) {
      const maxW = options.maxWidth ?? naturalWidth;
      const maxH = options.maxHeight ?? naturalHeight;
      const scale = Math.min(maxW / naturalWidth, maxH / naturalHeight, 1);
      targetWidth = Math.max(1, Math.round(naturalWidth * scale));
      targetHeight = Math.max(1, Math.round(naturalHeight * scale));
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to obtain 2D rendering context for snapshot canvas.');
    }

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

    const format: VideoSnapshotFormat = options.format ?? 'png';
    const mimeMap: Record<VideoSnapshotFormat, string> = {
      png: 'image/png',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
    };
    const mimeType = mimeMap[format];

    const qualityFactor =
      options.quality !== undefined
        ? Math.max(0.01, Math.min(1, options.quality > 1 ? options.quality / 100 : options.quality))
        : 0.92;

    const frameBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) {
            resolve(b);
          } else {
            reject(new Error('Canvas failed to export image blob.'));
          }
        },
        mimeType,
        qualityFactor
      );
    });

    const frameBuffer = await frameBlob.arrayBuffer();
    const frameUrl = URL.createObjectURL(frameBlob);

    return {
      buffer: frameBuffer,
      blob: frameBlob,
      url: frameUrl,
      format,
      width: targetWidth,
      height: targetHeight,
      timePoint: targetTime,
      size: frameBuffer.byteLength,
    };
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(videoUrl);
  }
}

export async function captureVideoKeyframes(
  source: Blob | File | ArrayBuffer,
  timePoints: (number | 'start' | 'mid' | 'end')[],
  options: Omit<VideoSnapshotOptions, 'timePoint'> = {}
): Promise<VideoSnapshotResult[]> {
  const results: VideoSnapshotResult[] = [];
  for (const timePoint of timePoints) {
    const result = await captureVideoSnapshot(source, {
      ...options,
      timePoint,
    });
    results.push(result);
  }
  return results;
}

export async function extractAudioFromVideo(
  source: Blob | File | ArrayBuffer,
  options: VideoExtractionOptions = {}
): Promise<AudioConversionResult> {
  let arrayBuffer: ArrayBuffer;
  if (source instanceof ArrayBuffer) {
    arrayBuffer = source;
  } else {
    arrayBuffer = await source.arrayBuffer();
  }

  if (arrayBuffer.byteLength === 0) {
    throw new Error('Video source buffer is empty.');
  }

  try {
    return await convertAudioToWav(arrayBuffer, options);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to extract audio from video container: ${message}`);
  }
}
