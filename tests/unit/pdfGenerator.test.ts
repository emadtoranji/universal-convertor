import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { generatePdfFromImages } from '../../src/core/pdfGenerator.ts';
import type { PdfImageInput, PdfGenerationOptions } from '../../src/core/pdfGenerator.ts';

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(u8.byteLength);
  new Uint8Array(ab).set(u8);
  return ab;
}

describe('pdfGenerator - Unit Test Suite', () => {
  it('generates a valid PDF with correct magic bytes and page count from input PDFs', async () => {
    const doc1 = await PDFDocument.create();
    doc1.addPage([200, 200]);
    const pdfBytes1 = await doc1.save();

    const doc2 = await PDFDocument.create();
    doc2.addPage([300, 400]);
    doc2.addPage([300, 400]);
    const pdfBytes2 = await doc2.save();

    const inputs: PdfImageInput[] = [
      {
        buffer: toArrayBuffer(pdfBytes1),
        mimeType: 'application/pdf',
        name: 'doc1.pdf',
        width: 200,
        height: 200,
      },
      {
        buffer: toArrayBuffer(pdfBytes2),
        mimeType: 'application/pdf',
        name: 'doc2.pdf',
        width: 300,
        height: 400,
      },
    ];

    const options: PdfGenerationOptions = {
      pageSize: 'original',
      orientation: 'auto',
    };

    const outputBytes = await generatePdfFromImages(inputs, options);
    assert.ok(outputBytes.byteLength > 100);

    const mergedDoc = await PDFDocument.load(outputBytes);
    assert.equal(mergedDoc.getPageCount(), 3);
  });

  it('generates A4 sized PDF output with correct dimensions', async () => {
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    const inputs: PdfImageInput[] = [
      {
        buffer: toArrayBuffer(pngBytes),
        mimeType: 'image/png',
        name: 'sample.png',
        width: 1,
        height: 1,
      },
    ];

    const options: PdfGenerationOptions = {
      pageSize: 'a4',
      orientation: 'portrait',
    };

    const outputBytes = await generatePdfFromImages(inputs, options);
    const parsed = await PDFDocument.load(outputBytes);
    const page = parsed.getPage(0);
    const size = page.getSize();

    assert.equal(Math.round(size.width), 595);
    assert.equal(Math.round(size.height), 842);
  });

  it('preserves existing page dimensions when merging existing PDFs', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([100, 100]);
    const pdfBytes = await doc.save();

    const inputs: PdfImageInput[] = [
      {
        buffer: toArrayBuffer(pdfBytes),
        mimeType: 'application/pdf',
        name: 'single.pdf',
        width: 100,
        height: 100,
      },
    ];

    const options: PdfGenerationOptions = {
      pageSize: 'a4',
      orientation: 'portrait',
    };

    const outputBytes = await generatePdfFromImages(inputs, options);
    const parsed = await PDFDocument.load(outputBytes);
    const page = parsed.getPage(0);
    const size = page.getSize();

    assert.equal(Math.round(size.width), 100);
  });

  it('handles empty image input list without crashing', async () => {
    const options: PdfGenerationOptions = {
      pageSize: 'letter',
      orientation: 'portrait',
    };

    const outputBytes = await generatePdfFromImages([], options);
    assert.ok(outputBytes.byteLength > 0);
    const doc = await PDFDocument.load(outputBytes);
    assert.ok(doc.getPageCount() <= 1);
  });
});
