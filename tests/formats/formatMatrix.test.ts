import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMediaCategory,
  getCompatibleOutputFormats,
  ConversionOptionsSchema,
  isHomogeneousQueue,
} from '../../src/types/converter.ts';
import type { InputFormat, OutputFormat, QueueItem } from '../../src/types/converter.ts';

describe('formatMatrix - Formats Test Suite', () => {
  it('maps all standard formats to their correct media categories', () => {
    const images: InputFormat[] = ['png', 'jpeg', 'webp', 'avif', 'svg', 'bmp', 'ico', 'gif', 'tiff', 'heic'];
    for (const fmt of images) {
      assert.equal(getMediaCategory(fmt), 'image');
    }

    const audio: InputFormat[] = ['wav', 'mp3', 'ogg', 'flac', 'aac', 'm4a'];
    for (const fmt of audio) {
      assert.equal(getMediaCategory(fmt), 'audio');
    }

    const video: InputFormat[] = ['mp4', 'webm', 'mov', 'mkv', 'ogv'];
    for (const fmt of video) {
      assert.equal(getMediaCategory(fmt), 'video');
    }

    const documents: InputFormat[] = ['pdf', 'md', 'html', 'json', 'csv', 'tsv', 'txt', 'xml', 'yaml', 'yml'];
    for (const fmt of documents) {
      assert.equal(getMediaCategory(fmt), 'document');
    }
  });

  it('provides appropriate target formats for each input format', () => {
    const pngOutputs = getCompatibleOutputFormats('png');
    assert.ok(pngOutputs.includes('webp'));
    assert.ok(pngOutputs.includes('jpeg'));
    assert.ok(pngOutputs.includes('avif'));
    assert.ok(!pngOutputs.includes('png'));

    const mp3Outputs = getCompatibleOutputFormats('mp3');
    assert.ok(mp3Outputs.includes('wav'));
    assert.equal(mp3Outputs.length, 1);

    const videoOutputs = getCompatibleOutputFormats('mp4');
    assert.ok(videoOutputs.includes('wav'));
    assert.ok(videoOutputs.includes('png'));
    assert.ok(videoOutputs.includes('jpeg'));
    assert.ok(videoOutputs.includes('webp'));
    assert.equal(videoOutputs.length, 4);

    const mdOutputs = getCompatibleOutputFormats('md');
    assert.ok(mdOutputs.includes('html'));
    assert.ok(mdOutputs.includes('pdf'));
    assert.ok(mdOutputs.includes('txt'));

    const jsonOutputs = getCompatibleOutputFormats('json');
    assert.ok(jsonOutputs.includes('json'));
    assert.ok(jsonOutputs.includes('csv'));
    assert.ok(jsonOutputs.includes('tsv'));
    assert.ok(jsonOutputs.includes('yaml'));
    assert.ok(jsonOutputs.includes('xml'));

    const xmlOutputs = getCompatibleOutputFormats('xml');
    assert.ok(xmlOutputs.includes('json'));
    assert.ok(xmlOutputs.includes('xml'));

    const yamlOutputs = getCompatibleOutputFormats('yaml');
    assert.ok(yamlOutputs.includes('json'));
    assert.ok(yamlOutputs.includes('yaml'));
  });

  it('does not offer unsupported phantom outputs for audio or video', () => {
    const audioOutputs = getCompatibleOutputFormats('mp3');
    assert.equal(audioOutputs.includes('mp3' as unknown as OutputFormat), false);

    const videoOutputs = getCompatibleOutputFormats('mp4');
    assert.equal(videoOutputs.includes('gif' as unknown as OutputFormat), false);
    assert.equal(videoOutputs.includes('webm' as unknown as OutputFormat), false);
    assert.equal(videoOutputs.includes('mp3' as unknown as OutputFormat), false);
  });

  it('safely handles unknown and unsupported file formats without throwing or returning undefined', () => {
    const unknownFormats = ['exe', 'ppt', 'bin', 'dll', 'iso', 'unknown'] as unknown as InputFormat[];
    for (const fmt of unknownFormats) {
      const cat = getMediaCategory(fmt);
      assert.equal(cat, 'document');
      const outputs = getCompatibleOutputFormats(fmt);
      assert.ok(Array.isArray(outputs));
      assert.ok(outputs.length > 0);
    }
  });

  it('correctly evaluates queue homogeneity', () => {
    const dummyFile = new File([''], 'test.png', { type: 'image/png' });
    const dummyOptions = ConversionOptionsSchema.parse({ targetFormat: 'webp' });

    const emptyQueue: QueueItem[] = [];
    assert.equal(isHomogeneousQueue(emptyQueue), true);

    const singleItemQueue: QueueItem[] = [
      {
        id: '1',
        file: dummyFile,
        name: 'a.png',
        sourceFormat: 'png',
        category: 'image',
        originalSize: 100,
        originalWidth: 10,
        originalHeight: 10,
        previewUrl: '',
        status: 'idle',
        progress: 0,
        options: dummyOptions,
      },
    ];
    assert.equal(isHomogeneousQueue(singleItemQueue), true);

    const homogeneousQueue: QueueItem[] = [
      ...singleItemQueue,
      {
        id: '2',
        file: dummyFile,
        name: 'b.jpg',
        sourceFormat: 'jpeg',
        category: 'image',
        originalSize: 200,
        originalWidth: 20,
        originalHeight: 20,
        previewUrl: '',
        status: 'idle',
        progress: 0,
        options: dummyOptions,
      },
    ];
    assert.equal(isHomogeneousQueue(homogeneousQueue), true);

    const mixedQueue: QueueItem[] = [
      ...homogeneousQueue,
      {
        id: '3',
        file: dummyFile,
        name: 'doc.json',
        sourceFormat: 'json',
        category: 'document',
        originalSize: 300,
        originalWidth: 0,
        originalHeight: 0,
        previewUrl: '',
        status: 'idle',
        progress: 0,
        options: dummyOptions,
      },
    ];
    assert.equal(isHomogeneousQueue(mixedQueue), false);
  });

  it('validates ConversionOptionsSchema default options successfully', () => {
    const parsed = ConversionOptionsSchema.parse({
      targetFormat: 'webp',
    });

    assert.equal(parsed.targetFormat, 'webp');
    assert.equal(parsed.quality, 90);
    assert.equal(parsed.resizeMode, 'original');
    assert.equal(parsed.resizePercentage, 100);
    assert.equal(parsed.maintainAspectRatio, true);
    assert.equal(parsed.backgroundColor, '#ffffff');
    assert.equal(parsed.stripExif, true);
  });

  it('rejects invalid options that violate numeric bounds', () => {
    assert.throws(() => {
      ConversionOptionsSchema.parse({
        targetFormat: 'webp',
        quality: 150,
      });
    });

    assert.throws(() => {
      ConversionOptionsSchema.parse({
        targetFormat: 'webp',
        quality: 0,
      });
    });

    assert.throws(() => {
      ConversionOptionsSchema.parse({
        targetFormat: 'unknown_format',
      });
    });
  });
});
