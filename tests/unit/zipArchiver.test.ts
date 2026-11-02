import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync } from 'fflate';
import { createZipArchive } from '../../src/core/zipArchiver.ts';
import type { ArchiveFileEntry } from '../../src/core/zipArchiver.ts';

describe('zipArchiver - Unit Test Suite', () => {
  it('creates a valid ZIP archive containing multiple files', async () => {
    const file1: ArchiveFileEntry = {
      fileName: 'first.txt',
      buffer: new TextEncoder().encode('Hello Universal Convertor').buffer,
    };
    const file2: ArchiveFileEntry = {
      fileName: 'second.json',
      buffer: new TextEncoder().encode('{"status":"ok"}').buffer,
    };

    const zipBlob = createZipArchive([file1, file2]);
    assert.equal(zipBlob.type, 'application/zip');
    assert.ok(zipBlob.size > 0);

    const zipArrayBuffer = await zipBlob.arrayBuffer();
    const unzipped = unzipSync(new Uint8Array(zipArrayBuffer));

    assert.ok(unzipped['first.txt'] !== undefined);
    assert.ok(unzipped['second.json'] !== undefined);

    const firstContent = new TextDecoder().decode(unzipped['first.txt']);
    assert.equal(firstContent, 'Hello Universal Convertor');
  });

  it('deduplicates duplicate file names with index suffixes', async () => {
    const fileA: ArchiveFileEntry = {
      fileName: 'photo.webp',
      buffer: new Uint8Array([1, 2, 3]).buffer,
    };
    const fileB: ArchiveFileEntry = {
      fileName: 'photo.webp',
      buffer: new Uint8Array([4, 5, 6]).buffer,
    };
    const fileC: ArchiveFileEntry = {
      fileName: 'photo.webp',
      buffer: new Uint8Array([7, 8, 9]).buffer,
    };

    const zipBlob = createZipArchive([fileA, fileB, fileC]);
    const zipArrayBuffer = await zipBlob.arrayBuffer();
    const unzipped = unzipSync(new Uint8Array(zipArrayBuffer));

    assert.ok(unzipped['photo.webp'] !== undefined);
    assert.ok(unzipped['photo_1.webp'] !== undefined);
    assert.ok(unzipped['photo_2.webp'] !== undefined);
  });

  it('deduplicates files without extensions correctly', async () => {
    const docA: ArchiveFileEntry = {
      fileName: 'LICENSE',
      buffer: new TextEncoder().encode('MIT').buffer,
    };
    const docB: ArchiveFileEntry = {
      fileName: 'LICENSE',
      buffer: new TextEncoder().encode('Apache').buffer,
    };

    const zipBlob = createZipArchive([docA, docB]);
    const zipArrayBuffer = await zipBlob.arrayBuffer();
    const unzipped = unzipSync(new Uint8Array(zipArrayBuffer));

    assert.ok(unzipped['LICENSE'] !== undefined);
    assert.ok(unzipped['LICENSE_1'] !== undefined);
  });

  it('creates an empty zip archive when files array is empty', () => {
    const zipBlob = createZipArchive([]);
    assert.equal(zipBlob.type, 'application/zip');
    assert.ok(zipBlob.size >= 22);
  });
});
