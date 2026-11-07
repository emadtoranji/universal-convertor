import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isExtensionSupported,
  validateMagicBytes,
  getMimeTypeForFormat,
} from '../../src/utils/magicBytes.ts';
import {
  getMediaCategory,
  getCompatibleOutputFormats,
} from '../../src/types/converter.ts';

function createBuffer(bytes: number[]): ArrayBuffer {
  const ab = new ArrayBuffer(bytes.length);
  const u8 = new Uint8Array(ab);
  u8.set(bytes);
  return ab;
}

describe('newFormatsMatrix - Format Matrix Test Suite', () => {
  it('correctly maps newly supported formats to their media categories', () => {
    assert.equal(getMediaCategory('tiff'), 'image');
    assert.equal(getMediaCategory('psd'), 'image');
    assert.equal(getMediaCategory('md'), 'document');
    assert.equal(getMediaCategory('html'), 'document');
    assert.equal(getMediaCategory('txt'), 'document');
    assert.equal(getMediaCategory('xml'), 'document');
  });

  it('recognizes all supported image and document extensions in stage 1 check', () => {
    assert.equal(isExtensionSupported('image.tif').supported, true);
    assert.equal(isExtensionSupported('image.tiff').supported, true);
    assert.equal(isExtensionSupported('design.psd').supported, true);
    assert.equal(isExtensionSupported('photo.jfif').supported, true);
    assert.equal(isExtensionSupported('photo.jfif').format, 'jpeg');
    assert.equal(isExtensionSupported('notes.md').supported, true);
    assert.equal(isExtensionSupported('page.html').supported, true);
    assert.equal(isExtensionSupported('page.htm').supported, true);
    assert.equal(isExtensionSupported('plain.txt').supported, true);
    assert.equal(isExtensionSupported('feed.xml').supported, true);
  });

  it('strictly rejects formats that cannot guarantee 99% client-side fidelity', () => {
    const forbidden = [
      'video.mp4',
      'movie.mkv',
      'clip.avi',
      'track.mp3',
      'sound.ogg',
      'voice.wav',
      'archive.rar',
      'package.7z',
      'tarball.tar',
      'doc.docx',
      'sheet.xlsx',
      'deck.pptx',
      'camera.raw',
      'camera.dng',
    ];

    for (const file of forbidden) {
      const res = isExtensionSupported(file);
      assert.equal(res.supported, false);
    }
    assert.equal(isExtensionSupported('apple.heic').supported, true);
  });

  it('validates TIFF and PSD binary magic bytes correctly', () => {
    const tiffLittleEndian = createBuffer([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00]);
    const tiffRes = validateMagicBytes(tiffLittleEndian, 'sample.tiff');
    assert.equal(tiffRes.isValid, true);
    if (tiffRes.isValid) {
      assert.equal(tiffRes.format, 'tiff');
    }

    const tiffBigEndian = createBuffer([0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08]);
    const tiffBigRes = validateMagicBytes(tiffBigEndian, 'sample.tif');
    assert.equal(tiffBigRes.isValid, true);
    if (tiffBigRes.isValid) {
      assert.equal(tiffBigRes.format, 'tiff');
    }

    const psdBuffer = createBuffer([0x38, 0x42, 0x50, 0x53, 0x00, 0x01, 0x00, 0x00]);
    const psdRes = validateMagicBytes(psdBuffer, 'design.psd');
    assert.equal(psdRes.isValid, true);
    if (psdRes.isValid) {
      assert.equal(psdRes.format, 'psd');
    }
  });

  it('validates XML, HTML, MD, and TXT magic bytes and text patterns correctly', () => {
    const encoder = new TextEncoder();

    const xmlBuf = encoder.encode('<?xml version="1.0"?><catalog></catalog>').buffer;
    const xmlRes = validateMagicBytes(xmlBuf, 'data.xml');
    assert.equal(xmlRes.isValid, true);
    if (xmlRes.isValid) {
      assert.equal(xmlRes.format, 'xml');
    }

    const htmlBuf = encoder.encode('<!DOCTYPE html><html><body><h1>Hi</h1></body></html>').buffer;
    const htmlRes = validateMagicBytes(htmlBuf, 'index.html');
    assert.equal(htmlRes.isValid, true);
    if (htmlRes.isValid) {
      assert.equal(htmlRes.format, 'html');
    }

    const mdBuf = encoder.encode('# Title\n\nContent paragraph here.').buffer;
    const mdRes = validateMagicBytes(mdBuf, 'readme.md');
    assert.equal(mdRes.isValid, true);
    if (mdRes.isValid) {
      assert.equal(mdRes.format, 'md');
    }

    const txtBuf = encoder.encode('Plain simple text line one.\nLine two.').buffer;
    const txtRes = validateMagicBytes(txtBuf, 'notes.txt');
    assert.equal(txtRes.isValid, true);
    if (txtRes.isValid) {
      assert.equal(txtRes.format, 'txt');
    }
  });

  it('provides compatible output formats for new input types', () => {
    const tiffOutputs = getCompatibleOutputFormats('tiff');
    assert.ok(tiffOutputs.includes('webp'));
    assert.ok(tiffOutputs.includes('png'));
    assert.ok(tiffOutputs.includes('jpeg'));
    assert.ok(tiffOutputs.includes('tiff'));

    const psdOutputs = getCompatibleOutputFormats('psd');
    assert.ok(psdOutputs.includes('webp'));
    assert.ok(psdOutputs.includes('png'));
    assert.ok(psdOutputs.includes('jpeg'));

    const mdOutputs = getCompatibleOutputFormats('md');
    assert.ok(mdOutputs.includes('html'));
    assert.ok(mdOutputs.includes('txt'));
    assert.ok(mdOutputs.includes('json'));

    const xmlOutputs = getCompatibleOutputFormats('xml');
    assert.ok(xmlOutputs.includes('json'));
    assert.ok(xmlOutputs.includes('csv'));
  });

  it('returns valid mime types for all newly added formats', () => {
    assert.equal(getMimeTypeForFormat('tiff'), 'image/tiff');
    assert.equal(getMimeTypeForFormat('psd'), 'image/vnd.adobe.photoshop');
    assert.equal(getMimeTypeForFormat('md'), 'text/markdown');
    assert.equal(getMimeTypeForFormat('html'), 'text/html');
    assert.equal(getMimeTypeForFormat('txt'), 'text/plain');
    assert.equal(getMimeTypeForFormat('xml'), 'application/xml');
  });
});
