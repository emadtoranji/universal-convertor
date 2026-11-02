import { PDFDocument } from 'pdf-lib';
import type { PdfOrientation, PdfPageSize } from '../types/converter.ts';

export interface PdfImageInput {
  buffer: ArrayBuffer;
  mimeType: string;
  name: string;
  width: number;
  height: number;
}

export interface PdfGenerationOptions {
  pageSize: PdfPageSize;
  orientation: PdfOrientation;
  marginPoints?: number;
}

const PAGE_DIMENSIONS: Record<Exclude<PdfPageSize, 'original'>, { width: number; height: number }> = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
};

async function convertToPngBuffer(input: PdfImageInput): Promise<Uint8Array> {
  if (input.mimeType === 'image/png' || input.mimeType === 'image/jpeg') {
    return new Uint8Array(input.buffer);
  }

  const blob = new Blob([input.buffer], { type: input.mimeType });
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Canvas 2D context unavailable');
  }

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
  const arrayBuffer = await pngBlob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export async function generatePdfFromImages(
  images: PdfImageInput[],
  options: PdfGenerationOptions
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const margin = options.marginPoints ?? 20;

  for (const img of images) {
    const firstBytes = new Uint8Array(img.buffer.slice(0, 5));
    const isExistingPdf =
      img.mimeType === 'application/pdf' ||
      (firstBytes.length >= 5 &&
        firstBytes[0] === 0x25 &&
        firstBytes[1] === 0x50 &&
        firstBytes[2] === 0x44 &&
        firstBytes[3] === 0x46 &&
        firstBytes[4] === 0x2d);

    if (isExistingPdf) {
      const srcDoc = await PDFDocument.load(img.buffer);
      const copiedPages = await doc.copyPages(srcDoc, srcDoc.getPageIndices());
      for (const page of copiedPages) {
        doc.addPage(page);
      }
      continue;
    }

    const rawBytes = await convertToPngBuffer(img);
    const embeddedImage =
      img.mimeType === 'image/jpeg' ? await doc.embedJpg(rawBytes) : await doc.embedPng(rawBytes);

    const naturalWidth = embeddedImage.width;
    const naturalHeight = embeddedImage.height;

    let pageWidth: number;
    let pageHeight: number;

    if (options.pageSize === 'original') {
      pageWidth = naturalWidth + margin * 2;
      pageHeight = naturalHeight + margin * 2;
    } else {
      const standard = PAGE_DIMENSIONS[options.pageSize];
      let isLandscape = options.orientation === 'landscape';
      if (options.orientation === 'auto') {
        isLandscape = naturalWidth > naturalHeight;
      }

      pageWidth = isLandscape ? Math.max(standard.width, standard.height) : Math.min(standard.width, standard.height);
      pageHeight = isLandscape ? Math.min(standard.width, standard.height) : Math.max(standard.width, standard.height);
    }

    const page = doc.addPage([pageWidth, pageHeight]);

    const maxUsableWidth = pageWidth - margin * 2;
    const maxUsableHeight = pageHeight - margin * 2;

    const scaleFactor = Math.min(maxUsableWidth / naturalWidth, maxUsableHeight / naturalHeight, 1);
    const drawWidth = naturalWidth * scaleFactor;
    const drawHeight = naturalHeight * scaleFactor;

    const xPos = (pageWidth - drawWidth) / 2;
    const yPos = (pageHeight - drawHeight) / 2;

    page.drawImage(embeddedImage, {
      x: xPos,
      y: yPos,
      width: drawWidth,
      height: drawHeight,
    });
  }

  return await doc.save();
}
