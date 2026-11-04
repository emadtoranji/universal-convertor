import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMediaCategory,
  getCompatibleOutputFormats,
  isHomogeneousQueue,
} from '../../src/types/converter.ts';
import type { InputFormat, OutputFormat, QueueItem } from '../../src/types/converter.ts';
import { ConversionOptionsSchema } from '../../src/types/conversionOptionsSchema.ts';

describe('formatMatrix - Formats Test Suite', () => {
  it('maps all standard formats to their correct media categories', () => {
    const images: InputFormat[] = ['png', 'jpeg', 'webp', 'avif', 'svg', 'bmp', 'ico', 'gif'];
    for (const fmt of images) {
      assert.equal(getMediaCategory(fmt), 'image');
    }

    const documents: InputFormat[] = ['json', 'csv', 'tsv'];
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

    const jsonOutputs = getCompatibleOutputFormats('json');
    assert.ok(jsonOutputs.includes('json'));
    assert.ok(jsonOutputs.includes('csv'));
    assert.ok(jsonOutputs.includes('tsv'));

    const csvOutputs = getCompatibleOutputFormats('csv');
    assert.ok(csvOutputs.includes('json'));
    assert.ok(csvOutputs.includes('tsv'));

    const tsvOutputs = getCompatibleOutputFormats('tsv');
    assert.ok(tsvOutputs.includes('json'));
    assert.ok(tsvOutputs.includes('csv'));
  });

  it('safely handles unknown and unsupported file formats without throwing or returning undefined', () => {
    const unknownFormats = ['exe', 'ppt', 'bin', 'dll', 'iso', 'unknown'] as unknown as InputFormat[];
    for (const fmt of unknownFormats) {
      const cat = getMediaCategory(fmt);
      assert.equal(cat, 'document');
      const outputs = getCompatibleOutputFormats(fmt);
      assert.ok(Array.isArray(outputs));
      assert.equal(outputs.length, 0);
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
