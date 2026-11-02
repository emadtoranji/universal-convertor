import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  markdownToHtml,
  htmlToMarkdown,
  jsonToCsv,
  jsonToTsv,
  csvToJson,
  tsvToJson,
  textToBase64,
  base64ToText,
  textToHex,
  hexToText,
  parseCsvRows,
  convertDocument,
  jsonToXml,
  xmlToJson,
  jsonToYaml,
  yamlToJson,
  sortObjectKeys,
  documentToPdf,
  extractTextFromPdf,
  documentToPng,
} from '../../src/core/documentConverter.ts';

describe('documentConverter - Unit Test Suite', () => {
  it('converts markdown headings, lists, bold, and code to semantic HTML', () => {
    const md = '# Main Title\n\n**Bold Text** and *Italic Text*\n\n- Item 1\n- Item 2\n\n`inline code`';
    const html = markdownToHtml(md);

    assert.match(html, /<h1[^>]*>Main Title<\/h1>/);
    assert.match(html, /<strong>Bold Text<\/strong>/);
    assert.match(html, /<em>Italic Text<\/em>/);
    assert.match(html, /<li>Item 1<\/li>/);
    assert.match(html, /<code>inline code<\/code>/);
  });

  it('converts basic HTML elements back to clean Markdown', () => {
    const html = '<h1>Heading One</h1><p>A simple <strong>bold</strong> paragraph.</p><ul><li>First</li><li>Second</li></ul>';
    const md = htmlToMarkdown(html);

    assert.match(md, /# Heading One/);
    assert.match(md, /\*\*bold\*\*/);
    assert.match(md, /- First/);
    assert.match(md, /- Second/);
  });

  it('converts JSON records to CSV and TSV formats accurately', () => {
    const records = [
      { id: 1, name: 'Alice', role: 'Engineer' },
      { id: 2, name: 'Bob', role: 'Designer' },
    ];

    const csv = jsonToCsv(records);
    assert.match(csv, /id,name,role/);
    assert.match(csv, /1,Alice,Engineer/);
    assert.match(csv, /2,Bob,Designer/);

    const tsv = jsonToTsv(records);
    assert.match(tsv, /id\tname\trole/);
    assert.match(tsv, /1\tAlice\tEngineer/);
  });

  it('parses CSV and TSV text back to structured JSON objects', () => {
    const csvContent = 'id,product,price\n101,Widget,29.99\n102,Gadget,49.50';
    const jsonFromCsv = csvToJson(csvContent);

    assert.equal(jsonFromCsv.length, 2);
    assert.equal(jsonFromCsv[0].product, 'Widget');
    assert.equal(jsonFromCsv[1].price, 49.5);

    const tsvContent = 'id\tproduct\tprice\n201\tDoohickey\t9.99';
    const jsonFromTsv = tsvToJson(tsvContent);

    assert.equal(jsonFromTsv.length, 1);
    assert.equal(jsonFromTsv[0].product, 'Doohickey');
  });

  it('handles CSV values with commas, quotes, and newlines properly', () => {
    const rawCsv = 'name,description\n"Smith, John","Senior ""Lead"" Architect"';
    const rows = parseCsvRows(rawCsv);

    assert.equal(rows.length, 2);
    assert.equal(rows[1][0], 'Smith, John');
    assert.equal(rows[1][1], 'Senior "Lead" Architect');
  });

  it('performs Base64 encoding and decoding roundtrip reliably', () => {
    const sample = 'Universal Convertor: 100% Client-Side Engine 🚀';
    const encoded = textToBase64(sample);
    const decoded = base64ToText(encoded);

    assert.equal(decoded, sample);
  });

  it('performs Hex encoding and decoding roundtrip reliably', () => {
    const sample = 'Zero Network Transmission Guaranteed';
    const hex = textToHex(sample);
    const text = hexToText(hex);

    assert.equal(text, sample);
  });

  it('converts JSON to pretty-printed JSON and minified JSON correctly', async () => {
    const minified = '{"z":1,"a":2,"m":{"y":10,"x":20}}';
    const prettyResult = await convertDocument(minified, {
      sourceFormat: 'json',
      targetFormat: 'json',
      prettyJson: true,
      jsonIndent: 2,
    });
    assert.match(String(prettyResult.data), /\n  "z": 1/);

    const sortedResult = await convertDocument(minified, {
      sourceFormat: 'json',
      targetFormat: 'json',
      prettyJson: true,
      jsonSortKeys: true,
    });
    const parsedSorted = JSON.parse(String(sortedResult.data));
    assert.deepEqual(Object.keys(parsedSorted), ['a', 'm', 'z']);
    assert.deepEqual(Object.keys(parsedSorted.m), ['x', 'y']);

    const miniResult = await convertDocument(prettyResult.data, {
      sourceFormat: 'json',
      targetFormat: 'json',
      prettyJson: false,
      jsonIndent: 0,
    });
    assert.equal(String(miniResult.data).includes('\n'), false);
  });

  it('converts JSON to XML and XML to JSON accurately', async () => {
    const testObj = { title: 'App', version: '1.0' };
    const xml = jsonToXml(testObj, 'root');
    assert.match(xml, /<root>/);
    assert.match(xml, /<title>App<\/title>/);
    assert.match(xml, /<version>1\.0<\/version>/);

    const jsonParsed = xmlToJson(xml) as Record<string, unknown>;
    assert.ok(jsonParsed.root);

    const docResult = await convertDocument(JSON.stringify(testObj), {
      sourceFormat: 'json',
      targetFormat: 'xml',
    });
    assert.match(String(docResult.data), /<title>App<\/title>/);
  });

  it('converts JSON to YAML and YAML to JSON accurately', async () => {
    const testObj = { name: 'universal', count: 42 };
    const yaml = jsonToYaml(testObj);
    assert.match(yaml, /name: universal/);
    assert.match(yaml, /count: 42/);

    const backToJson = yamlToJson(yaml) as Record<string, unknown>;
    assert.equal(backToJson.name, 'universal');
    assert.equal(backToJson.count, 42);

    const docResult = await convertDocument(yaml, {
      sourceFormat: 'yaml',
      targetFormat: 'json',
    });
    const parsed = JSON.parse(String(docResult.data));
    assert.equal(parsed.name, 'universal');
    assert.equal(parsed.count, 42);
  });

  it('handles empty string inputs across document conversions', () => {
    assert.equal(markdownToHtml(''), '');
    assert.equal(htmlToMarkdown(''), '');
    assert.equal(jsonToCsv([]), '');
    assert.deepEqual(csvToJson(''), []);
    assert.equal(textToBase64(''), '');
    assert.deepEqual(sortObjectKeys({}), {});
  });

  it('converts a PDF input document to plain UTF-8 text reliably', async () => {
    const samplePdf = await documentToPdf('# Section Alpha\n\nFirst paragraph text content.\n\n## Section Beta\n\nSecond paragraph text content.');
    const result = await convertDocument(samplePdf, {
      sourceFormat: 'pdf',
      targetFormat: 'txt',
      fileName: 'report.pdf',
    });

    assert.equal(result.mimeType, 'text/plain;charset=utf-8');
    assert.equal(result.fileName, 'report.txt');
    assert.ok(String(result.data).includes('Section Alpha'));
    assert.ok(String(result.data).includes('First paragraph'));
  });

  it('converts a PDF input document to semantic UTF-8 HTML', async () => {
    const samplePdf = await documentToPdf('# Invoice Title\n\nTotal Due: $1000\n\nThank you for your business.');
    const result = await convertDocument(samplePdf, {
      sourceFormat: 'pdf',
      targetFormat: 'html',
      fileName: 'invoice.pdf',
    });

    assert.equal(result.mimeType, 'text/html;charset=utf-8');
    assert.equal(result.fileName, 'invoice.html');
    assert.match(String(result.data), /<meta charset="utf-8"/);
    assert.match(String(result.data), /Invoice Title/);
    assert.match(String(result.data), /<section class="pdf-page"/);
  });

  it('converts a PDF input document to structured Markdown', async () => {
    const samplePdf = await documentToPdf('# Documentation\n\nWelcome to the user guide.');
    const result = await convertDocument(samplePdf, {
      sourceFormat: 'pdf',
      targetFormat: 'md',
      fileName: 'guide.pdf',
    });

    assert.equal(result.mimeType, 'text/markdown;charset=utf-8');
    assert.equal(result.fileName, 'guide.md');
    assert.ok(String(result.data).includes('## Page 1'));
    assert.ok(String(result.data).includes('Documentation'));
  });

  it('converts a PDF input document to structured JSON with page array', async () => {
    const samplePdf = await documentToPdf('# Contract Agreement\n\nParties agree to terms herein.');
    const result = await convertDocument(samplePdf, {
      sourceFormat: 'pdf',
      targetFormat: 'json',
      fileName: 'contract.pdf',
    });

    assert.equal(result.mimeType, 'application/json;charset=utf-8');
    assert.equal(result.fileName, 'contract.json');

    const parsed = JSON.parse(String(result.data));
    assert.equal(parsed.fileName, 'contract.pdf');
    assert.equal(parsed.totalPages, 1);
    assert.ok(Array.isArray(parsed.pages));
    assert.equal(parsed.pages[0].pageNumber, 1);
    assert.ok(parsed.pages[0].text.includes('Contract Agreement'));
  });

  it('converts a PDF input document to another standardized PDF', async () => {
    const samplePdf = await documentToPdf('# Page Orientation Test\n\nTesting PDF cloning.');
    const result = await convertDocument(samplePdf, {
      sourceFormat: 'pdf',
      targetFormat: 'pdf',
      fileName: 'test.pdf',
      pdfOrientation: 'landscape',
    });

    assert.equal(result.mimeType, 'application/pdf');
    assert.equal(result.fileName, 'test.pdf');
    assert.ok(result.data instanceof Uint8Array);
    const bytes = result.data as Uint8Array;
    assert.equal(bytes[0], 0x25);
    assert.equal(bytes[1], 0x50);
    assert.equal(bytes[2], 0x44);
    assert.equal(bytes[3], 0x46);
  });

  it('converts a PDF input document to PNG image buffer', async () => {
    const samplePdf = await documentToPdf('# PNG Snapshot Test\n\nRendering page to image.');
    const result = await convertDocument(samplePdf, {
      sourceFormat: 'pdf',
      targetFormat: 'png',
      fileName: 'snapshot.pdf',
    });

    assert.equal(result.mimeType, 'image/png');
    assert.equal(result.fileName, 'snapshot.png');
    assert.ok(result.data instanceof Uint8Array);
    const bytes = result.data as Uint8Array;
    assert.equal(bytes[0], 0x89);
    assert.equal(bytes[1], 0x50);
    assert.equal(bytes[2], 0x4e);
    assert.equal(bytes[3], 0x47);
  });

  it('encodes Persian, Arabic, and diverse UTF-8 characters into PDF without WinAnsi errors', async () => {
    const persianUtf8Content = '# عنوان فارسی سند\n\nسلام دنیا! این یک سند متنی کامل با نویسه‌های فارسی و یونیکد است.\n\n- گچپژ و حروف ویژه\n- کاراکترهای فرانسوی: café, naïve\n- نمادهای بین‌المللی: € £ ¥ § © ®';
    const pdfBytes = await documentToPdf(persianUtf8Content, { title: 'فارسی UTF-8' });

    assert.ok(pdfBytes instanceof Uint8Array);
    assert.ok(pdfBytes.byteLength > 100);
    assert.equal(pdfBytes[0], 0x25);
    assert.equal(pdfBytes[1], 0x50);
    assert.equal(pdfBytes[2], 0x44);
    assert.equal(pdfBytes[3], 0x46);
  });
});
