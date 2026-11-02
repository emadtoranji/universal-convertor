import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateMagicBytes,
  isExtensionSupported,
  verifyContentMatchesFormat,
} from '../../src/utils/magicBytes.ts';

function createArrayBuffer(bytes: number[]): ArrayBuffer {
  const u8 = new Uint8Array(bytes);
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
}

function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoded = new TextEncoder().encode(str);
  return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength);
}

describe('validateMagicBytes - Unit Test Suite', () => {
  it('identifies PNG magic bytes correctly', () => {
    const pngHeader = createArrayBuffer([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const result = validateMagicBytes(pngHeader, 'sample.png');
    assert.equal(result.isValid, true);
    if (result.isValid) {
      assert.equal(result.format, 'png');
      assert.equal(result.category, 'image');
      assert.equal(result.mimeType, 'image/png');
    }
  });

  it('identifies JPEG magic bytes correctly', () => {
    const jpegHeader = createArrayBuffer([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const result = validateMagicBytes(jpegHeader, 'sample.jpg');
    assert.equal(result.isValid, true);
    if (result.isValid) {
      assert.equal(result.format, 'jpeg');
      assert.equal(result.category, 'image');
      assert.equal(result.mimeType, 'image/jpeg');
    }
  });

  it('identifies WebP magic bytes correctly', () => {
    const webpHeader = createArrayBuffer([
      0x52, 0x49, 0x46, 0x46,
      0x24, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50,
    ]);
    const result = validateMagicBytes(webpHeader, 'image.webp');
    assert.equal(result.isValid, true);
    if (result.isValid) {
      assert.equal(result.format, 'webp');
      assert.equal(result.category, 'image');
      assert.equal(result.mimeType, 'image/webp');
    }
  });

  it('identifies GIF magic bytes correctly for GIF89a and GIF87a', () => {
    const gif89a = createArrayBuffer([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00]);
    const result89 = validateMagicBytes(gif89a, 'anim.gif');
    assert.equal(result89.isValid, true);
    if (result89.isValid) {
      assert.equal(result89.format, 'gif');
    }

    const gif87a = createArrayBuffer([0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0x01, 0x00]);
    const result87 = validateMagicBytes(gif87a, 'static.gif');
    assert.equal(result87.isValid, true);
    if (result87.isValid) {
      assert.equal(result87.format, 'gif');
    }
  });

  it('identifies BMP magic bytes correctly', () => {
    const bmpHeader = createArrayBuffer([0x42, 0x4d, 0x36, 0x00, 0x00, 0x00]);
    const result = validateMagicBytes(bmpHeader, 'bitmap.bmp');
    assert.equal(result.isValid, true);
    if (result.isValid) {
      assert.equal(result.format, 'bmp');
    }
  });

  it('identifies ICO magic bytes correctly', () => {
    const icoHeader = createArrayBuffer([0x00, 0x00, 0x01, 0x00, 0x01, 0x00]);
    const result = validateMagicBytes(icoHeader, 'favicon.ico');
    assert.equal(result.isValid, true);
    if (result.isValid) {
      assert.equal(result.format, 'ico');
    }
  });

  it('identifies AVIF via ftyp brands', () => {
    const makeFtyp = (brand: string): ArrayBuffer => {
      const arr = new Uint8Array(16);
      arr[4] = 0x66;
      arr[5] = 0x74;
      arr[6] = 0x79;
      arr[7] = 0x70;
      for (let i = 0; i < 4; i++) {
        arr[8 + i] = brand.charCodeAt(i);
      }
      return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength);
    };

    const avifRes = validateMagicBytes(makeFtyp('avif'), 'photo.avif');
    assert.equal(avifRes.isValid, true);
    if (avifRes.isValid) assert.equal(avifRes.format, 'avif');
  });

  it('identifies SVG, JSON, CSV, and TSV documents', () => {
    const svgBytes = stringToArrayBuffer('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>');
    const svgResult = validateMagicBytes(svgBytes, 'icon.svg');
    assert.equal(svgResult.isValid, true);
    if (svgResult.isValid) assert.equal(svgResult.format, 'svg');

    const jsonBytes = stringToArrayBuffer('{"name": "universal-convertor"}');
    const jsonResult = validateMagicBytes(jsonBytes, 'data.json');
    assert.equal(jsonResult.isValid, true);
    if (jsonResult.isValid) assert.equal(jsonResult.format, 'json');

    const csvBytes = stringToArrayBuffer('id,name,value\n1,Alpha,100');
    const csvResult = validateMagicBytes(csvBytes, 'table.csv');
    assert.equal(csvResult.isValid, true);
    if (csvResult.isValid) assert.equal(csvResult.format, 'csv');

    const tsvBytes = stringToArrayBuffer('id\tname\tvalue\n1\tAlpha\t100');
    const tsvResult = validateMagicBytes(tsvBytes, 'table.tsv');
    assert.equal(tsvResult.isValid, true);
    if (tsvResult.isValid) assert.equal(tsvResult.format, 'tsv');
  });

  it('correctly validates supported vs unsupported extensions in Stage 1', () => {
    const validPng = isExtensionSupported('photo.PNG');
    assert.equal(validPng.supported, true);
    assert.equal(validPng.format, 'png');
    assert.equal(validPng.category, 'image');

    const validJson = isExtensionSupported('schema.json');
    assert.equal(validJson.supported, true);
    assert.equal(validJson.format, 'json');
    assert.equal(validJson.category, 'document');

    const validCsv = isExtensionSupported('table.csv');
    assert.equal(validCsv.supported, true);
    assert.equal(validCsv.format, 'csv');

    const unsupportedPpt = isExtensionSupported('presentation.ppt');
    assert.equal(unsupportedPpt.supported, false);
    assert.equal(unsupportedPpt.extension, 'ppt');

    const unsupportedExe = isExtensionSupported('malware.exe');
    assert.equal(unsupportedExe.supported, false);

    const unsupportedPdf = isExtensionSupported('input.pdf');
    assert.equal(unsupportedPdf.supported, false);

    const unsupportedMp4 = isExtensionSupported('video.mp4');
    assert.equal(unsupportedMp4.supported, false);

    const noExtension = isExtensionSupported('no_extension_file');
    assert.equal(noExtension.supported, false);
  });

  it('correctly verifies content matches extension in Stage 2', () => {
    const pngHeader = createArrayBuffer([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const validMatch = verifyContentMatchesFormat(pngHeader, 'png', 'sample.png');
    assert.equal(validMatch.matches, true);

    const fakePng = createArrayBuffer([0xde, 0xad, 0xbe, 0xef, 0x01, 0x02, 0x03, 0x04]);
    const mismatch = verifyContentMatchesFormat(fakePng, 'png', 'fake.png');
    assert.equal(mismatch.matches, false);
    assert.ok(mismatch.reason);

    const validJsonBuffer = stringToArrayBuffer('{"success": true}');
    const jsonMatch = verifyContentMatchesFormat(validJsonBuffer, 'json', 'data.json');
    assert.equal(jsonMatch.matches, true);

    const invalidJsonBuffer = stringToArrayBuffer('{not valid json}');
    const jsonMismatch = verifyContentMatchesFormat(invalidJsonBuffer, 'json', 'corrupt.json');
    assert.equal(jsonMismatch.matches, false);
  });

  it('rejects empty buffers', () => {
    const emptyBuffer = new ArrayBuffer(0);
    const result = validateMagicBytes(emptyBuffer, 'test.png');
    assert.equal(result.isValid, false);
    if (!result.isValid) {
      assert.match(result.error, /empty/i);
    }
  });

  it('rejects buffers exceeding maximum size limit', () => {
    const oversizedFakeBuffer = {
      byteLength: 200 * 1024 * 1024,
      slice: () => new ArrayBuffer(10),
    } as unknown as ArrayBuffer;

    const result = validateMagicBytes(oversizedFakeBuffer, 'massive.png');
    assert.equal(result.isValid, false);
    if (!result.isValid) {
      assert.match(result.error, /limit|exceeds/i);
    }
  });

  it('rejects unrecognized binary signatures', () => {
    const randomGarbage = createArrayBuffer([0xde, 0xad, 0xbe, 0xef, 0x01, 0x02, 0x03, 0x04]);
    const result = validateMagicBytes(randomGarbage, 'unknown.bin');
    assert.equal(result.isValid, false);
    if (!result.isValid) {
      assert.match(result.error, /unrecognized|mismatch/i);
    }
  });
});
