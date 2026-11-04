import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyGrayscale,
  calculateTargetDimensions,
  encodeBmp,
  encodeTiff,
} from '../../src/core/converters/imageConverter.ts';
import type { ConversionOptions } from '../../src/types/converter.ts';

describe('imageConverter - Unit Test Suite', () => {
  const baseOptions: ConversionOptions = {
    targetFormat: 'webp',
    quality: 90,
    resizeMode: 'original',
    resizePercentage: 100,
    maintainAspectRatio: true,
    backgroundColor: '#ffffff',
    stripExif: true,
    grayscale: false,
    pdfPageSize: 'original',
    pdfOrientation: 'auto',
  };

  it('calculates target dimensions accurately for original, percentage, and dimensions mode', () => {
    const orig = calculateTargetDimensions(800, 600, baseOptions);
    assert.equal(orig.width, 800);
    assert.equal(orig.height, 600);

    const half = calculateTargetDimensions(800, 600, {
      ...baseOptions,
      resizeMode: 'percentage',
      resizePercentage: 50,
    });
    assert.equal(half.width, 400);
    assert.equal(half.height, 300);

    const customAspect = calculateTargetDimensions(1000, 500, {
      ...baseOptions,
      resizeMode: 'dimensions',
      targetWidth: 500,
      targetHeight: 500,
      maintainAspectRatio: true,
    });
    assert.equal(customAspect.width, 500);
    assert.equal(customAspect.height, 250);

    const customFree = calculateTargetDimensions(1000, 500, {
      ...baseOptions,
      resizeMode: 'dimensions',
      targetWidth: 400,
      targetHeight: 400,
      maintainAspectRatio: false,
    });
    assert.equal(customFree.width, 400);
    assert.equal(customFree.height, 400);
  });

  it('clamps dimensions within safe boundary limits (1 to 16384)', () => {
    const minClamped = calculateTargetDimensions(10, 10, {
      ...baseOptions,
      resizeMode: 'percentage',
      resizePercentage: 5,
    });
    assert.ok(minClamped.width >= 1);
    assert.ok(minClamped.height >= 1);

    const maxClamped = calculateTargetDimensions(10000, 10000, {
      ...baseOptions,
      resizeMode: 'dimensions',
      targetWidth: 50000,
      targetHeight: 50000,
      maintainAspectRatio: false,
    });
    assert.equal(maxClamped.width, 16384);
    assert.equal(maxClamped.height, 16384);
  });

  it('converts rendered pixels to grayscale while preserving alpha', () => {
    const imageData = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 128]),
    } as ImageData;
    const context = {
      getImageData: () => imageData,
      putImageData: () => undefined,
    } as unknown as OffscreenCanvasRenderingContext2D;

    applyGrayscale(context, imageData.width, imageData.height);

    assert.deepEqual(Array.from(imageData.data), [76, 76, 76, 255, 29, 29, 29, 128]);
  });

  it('encodes ImageData into valid 24-bit BMP binary buffer with correct magic bytes', () => {
    const width = 4;
    const height = 4;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }
    const imgData = { width, height, data };
    const bmpBuffer = encodeBmp(imgData);

    assert.ok(bmpBuffer.byteLength > 54);
    const bytes = new Uint8Array(bmpBuffer);
    assert.equal(bytes[0], 0x42);
    assert.equal(bytes[1], 0x4d);

    const view = new DataView(bmpBuffer);
    assert.equal(view.getInt32(18, true), width);
    assert.equal(view.getInt32(22, true), height);
    assert.equal(view.getUint16(28, true), 24);
  });

  it('encodes ImageData into valid TIFF binary buffer with standard header and tags', () => {
    const width = 2;
    const height = 2;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 0;
      data[i + 1] = 128;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
    const imgData = { width, height, data };
    const tiffBuffer = encodeTiff(imgData);

    assert.ok(tiffBuffer.byteLength > 8);
    const bytes = new Uint8Array(tiffBuffer);
    assert.equal(bytes[0], 0x49);
    assert.equal(bytes[1], 0x49);

    const view = new DataView(tiffBuffer);
    assert.equal(view.getUint16(2, true), 42);
  });
});
