export type AudioBitDepth = 16 | 24 | 32;
export type AudioSampleRate = 16000 | 22050 | 44100 | 48000;
export type AudioChannelMode = 'mono' | 'stereo' | 'original';

export interface AudioConversionOptions {
  bitDepth?: AudioBitDepth | '16' | '24' | '32';
  sampleRate?: AudioSampleRate | 'original';
  channelMode?: AudioChannelMode;
}

export interface AudioMetadata {
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  length: number;
}

export interface AudioConversionResult {
  buffer: ArrayBuffer;
  blob: Blob;
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  bitDepth: AudioBitDepth;
  size: number;
}

const MAX_AUDIO_BUFFER_BYTES = 250 * 1024 * 1024;

export function encodePcmWav(
  channels: Float32Array[],
  sampleRate: number,
  bitDepth: AudioBitDepth = 16
): ArrayBuffer {
  if (channels.length === 0) {
    throw new Error('No audio channels provided for WAV encoding.');
  }

  const length = channels[0].length;
  for (let i = 1; i < channels.length; i++) {
    if (channels[i].length !== length) {
      throw new Error('All audio channels must have identical sample length.');
    }
  }

  const numChannels = channels.length;
  const bytesPerSample = bitDepth === 32 ? 4 : bitDepth === 24 ? 3 : 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const bufferSize = 44 + dataSize;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  view.setUint8(0, 0x52);
  view.setUint8(1, 0x49);
  view.setUint8(2, 0x46);
  view.setUint8(3, 0x46);
  view.setUint32(4, 36 + dataSize, true);
  view.setUint8(8, 0x57);
  view.setUint8(9, 0x41);
  view.setUint8(10, 0x56);
  view.setUint8(11, 0x45);

  view.setUint8(12, 0x66);
  view.setUint8(13, 0x6d);
  view.setUint8(14, 0x74);
  view.setUint8(15, 0x20);
  view.setUint32(16, 16, true);
  view.setUint16(20, bitDepth === 32 ? 3 : 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  view.setUint8(36, 0x64);
  view.setUint8(37, 0x61);
  view.setUint8(38, 0x74);
  view.setUint8(39, 0x61);
  view.setUint32(40, dataSize, true);

  let offset = 44;
  if (bitDepth === 16) {
    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = channels[ch][i];
        const clamped = Math.max(-1, Math.min(1, sample));
        const intVal = clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767);
        view.setInt16(offset, intVal, true);
        offset += 2;
      }
    }
  } else if (bitDepth === 24) {
    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = channels[ch][i];
        const clamped = Math.max(-1, Math.min(1, sample));
        const intVal = clamped < 0 ? Math.round(clamped * 8388608) : Math.round(clamped * 8388607);
        const safeVal = Math.max(-8388608, Math.min(8388607, intVal));
        view.setUint8(offset, safeVal & 0xff);
        view.setUint8(offset + 1, (safeVal >> 8) & 0xff);
        view.setUint8(offset + 2, (safeVal >> 16) & 0xff);
        offset += 3;
      }
    }
  } else {
    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        view.setFloat32(offset, channels[ch][i], true);
        offset += 4;
      }
    }
  }

  return buffer;
}

export function parseWavMetadata(buffer: ArrayBuffer): AudioMetadata | null {
  if (buffer.byteLength < 44) {
    return null;
  }

  const view = new DataView(buffer);
  const isRiff =
    view.getUint8(0) === 0x52 &&
    view.getUint8(1) === 0x49 &&
    view.getUint8(2) === 0x46 &&
    view.getUint8(3) === 0x46;
  const isWave =
    view.getUint8(8) === 0x57 &&
    view.getUint8(9) === 0x41 &&
    view.getUint8(10) === 0x56 &&
    view.getUint8(11) === 0x45;

  if (!isRiff || !isWave) {
    return null;
  }

  let offset = 12;
  let channels = 0;
  let sampleRate = 0;
  let blockAlign = 0;
  let dataSize = 0;

  while (offset + 8 <= buffer.byteLength) {
    const chunkId =
      String.fromCharCode(view.getUint8(offset)) +
      String.fromCharCode(view.getUint8(offset + 1)) +
      String.fromCharCode(view.getUint8(offset + 2)) +
      String.fromCharCode(view.getUint8(offset + 3));
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'fmt ') {
      channels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      blockAlign = view.getUint16(offset + 20, true);
    } else if (chunkId === 'data') {
      dataSize = chunkSize;
    }

    offset += 8 + chunkSize;
  }

  if (channels === 0 || sampleRate === 0 || blockAlign === 0) {
    return null;
  }

  const length = Math.floor(dataSize / blockAlign);
  const duration = length / sampleRate;

  return {
    duration,
    sampleRate,
    numberOfChannels: channels,
    length,
  };
}

export async function decodeAudioBuffer(buffer: ArrayBuffer): Promise<AudioBuffer> {
  if (typeof window === 'undefined') {
    throw new Error('Web Audio decoding requires a browser environment with AudioContext support.');
  }

  const AudioCtxClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioCtxClass) {
    throw new Error('Web Audio API (AudioContext) is not supported in this browser.');
  }

  const audioCtx = new AudioCtxClass();
  try {
    const bufferCopy = buffer.slice(0);
    return await new Promise<AudioBuffer>((resolve, reject) => {
      audioCtx.decodeAudioData(bufferCopy, resolve, (err) => {
        reject(new Error(`Audio decoding failed: ${err ? String(err) : 'Unknown decoder error'}`));
      });
    });
  } finally {
    if (audioCtx.state !== 'closed' && typeof audioCtx.close === 'function') {
      await audioCtx.close().catch(() => {});
    }
  }
}

export async function resampleAndRemixAudio(
  sourceBuffer: AudioBuffer,
  targetSampleRate?: number,
  channelMode: AudioChannelMode = 'original'
): Promise<AudioBuffer> {
  const outputRate =
    targetSampleRate && targetSampleRate > 0 ? targetSampleRate : sourceBuffer.sampleRate;

  let outputChannels = sourceBuffer.numberOfChannels;
  if (channelMode === 'mono') {
    outputChannels = 1;
  } else if (channelMode === 'stereo') {
    outputChannels = 2;
  }

  if (outputRate === sourceBuffer.sampleRate && outputChannels === sourceBuffer.numberOfChannels) {
    return sourceBuffer;
  }

  const OfflineCtxClass =
    typeof window !== 'undefined'
      ? window.OfflineAudioContext ||
        (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext
      : undefined;

  if (!OfflineCtxClass) {
    throw new Error('OfflineAudioContext is not supported in this environment.');
  }

  const outputLength = Math.max(1, Math.ceil(sourceBuffer.duration * outputRate));
  const offlineCtx = new OfflineCtxClass(outputChannels, outputLength, outputRate);
  const sourceNode = offlineCtx.createBufferSource();
  sourceNode.buffer = sourceBuffer;
  sourceNode.connect(offlineCtx.destination);
  sourceNode.start(0);

  return await offlineCtx.startRendering();
}

export function convertAudioBufferToWav(
  audioBuffer: AudioBuffer,
  bitDepth: AudioBitDepth = 16
): ArrayBuffer {
  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    channelData.push(audioBuffer.getChannelData(ch));
  }
  return encodePcmWav(channelData, audioBuffer.sampleRate, bitDepth);
}

export async function convertAudioToWav(
  input: ArrayBuffer,
  options: AudioConversionOptions = {}
): Promise<AudioConversionResult> {
  if (input.byteLength === 0) {
    throw new Error('Audio input buffer is empty.');
  }

  if (input.byteLength > MAX_AUDIO_BUFFER_BYTES) {
    throw new Error('Audio file exceeds maximum in-browser processing limit of 250MB.');
  }

  const bitDepth: AudioBitDepth =
    options.bitDepth !== undefined ? (Number(options.bitDepth) as AudioBitDepth) : 16;
  const decoded = await decodeAudioBuffer(input);

  const targetSampleRate =
    options.sampleRate && options.sampleRate !== 'original' ? options.sampleRate : undefined;
  const channelMode = options.channelMode ?? 'original';

  const processed = await resampleAndRemixAudio(decoded, targetSampleRate, channelMode);
  const wavBuffer = convertAudioBufferToWav(processed, bitDepth);
  const blob = new Blob([wavBuffer], { type: 'audio/wav' });

  return {
    buffer: wavBuffer,
    blob,
    duration: processed.duration,
    sampleRate: processed.sampleRate,
    numberOfChannels: processed.numberOfChannels,
    bitDepth,
    size: wavBuffer.byteLength,
  };
}

export async function extractAudioMetadata(input: ArrayBuffer): Promise<AudioMetadata> {
  if (input.byteLength === 0) {
    throw new Error('Audio input buffer is empty.');
  }

  const wavMeta = parseWavMetadata(input);
  if (wavMeta) {
    return wavMeta;
  }

  const decoded = await decodeAudioBuffer(input);
  return {
    duration: decoded.duration,
    sampleRate: decoded.sampleRate,
    numberOfChannels: decoded.numberOfChannels,
    length: decoded.length,
  };
}
