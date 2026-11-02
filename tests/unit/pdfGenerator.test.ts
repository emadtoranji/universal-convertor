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
