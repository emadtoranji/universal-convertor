import { zipSync } from 'fflate';
import type { Zippable } from 'fflate';

export interface ArchiveFileEntry {
  fileName: string;
  buffer: ArrayBuffer;
}

export function createZipArchive(files: ArchiveFileEntry[]): Blob {
  const zipData: Zippable = {};
  const usedNames = new Set<string>();

  for (const file of files) {
    let finalName = file.fileName;
    let counter = 1;

    while (usedNames.has(finalName)) {
      const dotIndex = file.fileName.lastIndexOf('.');
      if (dotIndex > 0) {
        const base = file.fileName.substring(0, dotIndex);
        const ext = file.fileName.substring(dotIndex);
        finalName = `${base}_${counter}${ext}`;
      } else {
        finalName = `${file.fileName}_${counter}`;
      }
      counter += 1;
    }

    usedNames.add(finalName);
    zipData[finalName] = new Uint8Array(file.buffer);
  }

  const zippedBytes = zipSync(zipData, { level: 6 });
  const arrayBufferCopy = zippedBytes.buffer.slice(
    zippedBytes.byteOffset,
    zippedBytes.byteOffset + zippedBytes.byteLength
  );
  return new Blob([arrayBufferCopy as ArrayBuffer], { type: 'application/zip' });
}
