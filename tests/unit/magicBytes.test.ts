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

  it('identifies WAV audio magic bytes correctly', () => {
    const wavHeader = createArrayBuffer([
      0x52, 0x49, 0x46, 0x46,
      0x24, 0x00, 0x00, 0x00,
      0x57, 0x41, 0x56, 0x45,
    ]);
    const result = validateMagicBytes(wavHeader, 'sound.wav');
    assert.equal(result.isValid, true);
    if (result.isValid) {
      assert.equal(result.format, 'wav');
      assert.equal(result.category, 'audio');
      assert.equal(result.mimeType, 'audio/wav');
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

  it('identifies TIFF magic bytes correctly for little and big endian', () => {
    const leTiff = createArrayBuffer([0x49, 0x49, 0x2a, 0x00]);
    const resultLe = validateMagicBytes(leTiff, 'photo.tiff');
    assert.equal(resultLe.isValid, true);
    if (resultLe.isValid) {
      assert.equal(resultLe.format, 'tiff');
    }

    const beTiff = createArrayBuffer([0x4d, 0x4d, 0x00, 0x2a]);
    const resultBe = validateMagicBytes(beTiff, 'photo.tif');
    assert.equal(resultBe.isValid, true);
    if (resultBe.isValid) {
      assert.equal(resultBe.format, 'tiff');
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

  it('identifies FLAC audio magic bytes correctly', () => {
    const flacHeader = createArrayBuffer([0x66, 0x4c, 0x61, 0x43, 0x00, 0x00]);
    const result = validateMagicBytes(flacHeader, 'music.flac');
    assert.equal(result.isValid, true);
    if (result.isValid) {
      assert.equal(result.format, 'flac');
      assert.equal(result.category, 'audio');
    }
  });

  it('identifies OGG container for audio and video correctly', () => {
    const oggHeader = createArrayBuffer([0x4f, 0x67, 0x67, 0x53, 0x00, 0x02]);
    const resultAudio = validateMagicBytes(oggHeader, 'audio.ogg');
    assert.equal(resultAudio.isValid, true);
    if (resultAudio.isValid) {
      assert.equal(resultAudio.format, 'ogg');
      assert.equal(resultAudio.category, 'audio');
    }

    const resultVideo = validateMagicBytes(oggHeader, 'clip.ogv');
    assert.equal(resultVideo.isValid, true);
    if (resultVideo.isValid) {
      assert.equal(resultVideo.format, 'ogv');
      assert.equal(resultVideo.category, 'video');
    }
  });

  it('identifies MP3 audio magic bytes via ID3 tag and frame sync', () => {
    const id3Header = createArrayBuffer([0x49, 0x44, 0x33, 0x04, 0x00, 0x00]);
    const resultId3 = validateMagicBytes(id3Header, 'track.mp3');
    assert.equal(resultId3.isValid, true);
    if (resultId3.isValid) {
      assert.equal(resultId3.format, 'mp3');
      assert.equal(resultId3.category, 'audio');
    }

    const frameSync = createArrayBuffer([0xff, 0xfb, 0x90, 0x64]);
    const resultSync = validateMagicBytes(frameSync, 'stream.mp3');
    assert.equal(resultSync.isValid, true);
    if (resultSync.isValid) {
      assert.equal(resultSync.format, 'mp3');
    }
  });

  it('identifies PDF document magic bytes correctly', () => {
    const pdfHeader = createArrayBuffer([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    const result = validateMagicBytes(pdfHeader, 'doc.pdf');
    assert.equal(result.isValid, true);
    if (result.isValid) {
      assert.equal(result.format, 'pdf');
      assert.equal(result.category, 'document');
    }
  });

  it('identifies AVIF, HEIC, MP4, and MOV via ftyp brands', () => {
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

    const heicRes = validateMagicBytes(makeFtyp('heic'), 'photo.heic');
    assert.equal(heicRes.isValid, true);
    if (heicRes.isValid) assert.equal(heicRes.format, 'heic');

    const mp4Res = validateMagicBytes(makeFtyp('isom'), 'video.mp4');
    assert.equal(mp4Res.isValid, true);
    if (mp4Res.isValid) assert.equal(mp4Res.format, 'mp4');

    const movRes = validateMagicBytes(makeFtyp('qt  '), 'clip.mov');
    assert.equal(movRes.isValid, true);
    if (movRes.isValid) assert.equal(movRes.format, 'mov');
  });

  it('identifies SVG, HTML, JSON, CSV, TSV, Markdown, XML, and YAML documents', () => {
    const svgBytes = stringToArrayBuffer('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>');
    const svgResult = validateMagicBytes(svgBytes, 'icon.svg');
    assert.equal(svgResult.isValid, true);
    if (svgResult.isValid) assert.equal(svgResult.format, 'svg');

    const htmlBytes = stringToArrayBuffer('<!DOCTYPE html><html><body><h1>Hello</h1></body></html>');
    const htmlResult = validateMagicBytes(htmlBytes, 'page.html');
    assert.equal(htmlResult.isValid, true);
    if (htmlResult.isValid) assert.equal(htmlResult.format, 'html');

    const jsonBytes = stringToArrayBuffer('{"name": "universal-convertor"}');
    const jsonResult = validateMagicBytes(jsonBytes, 'data.json');
    assert.equal(jsonResult.isValid, true);
    if (jsonResult.isValid) assert.equal(jsonResult.format, 'json');

    const csvBytes = stringToArrayBuffer('id,name,value\n1,Alpha,100');
    const csvResult = validateMagicBytes(csvBytes, 'table.csv');
    assert.equal(csvResult.isValid, true);
    if (csvResult.isValid) assert.equal(csvResult.format, 'csv');

    const mdBytes = stringToArrayBuffer('# Document Title\n\nContent paragraph');
    const mdResult = validateMagicBytes(mdBytes, 'doc.md');
    assert.equal(mdResult.isValid, true);
    if (mdResult.isValid) assert.equal(mdResult.format, 'md');

    const xmlBytes = stringToArrayBuffer('<?xml version="1.0"?><root><item>Test</item></root>');
    const xmlResult = validateMagicBytes(xmlBytes, 'config.xml');
    assert.equal(xmlResult.isValid, true);
    if (xmlResult.isValid) assert.equal(xmlResult.format, 'xml');

    const yamlBytes = stringToArrayBuffer('version: 1.0\nservice: api');
    const yamlResult = validateMagicBytes(yamlBytes, 'config.yaml');
    assert.equal(yamlResult.isValid, true);
    if (yamlResult.isValid) assert.equal(yamlResult.format, 'yaml');
  });

  it('correctly validates supported vs unsupported extensions in Stage 1', () => {
    const validPng = isExtensionSupported('photo.PNG');
    assert.equal(validPng.supported, true);
    assert.equal(validPng.format, 'png');
    assert.equal(validPng.category, 'image');

    const validMp4 = isExtensionSupported('movie.mp4');
    assert.equal(validMp4.supported, true);
    assert.equal(validMp4.format, 'mp4');
    assert.equal(validMp4.category, 'video');

    const validJson = isExtensionSupported('schema.json');
    assert.equal(validJson.supported, true);
    assert.equal(validJson.format, 'json');
    assert.equal(validJson.category, 'document');

    const unsupportedPpt = isExtensionSupported('presentation.ppt');
    assert.equal(unsupportedPpt.supported, false);
    assert.equal(unsupportedPpt.extension, 'ppt');

    const unsupportedExe = isExtensionSupported('malware.exe');
    assert.equal(unsupportedExe.supported, false);

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
