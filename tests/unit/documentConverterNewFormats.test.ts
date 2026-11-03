import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  markdownToHtml,
  htmlToMarkdown,
  htmlToPlainText,
  markdownToPlainText,
  xmlToJson,
  jsonToXml,
  convertDocument,
} from '../../src/core/converters/documentConverter.ts';

describe('documentConverter - Expanded Formats Test Suite', () => {
  it('converts Markdown headings, lists, bold, and code blocks to HTML', () => {
    const md = '# Title\n\n**Bold Text** and *Italic*\n\n- Item 1\n- Item 2\n\n```\nconst x = 10;\n```';
    const html = markdownToHtml(md);

    assert.ok(html.includes('<h1>Title</h1>'));
    assert.ok(html.includes('<strong>Bold Text</strong>'));
    assert.ok(html.includes('<em>Italic</em>'));
    assert.ok(html.includes('<ul>'));
    assert.ok(html.includes('<li>Item 1</li>'));
    assert.ok(html.includes('<li>Item 2</li>'));
    assert.ok(html.includes('<pre><code>'));
    assert.ok(html.includes('const x = 10;'));
  });

  it('converts HTML headings, formatting, and paragraphs to Markdown', () => {
    const html = '<h1>Heading</h1><p>This is <strong>important</strong> and <em>notable</em>.</p><ul><li>First</li></ul>';
    const md = htmlToMarkdown(html);

    assert.ok(md.includes('# Heading'));
    assert.ok(md.includes('**important**'));
    assert.ok(md.includes('*notable*'));
    assert.ok(md.includes('- First'));
  });

  it('strips markup safely when converting HTML and Markdown to plain text', () => {
    const html = '<h2>Section</h2><p>Paragraph with <a href="https://example.com">link</a> &amp; special chars.</p>';
    const plain = htmlToPlainText(html);
    assert.ok(plain.includes('Section'));
    assert.ok(plain.includes('link & special chars.'));
    assert.ok(!plain.includes('<h2>'));
    assert.ok(!plain.includes('<p>'));

    const md = '### Subheading\n\n[Visit](https://test.com) **bold** text.';
    const mdPlain = markdownToPlainText(md);
    assert.ok(mdPlain.includes('Subheading'));
    assert.ok(mdPlain.includes('Visit bold text.'));
    assert.ok(!mdPlain.includes('###'));
  });

  it('parses XML documents into structured JSON objects', () => {
    const xml = '<user><name>Alice</name><age>30</age><active>true</active></user>';
    const json = xmlToJson(xml) as Record<string, Record<string, unknown>>;

    assert.ok(json.user);
    assert.equal(json.user.name, 'Alice');
    assert.equal(json.user.age, 30);
    assert.equal(json.user.active, true);
  });

  it('serializes JSON objects into structured XML documents', () => {
    const obj = { employee: { name: 'Bob', department: 'Engineering' } };
    const xml = jsonToXml(obj, 'company');

    assert.ok(xml.includes('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(xml.includes('<name>Bob</name>'));
    assert.ok(xml.includes('<department>Engineering</department>'));
  });

  it('converts documents bi-directionally using convertDocument interface', async () => {
    const mdResult = await convertDocument('# Hello World\n\nSample text.', {
      sourceFormat: 'md',
      targetFormat: 'html',
      fileName: 'doc.md',
    });
    assert.equal(mdResult.mimeType, 'text/html;charset=utf-8');
    assert.ok(typeof mdResult.data === 'string' && mdResult.data.includes('<h1>Hello World</h1>'));

    const xmlResult = await convertDocument('<root><title>Report</title></root>', {
      sourceFormat: 'xml',
      targetFormat: 'json',
      fileName: 'data.xml',
    });
    assert.equal(xmlResult.mimeType, 'application/json;charset=utf-8');
    assert.ok(typeof xmlResult.data === 'string' && xmlResult.data.includes('"title": "Report"'));
  });

  it('handles empty and boundary inputs safely without crashing', async () => {
    const emptyResult = await convertDocument('', {
      sourceFormat: 'md',
      targetFormat: 'html',
    });
    assert.equal(emptyResult.byteLength, 0);

    const emptyXml = xmlToJson('');
    assert.ok(typeof emptyXml === 'object');
  });

  it('prevents prototype pollution when parsing XML with dangerous keys', () => {
    const maliciousXml = '<root><__proto__>hacked</__proto__><safe>value</safe></root>';
    const res = xmlToJson(maliciousXml) as Record<string, Record<string, unknown>>;
    assert.equal(res.root.__proto__, Object.prototype);
    assert.equal(res.root.safe, 'value');
  });
});
