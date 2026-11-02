import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encodePcmWav, parseWavMetadata } from '../../src/core/audioConverter.ts';

describe('audioConverter - Unit Test Suite', () => {
  it('encodes and parses stereo 16-bit PCM WAV accurately', () => {
    const sampleRate = 44100;
    const durationSec = 0.5;
    const sampleCount = Math.floor(sampleRate * durationSec);

    const left = new Float32Array(sampleCount);
    const right = new Float32Array(sampleCount);

    for (let i = 0; i < sampleCount; i++) {
      const t = i / sampleRate;
      left[i] = Math.sin(2 * Math.PI * 440 * t);
      right[i] = Math.sin(2 * Math.PI * 880 * t);
    }

    const wavBuffer = encodePcmWav([left, right], sampleRate, 16);
    assert.ok(wavBuffer.byteLength > 44);

    const meta = parseWavMetadata(wavBuffer);
    assert.ok(meta !== null);
    if (meta) {
      assert.equal(meta.sampleRate, sampleRate);
      assert.equal(meta.numberOfChannels, 2);
      assert.equal(meta.length, sampleCount);
      assert.equal(Math.round(meta.duration * 10) / 10, durationSec);
    }
  });

  it('encodes and parses mono 24-bit PCM WAV accurately', () => {
    const sampleRate = 48000;
    const sampleCount = 4800;
    const mono = new Float32Array(sampleCount);

    for (let i = 0; i < sampleCount; i++) {
      mono[i] = 0.5;
    }

    const wavBuffer = encodePcmWav([mono], sampleRate, 24);
    const expectedDataBytes = sampleCount * 1 * 3;
    const expectedTotalBytes = 44 + expectedDataBytes;
    assert.equal(wavBuffer.byteLength, expectedTotalBytes);

    const meta = parseWavMetadata(wavBuffer);
    assert.ok(meta !== null);
    if (meta) {
      assert.equal(meta.sampleRate, 48000);
      assert.equal(meta.numberOfChannels, 1);
      assert.equal(meta.length, sampleCount);
    }
  });

  it('encodes 32-bit Float PCM WAV with correct byte alignment', () => {
    const sampleRate = 22050;
    const sampleCount = 1000;
    const mono = new Float32Array(sampleCount);

    const wavBuffer = encodePcmWav([mono], sampleRate, 32);
    const expectedDataBytes = sampleCount * 1 * 4;
    const expectedTotalBytes = 44 + expectedDataBytes;
    assert.equal(wavBuffer.byteLength, expectedTotalBytes);
  });

  it('throws error when no audio channels are provided', () => {
    assert.throws(
      () => {
        encodePcmWav([], 44100, 16);
      },
      {
        message: /No audio channels provided/i,
      }
    );
  });

  it('throws error when channel lengths are mismatched', () => {
    const left = new Float32Array(100);
    const right = new Float32Array(80);

    assert.throws(
      () => {
        encodePcmWav([left, right], 44100, 16);
      },
      {
        message: /identical sample length/i,
      }
    );
  });

  it('returns null when parseWavMetadata receives truncated or malformed buffer', () => {
    const truncated = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x10, 0x00]);
    const meta = parseWavMetadata(truncated.buffer);
    assert.equal(meta, null);
  });
});

