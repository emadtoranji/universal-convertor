import * as fflate from 'fflate';
import { PDFDocument, StandardFonts, PDFRawStream, PDFArray, rgb, grayscale, degrees } from 'pdf-lib';
import type { PDFFont, PDFPage } from 'pdf-lib';

export type DocumentFormat =
  | 'markdown'
  | 'md'
  | 'html'
  | 'json'
  | 'csv'
  | 'tsv'
  | 'txt'
  | 'pdf'
  | 'base64'
  | 'hex'
  | 'xml'
  | 'yaml'
  | 'yml'
  | 'png';

export interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedPdfResult {
  text: string;
  pages: ExtractedPdfPage[];
  totalPages: number;
}

export interface CsvParseOptions {
  delimiter?: string;
  coerceTypes?: boolean;
  headers?: string[];
  skipEmptyLines?: boolean;
  trimFields?: boolean;
}

export interface DocumentPdfOptions {
  pageSize?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  margin?: number;
  fontSize?: number;
  lineHeight?: number;
  includePageNumbers?: boolean;
  title?: string;
}

export interface DocumentConvertOptions {
  sourceFormat?: DocumentFormat;
  targetFormat: DocumentFormat;
  fileName?: string;
  delimiter?: string;
  coerceTypes?: boolean;
  prettyJson?: boolean;
  jsonIndent?: number;
  jsonSortKeys?: boolean;
  pdfPageSize?: 'a4' | 'letter';
  pdfOrientation?: 'portrait' | 'landscape';
  pdfMargin?: number;
  includePageNumbers?: boolean;
  title?: string;
}

export interface DocumentConvertResult {
  data: string | Uint8Array;
  mimeType: string;
  fileName: string;
  byteLength: number;
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

function renderInlineMarkdown(text: string): string {
  let rendered = text;

  rendered = rendered.replace(/`([^`]+)`/g, (_match, code: string) => {
    return `<code>${escapeHtml(code)}</code>`;
  });

  rendered = rendered.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_match, alt: string, src: string, title?: string) => {
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${titleAttr} />`;
  });

  rendered = rendered.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_match, label: string, href: string, title?: string) => {
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    return `<a href="${escapeHtml(href)}" rel="noopener noreferrer"${titleAttr}>${label}</a>`;
  });

  rendered = rendered.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  rendered = rendered.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');
  rendered = rendered.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  rendered = rendered.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  rendered = rendered.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  rendered = rendered.replace(/_([^_]+)_/g, '<em>$1</em>');
  rendered = rendered.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  rendered = rendered.replace(/==([^=]+)==/g, '<mark>$1</mark>');

  return rendered;
}

export function sanitizeHtml(rawHtml: string): string {
  const withoutDoctype = rawHtml
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<!ENTITY[^>]*>/gi, '');

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return withoutDoctype
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^>]*>/gi, '')
      .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '')
      .replace(/\son\w+='[^']*'/gi, '')
      .replace(/\son\w+=[^\s>]+/gi, '')
      .replace(/href="javascript:[^"]*"/gi, 'href=""')
      .replace(/href='javascript:[^']*'/gi, 'href=""')
      .replace(/src="javascript:[^"]*"/gi, 'src=""')
      .replace(/src='javascript:[^']*'/gi, 'src=""');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(withoutDoctype, 'text/html');

  const body = doc.body;
  if (!body) return '';

  const dangerousSelectors = 'script, style, iframe, object, embed, link, meta, base, form, input, button, textarea, select, option, noscript, template';
  const dangerousNodes = body.querySelectorAll(dangerousSelectors);
  dangerousNodes.forEach((node) => node.remove());

  const allElements = Array.from(body.querySelectorAll('*'));
  const allowedTags = new Set([
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
    'blockquote', 'pre', 'code', 'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'a', 'img',
    'span', 'div', 'sub', 'sup', 'mark', 'abbr', 'q', 'cite', 'caption'
  ]);

  allElements.forEach((element) => {
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'html' || tagName === 'head' || tagName === 'body') {
      return;
    }

    if (!allowedTags.has(tagName)) {
      if (element.parentElement && element.parentElement !== (doc as unknown as HTMLElement)) {
        element.replaceWith(...Array.from(element.childNodes));
      }
      return;
    }

    const attributeNames = Array.from(element.attributes).map((attr) => attr.name);
    for (const attrName of attributeNames) {
      const lowerAttr = attrName.toLowerCase();
      if (lowerAttr.startsWith('on')) {
        element.removeAttribute(attrName);
      } else if (lowerAttr === 'href' || lowerAttr === 'src' || lowerAttr === 'cite') {
        const value = element.getAttribute(attrName)?.trim().toLowerCase() ?? '';
        if (
          value.startsWith('javascript:') ||
          value.startsWith('vbscript:') ||
          value.startsWith('data:text/html')
        ) {
          element.removeAttribute(attrName);
        }
      }
    }
  });

  return body.innerHTML;
}

export function markdownToHtml(markdown: string): string {
  const normalized = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const output: string[] = [];

  let index = 0;
  const lineCount = lines.length;

  while (index < lineCount) {
    const line = lines[index];

    if (line.trim() === '') {
      index++;
      continue;
    }

    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      index++;
      while (index < lineCount && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index++;
      }
      if (index < lineCount) {
        index++;
      }
      const langAttr = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      output.push(`<pre><code${langAttr}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = renderInlineMarkdown(headingMatch[2].trim());
      output.push(`<h${level}>${content}</h${level}>`);
      index++;
      continue;
    }

    if (/^(?:---|\*\*\*|___)\s*$/.test(line.trim())) {
      output.push('<hr />');
      index++;
      continue;
    }

    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (index < lineCount && lines[index].trim().startsWith('>')) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ''));
        index++;
      }
      const quoteMarkdown = quoteLines.join('\n');
      output.push(`<blockquote>${markdownToHtml(quoteMarkdown)}</blockquote>`);
      continue;
    }

    const tableSeparatorPattern = /^\s*\|?\s*(?::?---+:?\s*\|)+\s*(?::?---+:?)?\s*\|?\s*$/;
    if (line.includes('|') && index + 1 < lineCount && tableSeparatorPattern.test(lines[index + 1])) {
      const headerLine = line;
      const separatorLine = lines[index + 1];
      index += 2;

      const parseCells = (rowText: string): string[] => {
        let trimmed = rowText.trim();
        if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
        if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
        return trimmed.split('|').map((c) => c.trim());
      };

      const headers = parseCells(headerLine);
      const alignTokens = parseCells(separatorLine);
      const alignments = alignTokens.map((token) => {
        const left = token.startsWith(':');
        const right = token.endsWith(':');
        if (left && right) return 'center';
        if (right) return 'right';
        return 'left';
      });

      const bodyRows: string[][] = [];
      while (index < lineCount && lines[index].includes('|') && lines[index].trim() !== '') {
        bodyRows.push(parseCells(lines[index]));
        index++;
      }

      let tableHtml = '<table class="doc-table"><thead><tr>';
      headers.forEach((h, i) => {
        const align = alignments[i] ?? 'left';
        tableHtml += `<th style="text-align: ${align}">${renderInlineMarkdown(h)}</th>`;
      });
      tableHtml += '</tr></thead><tbody>';

      bodyRows.forEach((row) => {
        tableHtml += '<tr>';
        headers.forEach((_, i) => {
          const cellContent = row[i] ? renderInlineMarkdown(row[i]) : '';
          const align = alignments[i] ?? 'left';
          tableHtml += `<td style="text-align: ${align}">${cellContent}</td>`;
        });
        tableHtml += '</tr>';
      });

      tableHtml += '</tbody></table>';
      output.push(tableHtml);
      continue;
    }

    const unorderedMatch = line.match(/^(\s*)([*+-])\s+(.+)$/);
    if (unorderedMatch) {
      output.push('<ul>');
      while (index < lineCount) {
        const itemMatch = lines[index].match(/^(\s*)([*+-])\s+(.+)$/);
        if (!itemMatch) break;
        output.push(`<li>${renderInlineMarkdown(itemMatch[3])}</li>`);
        index++;
      }
      output.push('</ul>');
      continue;
    }

    const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
    if (orderedMatch) {
      output.push('<ol>');
      while (index < lineCount) {
        const itemMatch = lines[index].match(/^(\s*)(\d+)\.\s+(.+)$/);
        if (!itemMatch) break;
        output.push(`<li>${renderInlineMarkdown(itemMatch[3])}</li>`);
        index++;
      }
      output.push('</ol>');
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lineCount &&
      lines[index].trim() !== '' &&
      !lines[index].match(/^#{1,6}\s+/) &&
      !lines[index].trim().startsWith('```') &&
      !lines[index].trim().startsWith('>') &&
      !lines[index].match(/^(\s*)([*+-]|\d+\.)\s+/) &&
      !/^(?:---|\*\*\*|___)\s*$/.test(lines[index].trim())
    ) {
      paragraphLines.push(lines[index]);
      index++;
    }

    if (paragraphLines.length > 0) {
      const paragraphText = paragraphLines.map(renderInlineMarkdown).join('<br />');
      output.push(`<p>${paragraphText}</p>`);
    }
  }

  const rawHtml = output.join('\n');
  return sanitizeHtml(rawHtml);
}

export function htmlToMarkdown(html: string): string {
  let md = html;

  md = md.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  md = md.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '#### $1\n\n');
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '##### $1\n\n');
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '###### $1\n\n');

  md = md.replace(/<hr\s*\/?>/gi, '\n---\n\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');

  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_match, code: string) => {
    const unescaped = code
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    return `\n\`\`\`\n${unescaped.trim()}\n\`\`\`\n\n`;
  });

  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');
  md = md.replace(/<del[^>]*>([\s\S]*?)<\/del>/gi, '~~$1~~');
  md = md.replace(/<s[^>]*>([\s\S]*?)<\/s>/gi, '~~$1~~');
  md = md.replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, '==$1==');

  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_match, inner: string) => {
    const lines = inner.trim().split('\n');
    return lines.map((l) => `> ${l.trim()}`).join('\n') + '\n\n';
  });

  md = md.replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  md = md.replace(/<a\b[^>]*href='([^']*)'[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

  md = md.replace(/<img\b[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img\b[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi, '![$1]($2)');
  md = md.replace(/<img\b[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');

  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_match, tableContent: string) => {
    const rowMatches = Array.from(tableContent.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
    if (rowMatches.length === 0) return '';

    const rows: string[][] = [];
    rowMatches.forEach((rowMatch) => {
      const cellMatches = Array.from(rowMatch[1].matchAll(/<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi));
      rows.push(cellMatches.map((cm) => cm[1].replace(/<[^>]+>/g, '').trim()));
    });

    if (rows.length === 0 || rows[0].length === 0) return '';

    const colCount = Math.max(...rows.map((r) => r.length));
    const normalizedRows = rows.map((r) => {
      const copy = [...r];
      while (copy.length < colCount) copy.push('');
      return copy;
    });

    const header = normalizedRows[0];
    const separator = header.map(() => '---');
    const body = normalizedRows.slice(1);

    let tableMd = `| ${header.join(' | ')} |\n| ${separator.join(' | ')} |\n`;
    body.forEach((bRow) => {
      tableMd += `| ${bRow.join(' | ')} |\n`;
    });
    return `\n${tableMd}\n`;
  });

  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_match, inner: string) => {
    const items = Array.from(inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi));
    return items.map((item) => `- ${item[1].trim()}`).join('\n') + '\n\n';
  });

  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_match, inner: string) => {
    const items = Array.from(inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi));
    return items.map((item, idx) => `${idx + 1}. ${item[1].trim()}`).join('\n') + '\n\n';
  });

  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<[^>]+>/g, '');

  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");

  md = md.replace(/\n{3,}/g, '\n\n');
  return md.trim();
}

function escapeCsvCell(cell: string, delimiter: string): string {
  const needsQuotes =
    cell.includes(delimiter) ||
    cell.includes('"') ||
    cell.includes('\n') ||
    cell.includes('\r');

  if (!needsQuotes) {
    return cell;
  }

  return `"${cell.replace(/"/g, '""')}"`;
}

export function jsonToCsv(jsonInput: string | unknown, delimiter = ','): string {
  let parsed: unknown = jsonInput;
  if (typeof jsonInput === 'string') {
    parsed = JSON.parse(jsonInput);
  }

  let rows: unknown[] = [];
  if (Array.isArray(parsed)) {
    rows = parsed;
  } else if (parsed && typeof parsed === 'object') {
    rows = [parsed];
  } else {
    rows = [{ value: parsed }];
  }

  if (rows.length === 0) {
    return '';
  }

  if (Array.isArray(rows[0])) {
    return rows
      .map((row) =>
        (row as unknown[])
          .map((cell) => escapeCsvCell(String(cell ?? ''), delimiter))
          .join(delimiter)
      )
      .join('\r\n');
  }

  const headerSet = new Set<string>();
  rows.forEach((row) => {
    if (row && typeof row === 'object') {
      Object.keys(row as Record<string, unknown>).forEach((key) => headerSet.add(key));
    }
  });

  const headers = Array.from(headerSet);
  if (headers.length === 0) {
    headers.push('value');
  }

  const lines: string[] = [];
  lines.push(headers.map((h) => escapeCsvCell(h, delimiter)).join(delimiter));

  rows.forEach((row) => {
    const record = (row && typeof row === 'object' ? row : { value: row }) as Record<string, unknown>;
    const lineCells = headers.map((header) => {
      const val = record[header];
      if (val === null || val === undefined) {
        return '';
      }
      if (typeof val === 'object') {
        return escapeCsvCell(JSON.stringify(val), delimiter);
      }
      return escapeCsvCell(String(val), delimiter);
    });
    lines.push(lineCells.join(delimiter));
  });

  return lines.join('\r\n');
}

export function jsonToTsv(jsonInput: string | unknown): string {
  return jsonToCsv(jsonInput, '\t');
}

function detectDelimiter(text: string): string {
  const sample = text.slice(0, 4096);
  let inQuotes = false;
  let commas = 0;
  let tabs = 0;
  let semicolons = 0;
  let pipes = 0;

  for (let i = 0; i < sample.length; i++) {
    const char = sample[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes) {
      if (char === ',') commas++;
      else if (char === '\t') tabs++;
      else if (char === ';') semicolons++;
      else if (char === '|') pipes++;
    }
  }

  const maxCount = Math.max(commas, tabs, semicolons, pipes);
  if (maxCount === 0) return ',';
  if (tabs === maxCount) return '\t';
  if (semicolons === maxCount) return ';';
  if (pipes === maxCount) return '|';
  return ',';
}

function coerceScalar(val: string): unknown {
  const trimmed = val.trim();
  if (trimmed === '') return null;
  if (trimmed.toLowerCase() === 'true') return true;
  if (trimmed.toLowerCase() === 'false') return false;
  if (trimmed.toLowerCase() === 'null') return null;
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
    const num = Number(trimmed);
    if (!Number.isNaN(num)) return num;
  }
  return val;
}

export function parseCsvRows(csvString: string, delimiter?: string): string[][] {
  const delim = delimiter ?? detectDelimiter(csvString);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  const len = csvString.length;

  while (i < len) {
    const char = csvString[i];

    if (char === '"') {
      if (!inQuotes) {
        inQuotes = true;
      } else {
        if (i + 1 < len && csvString[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      }
    } else if (!inQuotes && char === delim) {
      currentRow.push(currentField);
      currentField = '';
    } else if (!inQuotes && (char === '\r' || char === '\n')) {
      if (char === '\r' && i + 1 < len && csvString[i + 1] === '\n') {
        i++;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
    i++;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

export function csvToJson(csvString: string, delimiter?: string, options?: CsvParseOptions): Array<Record<string, unknown>> {
  const rows = parseCsvRows(csvString, delimiter ?? options?.delimiter);
  const skipEmpty = options?.skipEmptyLines ?? true;
  const shouldTrim = options?.trimFields ?? false;
  const coerce = options?.coerceTypes ?? true;

  const validRows = rows.filter((r) => {
    if (!skipEmpty) return true;
    return r.some((cell) => cell.trim() !== '');
  });

  if (validRows.length === 0) {
    return [];
  }

  let headers: string[];
  let dataRows: string[][];

  if (options?.headers && options.headers.length > 0) {
    headers = options.headers;
    dataRows = validRows;
  } else {
    headers = validRows[0].map((h, idx) => {
      const base = h.trim();
      return base.length > 0 ? base : `column_${idx + 1}`;
    });
    dataRows = validRows.slice(1);
  }

  const result: Array<Record<string, unknown>> = [];

  dataRows.forEach((row) => {
    const item: Record<string, unknown> = {};
    headers.forEach((header, colIdx) => {
      let cell = row[colIdx] ?? '';
      if (shouldTrim) cell = cell.trim();
      item[header] = coerce ? coerceScalar(cell) : cell;
    });
    result.push(item);
  });

  return result;
}

export function tsvToJson(tsvString: string, options?: CsvParseOptions): Array<Record<string, unknown>> {
  return csvToJson(tsvString, '\t', options);
}

function decodePdfToken(tok: string): string {
  if (tok.startsWith('<') && tok.endsWith('>')) {
    const hex = tok.slice(1, -1).replace(/\s/g, '');
    if (hex.length % 2 !== 0) return '';
    const byteArr = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      byteArr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    if (byteArr.length >= 2 && byteArr[0] === 0xfe && byteArr[1] === 0xff) {
      return new TextDecoder('utf-16be', { fatal: false }).decode(byteArr.slice(2));
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(byteArr);
  }
  if (tok.startsWith('(') && tok.endsWith(')')) {
    return tok
      .slice(1, -1)
      .replace(/\\([0-7]{1,3})/g, (_m, oct: string) => String.fromCharCode(parseInt(oct, 8)))
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\');
  }
  return tok;
}

function extractTextFromStream(streamStr: string): string {
  const lines: string[] = [];
  const btBlocks = streamStr.match(/BT[\s\S]*?ET/g);
  const blocksToProcess = btBlocks && btBlocks.length > 0 ? btBlocks : [streamStr];

  for (const block of blocksToProcess) {
    let currentLine = '';
    const opRegex = /(?:\[([\s\S]*?)\]\s*TJ)|(?:(<[0-9a-fA-F\s]+>|\([^)\\]*(?:\\.[^)\\]*)*\))\s*(?:Tj|'|"))|(T\*|T[dD]|Tm)/g;
    let match: RegExpExecArray | null;

    while ((match = opRegex.exec(block)) !== null) {
      if (match[1] !== undefined) {
        const arrayContent = match[1];
        const itemRegex = /(<[0-9a-fA-F\s]+>|\([^)\\]*(?:\\.[^)\\]*)*\)|-?\d+(?:\.\d+)?)/g;
        let itemMatch: RegExpExecArray | null;
        while ((itemMatch = itemRegex.exec(arrayContent)) !== null) {
          const item = itemMatch[1];
          if (item.startsWith('<') || item.startsWith('(')) {
            currentLine += decodePdfToken(item);
          } else {
            const spacing = parseFloat(item);
            if (spacing < -150) {
              currentLine += ' ';
            }
          }
        }
      } else if (match[2] !== undefined) {
        currentLine += decodePdfToken(match[2]);
      } else if (match[3] !== undefined) {
        if (currentLine.trim().length > 0) {
          lines.push(currentLine.trim());
          currentLine = '';
        }
      }
    }

    if (currentLine.trim().length > 0) {
      lines.push(currentLine.trim());
    }
  }

  return lines.join('\n');
}

export async function extractTextFromPdf(pdfBytes: Uint8Array | ArrayBuffer): Promise<ExtractedPdfResult> {
  const bytes = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();
  const pages: ExtractedPdfPage[] = [];

  for (let i = 0; i < totalPages; i++) {
    const page = doc.getPage(i);
    const contents = page.node.Contents();
    const refs = contents instanceof PDFArray ? contents.asArray() : (contents ? [contents] : []);
    const pageLines: string[] = [];

    for (const ref of refs) {
      const stream = doc.context.lookup(ref);
      if (stream instanceof PDFRawStream) {
        const rawBytes = stream.asUint8Array();
        let decompressedBytes = rawBytes;
        try {
          decompressedBytes = fflate.unzlibSync(rawBytes);
        } catch {
          try {
            decompressedBytes = fflate.inflateSync(rawBytes);
          } catch {
            decompressedBytes = rawBytes;
          }
        }
        const streamStr = new TextDecoder('utf-8', { fatal: false }).decode(decompressedBytes);
        const extracted = extractTextFromStream(streamStr);
        if (extracted.trim().length > 0) {
          pageLines.push(extracted.trim());
        }
      }
    }

    let pageText = pageLines.join('\n').trim();
    if (pageText.length === 0) {
      pageText = `[Page ${i + 1}]`;
    }

    pages.push({
      pageNumber: i + 1,
      text: pageText,
    });
  }

  const allText = pages.map((p) => p.text).filter((t) => t.length > 0).join('\n\n');

  return {
    text: allText,
    pages,
    totalPages,
  };
}

function pdfPagesToHtml(extracted: ExtractedPdfResult, title: string): string {
  const pagesHtml = extracted.pages
    .map((p) => {
      const escaped = escapeHtml(p.text);
      const paragraphs = escaped
        .split(/\n\s*\n/)
        .map((para) => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
        .join('');
      return `<section class="pdf-page" data-page="${p.pageNumber}"><header class="page-header">Page ${p.pageNumber}</header>${paragraphs}</section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="utf-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${escapeHtml(title)}</title>\n  <style>\n    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; color: #1e293b; background: #ffffff; }\n    .pdf-page { margin-bottom: 2.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid #e2e8f0; }\n    .page-header { font-size: 0.875rem; font-weight: 600; color: #64748b; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.05em; }\n    p { margin-bottom: 1rem; }\n  </style>\n</head>\n<body>\n  <h1>${escapeHtml(title)}</h1>\n${pagesHtml}\n</body>\n</html>`;
}

function pdfPagesToMarkdown(extracted: ExtractedPdfResult, title: string): string {
  const parts: string[] = [`# ${title}\n`];
  extracted.pages.forEach((p, idx) => {
    if (idx > 0) {
      parts.push('\n---\n');
    }
    parts.push(`## Page ${p.pageNumber}\n\n${p.text}`);
  });
  return parts.join('\n');
}

function pdfPagesToCsv(extracted: ExtractedPdfResult, delimiter = ','): string {
  const headers = ['pageNumber', 'text'].map((h) => escapeCsvCell(h, delimiter)).join(delimiter);
  const rows = extracted.pages.map((p) => {
    return [escapeCsvCell(String(p.pageNumber), delimiter), escapeCsvCell(p.text, delimiter)].join(delimiter);
  });
  return [headers, ...rows].join('\r\n');
}

function createMinimalPng(width = 1, height = 1): Uint8Array {
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  function createChunk(type: string, data: Uint8Array): Uint8Array {
    const len = data.length;
    const buf = new Uint8Array(4 + 4 + len + 4);
    const view = new DataView(buf.buffer);
    view.setUint32(0, len);
    for (let i = 0; i < 4; i++) buf[4 + i] = type.charCodeAt(i);
    buf.set(data, 8);

    let crc = 0xffffffff;
    for (let i = 4; i < 8 + len; i++) {
      let c = (crc ^ buf[i]) & 0xff;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crc = (crc >>> 8) ^ c;
    }
    crc ^= 0xffffffff;
    view.setUint32(8 + len, crc);
    return buf;
  }

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = createChunk('IHDR', ihdr);

  const rawData = new Uint8Array((1 + width * 3) * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 3);
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      rawData[rowOffset + 1 + x * 3] = 255;
      rawData[rowOffset + 1 + x * 3 + 1] = 255;
      rawData[rowOffset + 1 + x * 3 + 2] = 255;
    }
  }

  const compressed = fflate.zlibSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', new Uint8Array(0));

  const fullPng = new Uint8Array(signature.length + ihdrChunk.length + idatChunk.length + iendChunk.length);
  let offset = 0;
  fullPng.set(signature, offset);
  offset += signature.length;
  fullPng.set(ihdrChunk, offset);
  offset += ihdrChunk.length;
  fullPng.set(idatChunk, offset);
  offset += idatChunk.length;
  fullPng.set(iendChunk, offset);

  return fullPng;
}

export async function documentToPng(
  content: string | Uint8Array | ArrayBuffer,
  options?: { sourceFormat?: DocumentFormat; fileName?: string }
): Promise<Uint8Array> {
  let text = '';
  const isPdf =
    options?.sourceFormat === 'pdf' ||
    (content instanceof Uint8Array &&
      content.length >= 4 &&
      content[0] === 0x25 &&
      content[1] === 0x50 &&
      content[2] === 0x44 &&
      content[3] === 0x46);

  if (isPdf) {
    const extracted = await extractTextFromPdf(content instanceof Uint8Array ? content : new Uint8Array(content as ArrayBuffer));
    text = extracted.text || (options?.fileName ?? 'PDF Document');
  } else if (typeof content === 'string') {
    text = content;
  } else {
    text = new TextDecoder('utf-8', { fatal: false }).decode(content instanceof Uint8Array ? content : new Uint8Array(content));
  }

  const canUseCanvas =
    typeof OffscreenCanvas !== 'undefined' ||
    (typeof document !== 'undefined' && typeof document.createElement === 'function');

  if (canUseCanvas) {
    const width = 800;
    const height = 1132;
    const isRtl = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);

    if (typeof OffscreenCanvas !== 'undefined') {
      const offscreen = new OffscreenCanvas(width, height);
      const ctx = offscreen.getContext('2d') as OffscreenCanvasRenderingContext2D | null;
      if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Vazirmatn", "Tahoma", sans-serif';
      ctx.textAlign = isRtl ? 'right' : 'left';
      ctx.direction = isRtl ? 'rtl' : 'ltr';
      ctx.fillText(options?.fileName ?? 'Document', isRtl ? width - 40 : 40, 50);

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, 65);
      ctx.lineTo(width - 40, 65);
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Vazirmatn", "Tahoma", sans-serif';
      const lines = text.split('\n').slice(0, 45);
      let y = 95;
      for (const line of lines) {
        ctx.fillText(line.slice(0, 80), isRtl ? width - 40 : 40, y);
        y += 22;
      }

      const blob = await offscreen.convertToBlob({ type: 'image/png' });
      return new Uint8Array(await blob.arrayBuffer());
    } else {
      const domCanvas = document.createElement('canvas');
      domCanvas.width = width;
      domCanvas.height = height;
      const ctx = domCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Vazirmatn", "Tahoma", sans-serif';
      ctx.textAlign = isRtl ? 'right' : 'left';
      ctx.direction = isRtl ? 'rtl' : 'ltr';
      ctx.fillText(options?.fileName ?? 'Document', isRtl ? width - 40 : 40, 50);

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, 65);
      ctx.lineTo(width - 40, 65);
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Vazirmatn", "Tahoma", sans-serif';
      const lines = text.split('\n').slice(0, 45);
      let y = 95;
      for (const line of lines) {
        ctx.fillText(line.slice(0, 80), isRtl ? width - 40 : 40, y);
        y += 22;
      }

      const dataUrl = domCanvas.toDataURL('image/png');
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      const binaryString = atob(base64Data);
      const pngBytes = new Uint8Array(binaryString.length);
      for (let k = 0; k < binaryString.length; k++) {
        pngBytes[k] = binaryString.charCodeAt(k);
      }
      return pngBytes;
    }
  }

  return createMinimalPng(100, 100);
}

function sanitizeForStandardFont(text: string): string {
  return text.replace(/[^\u0000-\u00FF]/g, (char) => {
    const code = char.charCodeAt(0);
    return `[U+${code.toString(16).toUpperCase()}]`;
  });
}

async function renderDocumentViaCanvasToPdf(
  textContent: string,
  options?: DocumentPdfOptions
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const pageSizeOpt = options?.pageSize ?? 'a4';
  const orientation = options?.orientation ?? 'portrait';
  const margin = options?.margin ?? 45;

  const a4Dimensions = { width: 595.28, height: 841.89 };
  const letterDimensions = { width: 612, height: 792 };
  const standard = pageSizeOpt === 'letter' ? letterDimensions : a4Dimensions;

  const isLandscape = orientation === 'landscape';
  const pageWidth = isLandscape ? Math.max(standard.width, standard.height) : Math.min(standard.width, standard.height);
  const pageHeight = isLandscape ? Math.min(standard.width, standard.height) : Math.max(standard.width, standard.height);

  const scale = 2;
  const canvasWidth = Math.round(pageWidth * scale);
  const canvasHeight = Math.round(pageHeight * scale);
  const usableWidth = pageWidth - margin * 2;

  const lines = textContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const isRtl = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(textContent);

  interface CanvasPage {
    draw: (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => void;
  }

  const canvasPages: CanvasPage[] = [];
  let currentCommands: ((ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => void)[] = [];
  let currentY = margin + 20;

  const startNewPage = () => {
    if (currentCommands.length > 0) {
      const cmds = [...currentCommands];
      canvasPages.push({
        draw: (ctx) => {
          for (const cmd of cmds) cmd(ctx);
        },
      });
      currentCommands = [];
    }
    currentY = margin + 20;
  };

  const measureTextWidth = (text: string, fontSize: number): number => {
    return text.length * (fontSize * 0.55);
  };

  const wrapCanvasText = (text: string, fontSize: number, maxWidth: number): string[] => {
    const words = text.split(/\s+/);
    const resultLines: string[] = [];
    let line = '';

    for (const w of words) {
      const test = line.length > 0 ? `${line} ${w}` : w;
      if (measureTextWidth(test, fontSize) <= maxWidth) {
        line = test;
      } else {
        if (line.length > 0) resultLines.push(line);
        line = w;
      }
    }
    if (line.length > 0) resultLines.push(line);
    return resultLines.length > 0 ? resultLines : [''];
  };

  if (options?.title) {
    const titleText = options.title;
    currentCommands.push((ctx) => {
      ctx.fillStyle = '#64748b';
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Vazirmatn", "Tahoma", sans-serif';
      ctx.textAlign = isRtl ? 'right' : 'left';
      ctx.fillText(titleText, isRtl ? pageWidth - margin : margin, margin / 2 + 10);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(margin, margin / 2 + 16);
      ctx.lineTo(pageWidth - margin, margin / 2 + 16);
      ctx.stroke();
    });
  }

  for (const rawLine of lines) {
    if (rawLine.trim() === '') {
      currentY += 12;
      continue;
    }

    const headingMatch = rawLine.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const hText = headingMatch[2].trim();
      const hSize = level === 1 ? 20 : level === 2 ? 16 : 13;
      const leading = hSize * 1.35;
      const wrapped = wrapCanvasText(hText, hSize, usableWidth);

      if (currentY + wrapped.length * leading > pageHeight - margin) {
        startNewPage();
      }

      currentY += 8;
      for (const wLine of wrapped) {
        const lineY = currentY + hSize;
        const lineText = wLine;
        currentCommands.push((ctx) => {
          ctx.fillStyle = '#0f172a';
          ctx.font = `bold ${hSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Vazirmatn", "Tahoma", sans-serif`;
          ctx.textAlign = isRtl ? 'right' : 'left';
          ctx.direction = isRtl ? 'rtl' : 'ltr';
          ctx.fillText(lineText, isRtl ? pageWidth - margin : margin, lineY);
        });
        currentY += leading;
      }
      currentY += 6;
      continue;
    }

    const bodySize = 11;
    const leading = 16;
    const wrapped = wrapCanvasText(rawLine, bodySize, usableWidth);

    if (currentY + wrapped.length * leading > pageHeight - margin) {
      startNewPage();
    }

    for (const bLine of wrapped) {
      const lineY = currentY + bodySize;
      const lineText = bLine;
      currentCommands.push((ctx) => {
        ctx.fillStyle = '#1e293b';
        ctx.font = `${bodySize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Vazirmatn", "Tahoma", sans-serif`;
        ctx.textAlign = isRtl ? 'right' : 'left';
        ctx.direction = isRtl ? 'rtl' : 'ltr';
        ctx.fillText(lineText, isRtl ? pageWidth - margin : margin, lineY);
      });
      currentY += leading;
    }
  }

  if (currentCommands.length > 0) {
    const cmds = [...currentCommands];
    canvasPages.push({
      draw: (ctx) => {
        for (const cmd of cmds) cmd(ctx);
      },
    });
  }

  if (canvasPages.length === 0) {
    canvasPages.push({ draw: () => {} });
  }

  for (let pageIdx = 0; pageIdx < canvasPages.length; pageIdx++) {
    const p = canvasPages[pageIdx];
    let pngBytes: Uint8Array;

    if (typeof OffscreenCanvas !== 'undefined') {
      const offscreen = new OffscreenCanvas(canvasWidth, canvasHeight);
      const ctx = offscreen.getContext('2d') as OffscreenCanvasRenderingContext2D | null;
      if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.scale(scale, scale);
      p.draw(ctx);
      if (options?.includePageNumbers !== false) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Page ${pageIdx + 1} of ${canvasPages.length}`, pageWidth / 2, pageHeight - margin / 2);
      }
      const blob = await offscreen.convertToBlob({ type: 'image/png' });
      pngBytes = new Uint8Array(await blob.arrayBuffer());
    } else {
      const domCanvas = document.createElement('canvas');
      domCanvas.width = canvasWidth;
      domCanvas.height = canvasHeight;
      const ctx = domCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.scale(scale, scale);
      p.draw(ctx);
      if (options?.includePageNumbers !== false) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Page ${pageIdx + 1} of ${canvasPages.length}`, pageWidth / 2, pageHeight - margin / 2);
      }
      const dataUrl = domCanvas.toDataURL('image/png');
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      const binaryString = atob(base64Data);
      pngBytes = new Uint8Array(binaryString.length);
      for (let k = 0; k < binaryString.length; k++) {
        pngBytes[k] = binaryString.charCodeAt(k);
      }
    }

    const embeddedPng = await doc.embedPng(pngBytes);
    const pdfPage = doc.addPage([pageWidth, pageHeight]);
    pdfPage.drawImage(embeddedPng, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });
  }

  return await doc.save();
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const safe = sanitizeForStandardFont(text);
  const words = safe.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!word) continue;
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
        let piece = '';
        for (let i = 0; i < word.length; i++) {
          const char = word[i];
          if (font.widthOfTextAtSize(piece + char, fontSize) <= maxWidth) {
            piece += char;
          } else {
            lines.push(piece);
            piece = char;
          }
        }
        currentLine = piece;
      } else {
        currentLine = word;
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export async function documentToPdf(textContent: string, options?: DocumentPdfOptions): Promise<Uint8Array> {
  const hasNonWinAnsi = /[^\u0000-\u00FF]/.test(textContent);
  const canUseCanvas =
    typeof OffscreenCanvas !== 'undefined' ||
    (typeof document !== 'undefined' && typeof document.createElement === 'function');

  if (hasNonWinAnsi && canUseCanvas) {
    return await renderDocumentViaCanvasToPdf(textContent, options);
  }

  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);
  const fontMono = await doc.embedFont(StandardFonts.Courier);

  const pageSizeOpt = options?.pageSize ?? 'a4';
  const orientation = options?.orientation ?? 'portrait';
  const margin = options?.margin ?? 45;
  const includePageNumbers = options?.includePageNumbers ?? true;

  const a4Dimensions = { width: 595.28, height: 841.89 };
  const letterDimensions = { width: 612, height: 792 };
  const standard = pageSizeOpt === 'letter' ? letterDimensions : a4Dimensions;

  const isLandscape = orientation === 'landscape';
  const pageWidth = isLandscape ? Math.max(standard.width, standard.height) : Math.min(standard.width, standard.height);
  const pageHeight = isLandscape ? Math.min(standard.width, standard.height) : Math.max(standard.width, standard.height);

  const usableWidth = pageWidth - margin * 2;
  const pages: PDFPage[] = [];

  let currentPage = doc.addPage([pageWidth, pageHeight]);
  pages.push(currentPage);

  let currentY = pageHeight - margin;

  const ensureSpace = (neededHeight: number): void => {
    if (currentY - neededHeight < margin) {
      currentPage = doc.addPage([pageWidth, pageHeight]);
      pages.push(currentPage);
      currentY = pageHeight - margin;
    }
  };

  if (options?.title) {
    const safeTitle = sanitizeForStandardFont(options.title);
    currentPage.drawText(safeTitle, {
      x: margin,
      y: pageHeight - margin / 2,
      size: 8,
      font: fontRegular,
      color: grayscale(0.5),
    });
    currentPage.drawLine({
      start: { x: margin, y: pageHeight - margin / 2 - 4 },
      end: { x: pageWidth - margin, y: pageHeight - margin / 2 - 4 },
      thickness: 0.5,
      color: grayscale(0.8),
    });
  }

  const lines = textContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let idx = 0;
  const totalLines = lines.length;

  while (idx < totalLines) {
    const rawLine = lines[idx];

    if (rawLine.trim() === '') {
      currentY -= 8;
      idx++;
      continue;
    }

    if (rawLine.trim().startsWith('```')) {
      const codeLines: string[] = [];
      idx++;
      while (idx < totalLines && !lines[idx].trim().startsWith('```')) {
        codeLines.push(lines[idx]);
        idx++;
      }
      if (idx < totalLines) idx++;

      const codeFontSize = 8.5;
      const codeLeading = 11;
      const boxPadding = 6;
      const totalCodeHeight = codeLines.length * codeLeading + boxPadding * 2;

      ensureSpace(Math.min(totalCodeHeight, 150));

      currentPage.drawRectangle({
        x: margin,
        y: currentY - totalCodeHeight + boxPadding,
        width: usableWidth,
        height: totalCodeHeight,
        color: rgb(0.96, 0.96, 0.97),
        borderColor: rgb(0.85, 0.85, 0.88),
        borderWidth: 0.5,
      });

      let codeY = currentY - boxPadding;
      for (const cLine of codeLines) {
        if (codeY < margin + boxPadding) {
          currentPage = doc.addPage([pageWidth, pageHeight]);
          pages.push(currentPage);
          codeY = pageHeight - margin - boxPadding;
        }
        currentPage.drawText(sanitizeForStandardFont(cLine.slice(0, 100)), {
          x: margin + boxPadding,
          y: codeY - codeFontSize,
          size: codeFontSize,
          font: fontMono,
          color: rgb(0.15, 0.15, 0.2),
        });
        codeY -= codeLeading;
      }

      currentY -= totalCodeHeight + 10;
      continue;
    }

    const headingMatch = rawLine.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();

      const config =
        level === 1
          ? { size: 18, leading: 24, before: 14, after: 6 }
          : level === 2
          ? { size: 14, leading: 19, before: 11, after: 5 }
          : level === 3
          ? { size: 12, leading: 16, before: 9, after: 4 }
          : { size: 10.5, leading: 14, before: 7, after: 3 };

      const wrapped = wrapText(text, fontBold, config.size, usableWidth);
      ensureSpace(config.before + wrapped.length * config.leading + config.after);

      currentY -= config.before;
      for (const wLine of wrapped) {
        currentPage.drawText(sanitizeForStandardFont(wLine), {
          x: margin,
          y: currentY - config.size,
          size: config.size,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.15),
        });
        currentY -= config.leading;
      }
      currentY -= config.after;
      idx++;
      continue;
    }

    if (/^(?:---|\*\*\*|___)\s*$/.test(rawLine.trim())) {
      ensureSpace(16);
      currentY -= 6;
      currentPage.drawLine({
        start: { x: margin, y: currentY },
        end: { x: pageWidth - margin, y: currentY },
        thickness: 0.75,
        color: grayscale(0.8),
      });
      currentY -= 10;
      idx++;
      continue;
    }

    if (rawLine.trim().startsWith('>')) {
      const quoteText = rawLine.replace(/^\s*>\s?/, '').trim();
      const wrapped = wrapText(quoteText, fontOblique, 9.5, usableWidth - 20);
      ensureSpace(wrapped.length * 14 + 10);

      const quoteHeight = wrapped.length * 14 + 4;
      currentPage.drawLine({
        start: { x: margin + 4, y: currentY },
        end: { x: margin + 4, y: currentY - quoteHeight },
        thickness: 2.5,
        color: rgb(0.06, 0.71, 0.83),
      });

      for (const qLine of wrapped) {
        currentPage.drawText(sanitizeForStandardFont(qLine), {
          x: margin + 15,
          y: currentY - 9.5,
          size: 9.5,
          font: fontOblique,
          color: rgb(0.3, 0.35, 0.4),
        });
        currentY -= 14;
      }
      currentY -= 6;
      idx++;
      continue;
    }

    const bulletMatch = rawLine.match(/^(\s*)([*+-]|\d+\.)\s+(.+)$/);
    if (bulletMatch) {
      const isNumbered = /^\d+\./.test(bulletMatch[2]);
      const prefix = isNumbered ? bulletMatch[2] : '•';
      const text = bulletMatch[3].trim();
      const indent = 15;
      const wrapped = wrapText(text, fontRegular, 9.5, usableWidth - indent);
      ensureSpace(wrapped.length * 13 + 4);

      currentPage.drawText(prefix, {
        x: margin,
        y: currentY - 9.5,
        size: 9.5,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.25),
      });

      wrapped.forEach((bLine) => {
        currentPage.drawText(sanitizeForStandardFont(bLine), {
          x: margin + indent,
          y: currentY - 9.5,
          size: 9.5,
          font: fontRegular,
          color: rgb(0.15, 0.15, 0.2),
        });
        currentY -= 13;
      });

      currentY -= 2;
      idx++;
      continue;
    }

    const wrapped = wrapText(rawLine, fontRegular, 9.5, usableWidth);
    ensureSpace(wrapped.length * 13.5 + 4);

    for (const pLine of wrapped) {
      currentPage.drawText(sanitizeForStandardFont(pLine), {
        x: margin,
        y: currentY - 9.5,
        size: 9.5,
        font: fontRegular,
        color: rgb(0.15, 0.15, 0.2),
      });
      currentY -= 13.5;
    }
    currentY -= 4;
    idx++;
  }

  if (includePageNumbers) {
    const totalPages = pages.length;
    pages.forEach((page, pageIdx) => {
      const footerText = `Page ${pageIdx + 1} of ${totalPages}`;
      const textWidth = fontRegular.widthOfTextAtSize(footerText, 8.5);
      page.drawText(footerText, {
        x: (pageWidth - textWidth) / 2,
        y: margin / 2,
        size: 8.5,
        font: fontRegular,
        color: grayscale(0.5),
      });
    });
  }

  return await doc.save();
}

export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  let binary = '';
  const chunkSize = 8192;
  const len = bytes.length;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }

  return btoa(binary);
}

export function base64ToBuffer(base64: string): Uint8Array {
  let cleaned = base64.replace(/^data:[^;]+;base64,/, '').trim();
  cleaned = cleaned.replace(/-/g, '+').replace(/_/g, '/');

  while (cleaned.length % 4 !== 0) {
    cleaned += '=';
  }

  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(cleaned, 'base64'));
  }

  const binary = atob(cleaned);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function textToBase64(text: string): string {
  const encoder = new TextEncoder();
  return bufferToBase64(encoder.encode(text));
}

export function base64ToText(base64: string): string {
  const buffer = base64ToBuffer(base64);
  const decoder = new TextDecoder('utf-8', { fatal: false });
  return decoder.decode(buffer);
}

export function bufferToHex(buffer: ArrayBuffer | Uint8Array, separator = ''): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const hexParts: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    hexParts.push(bytes[i].toString(16).padStart(2, '0'));
  }
  return hexParts.join(separator);
}

export function hexToBuffer(hexString: string): Uint8Array {
  let cleaned = hexString.replace(/^0x/i, '').replace(/[\s:-]/g, '');
  if (cleaned.length % 2 !== 0) {
    cleaned = '0' + cleaned;
  }

  if (!/^[0-9a-fA-F]*$/.test(cleaned)) {
    throw new Error('Invalid hexadecimal string');
  }

  const byteLength = cleaned.length / 2;
  const bytes = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i++) {
    bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function textToHex(text: string, separator = ''): string {
  const encoder = new TextEncoder();
  return bufferToHex(encoder.encode(text), separator);
}

export function hexToText(hexString: string): string {
  const buffer = hexToBuffer(hexString);
  const decoder = new TextDecoder('utf-8', { fatal: false });
  return decoder.decode(buffer);
}

export function sortObjectKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    for (const key of keys) {
      sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return obj;
}

export function jsonToXml(obj: unknown, rootTag = 'root'): string {
  function serialize(val: unknown, tag: string): string {
    if (val === null || val === undefined) {
      return `<${tag} />`;
    }
    if (Array.isArray(val)) {
      return val.map((item) => serialize(item, 'item')).join('');
    }
    if (typeof val === 'object') {
      const inner = Object.entries(val as Record<string, unknown>)
        .map(([k, v]) => serialize(v, k.replace(/[^a-zA-Z0-9_-]/g, '_')))
        .join('');
      return `<${tag}>${inner}</${tag}>`;
    }
    return `<${tag}>${escapeHtml(String(val))}</${tag}>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n${serialize(obj, rootTag)}`;
}

export function xmlToJson(xmlString: string): unknown {
  const clean = xmlString.replace(/<\?xml[^>]*\?>/gi, '').trim();
  const tagRegex = /<([a-zA-Z0-9_-]+)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>|<([a-zA-Z0-9_-]+)(?:\s+[^>]*)?\/>/g;
  const result: Record<string, unknown> = {};
  let match: RegExpExecArray | null;
  let hasMatches = false;

  while ((match = tagRegex.exec(clean)) !== null) {
    hasMatches = true;
    const tagName = match[1] || match[3];
    const content = match[2] !== undefined ? match[2].trim() : '';

    let parsedVal: unknown;
    if (/<[a-zA-Z0-9_-]+/.test(content)) {
      parsedVal = xmlToJson(content);
    } else {
      parsedVal = coerceScalar(content);
    }

    if (result[tagName] !== undefined) {
      if (Array.isArray(result[tagName])) {
        (result[tagName] as unknown[]).push(parsedVal);
      } else {
        result[tagName] = [result[tagName], parsedVal];
      }
    } else {
      result[tagName] = parsedVal;
    }
  }

  if (!hasMatches) {
    return clean ? coerceScalar(clean) : null;
  }

  return result;
}

export function jsonToYaml(obj: unknown, indent = 0): string {
  const pad = ' '.repeat(indent);
  if (obj === null || obj === undefined) {
    return 'null\n';
  }
  if (typeof obj !== 'object') {
    const str = String(obj);
    if (typeof obj === 'string' && (str.includes(':') || str.includes('\n') || str.includes('#'))) {
      return `"${str.replace(/"/g, '\\"')}"\n`;
    }
    return `${str}\n`;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]\n';
    return obj
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          const itemYaml = jsonToYaml(item, indent + 2).trimStart();
          return `${pad}- ${itemYaml}`;
        }
        return `${pad}- ${jsonToYaml(item, 0)}`;
      })
      .join('');
  }
  const entries = Object.entries(obj as Record<string, unknown>);
  if (entries.length === 0) return '{}\n';
  return entries
    .map(([key, val]) => {
      const safeKey = /^[a-zA-Z0-9_]+$/.test(key) ? key : `"${key}"`;
      if (typeof val === 'object' && val !== null) {
        if (Array.isArray(val) && val.length === 0) return `${pad}${safeKey}: []\n`;
        if (!Array.isArray(val) && Object.keys(val).length === 0) return `${pad}${safeKey}: {}\n`;
        return `${pad}${safeKey}:\n${jsonToYaml(val, indent + 2)}`;
      }
      return `${pad}${safeKey}: ${jsonToYaml(val, 0)}`;
    })
    .join('');
}

export function yamlToJson(yamlString: string): unknown {
  const lines = yamlString.split('\n').filter((l) => l.trim().length > 0 && !l.trim().startsWith('#'));
  if (lines.length === 0) return {};

  const rootObj: Record<string, unknown> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx !== -1) {
      const key = trimmed.slice(0, colonIdx).trim().replace(/^["']|["']$/g, '');
      const rawVal = trimmed.slice(colonIdx + 1).trim();
      if (rawVal.length > 0) {
        rootObj[key] = coerceScalar(rawVal);
      }
    }
  }
  return Object.keys(rootObj).length > 0 ? rootObj : yamlString.trim();
}

export async function convertDocument(
  input: string | ArrayBuffer | Uint8Array,
  options: DocumentConvertOptions
): Promise<DocumentConvertResult> {
  const target = options.targetFormat.toLowerCase() as DocumentFormat;
  const source = (options.sourceFormat?.toLowerCase() as DocumentFormat) ?? 'txt';
  const baseName = options.fileName ? options.fileName.replace(/\.[^/.]+$/, '') : 'converted_document';

  let textContent = '';
  let binaryBuffer: Uint8Array | null = null;

  if (typeof input === 'string') {
    textContent = input;
  } else {
    binaryBuffer = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (source !== 'pdf') {
      const decoder = new TextDecoder('utf-8', { fatal: false });
      textContent = decoder.decode(binaryBuffer);
    }
  }

  if (source === 'pdf') {
    const pdfBytes = binaryBuffer ?? new TextEncoder().encode(textContent);

    if (target === 'pdf') {
      const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const newDoc = await PDFDocument.create();
      const pageIndices = srcDoc.getPageIndices();
      const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
      for (const page of copiedPages) {
        if (options.pdfOrientation === 'landscape' && page.getWidth() < page.getHeight()) {
          page.setRotation(degrees(90));
        } else if (options.pdfOrientation === 'portrait' && page.getWidth() > page.getHeight()) {
          page.setRotation(degrees(0));
        }
        newDoc.addPage(page);
      }
      const outBytes = await newDoc.save();
      return {
        data: outBytes,
        mimeType: 'application/pdf',
        fileName: `${baseName}.pdf`,
        byteLength: outBytes.byteLength,
      };
    }

    if (target === 'png') {
      const pngBytes = await documentToPng(pdfBytes, { sourceFormat: 'pdf', fileName: options.fileName });
      return {
        data: pngBytes,
        mimeType: 'image/png',
        fileName: `${baseName}.png`,
        byteLength: pngBytes.byteLength,
      };
    }

    const extracted = await extractTextFromPdf(pdfBytes);

    if (target === 'txt') {
      return {
        data: extracted.text,
        mimeType: 'text/plain;charset=utf-8',
        fileName: `${baseName}.txt`,
        byteLength: new TextEncoder().encode(extracted.text).byteLength,
      };
    }

    if (target === 'html') {
      const htmlOutput = pdfPagesToHtml(extracted, baseName);
      return {
        data: htmlOutput,
        mimeType: 'text/html;charset=utf-8',
        fileName: `${baseName}.html`,
        byteLength: new TextEncoder().encode(htmlOutput).byteLength,
      };
    }

    if (target === 'markdown' || target === 'md') {
      const mdOutput = pdfPagesToMarkdown(extracted, baseName);
      return {
        data: mdOutput,
        mimeType: 'text/markdown;charset=utf-8',
        fileName: `${baseName}.md`,
        byteLength: new TextEncoder().encode(mdOutput).byteLength,
      };
    }

    if (target === 'json') {
      const indent = typeof options.jsonIndent === 'number' ? options.jsonIndent : (options.prettyJson !== false ? 2 : 0);
      const jsonObj = {
        fileName: options.fileName ?? `${baseName}.pdf`,
        totalPages: extracted.totalPages,
        pages: extracted.pages,
      };
      const formatted = indent > 0 ? JSON.stringify(jsonObj, null, indent) : JSON.stringify(jsonObj);
      return {
        data: formatted,
        mimeType: 'application/json;charset=utf-8',
        fileName: `${baseName}.json`,
        byteLength: new TextEncoder().encode(formatted).byteLength,
      };
    }

    if (target === 'csv' || target === 'tsv') {
      const csvOutput = pdfPagesToCsv(extracted, target === 'tsv' ? '\t' : (options.delimiter ?? ','));
      return {
        data: csvOutput,
        mimeType: target === 'tsv' ? 'text/tab-separated-values;charset=utf-8' : 'text/csv;charset=utf-8',
        fileName: `${baseName}.${target}`,
        byteLength: new TextEncoder().encode(csvOutput).byteLength,
      };
    }

    return {
      data: extracted.text,
      mimeType: 'text/plain;charset=utf-8',
      fileName: `${baseName}.txt`,
      byteLength: new TextEncoder().encode(extracted.text).byteLength,
    };
  }

  if (target === 'png') {
    const pngBytes = await documentToPng(binaryBuffer ?? textContent, { sourceFormat: source, fileName: options.fileName });
    return {
      data: pngBytes,
      mimeType: 'image/png',
      fileName: `${baseName}.png`,
      byteLength: pngBytes.byteLength,
    };
  }

  if (target === 'pdf') {
    const pdfBytes = await documentToPdf(textContent, {
      pageSize: options.pdfPageSize,
      orientation: options.pdfOrientation,
      margin: options.pdfMargin,
      includePageNumbers: options.includePageNumbers,
      title: options.title,
    });
    return {
      data: pdfBytes,
      mimeType: 'application/pdf',
      fileName: `${baseName}.pdf`,
      byteLength: pdfBytes.byteLength,
    };
  }

  if (target === 'base64') {
    const encoded = binaryBuffer ? bufferToBase64(binaryBuffer) : textToBase64(textContent);
    return {
      data: encoded,
      mimeType: 'text/plain;charset=utf-8',
      fileName: `${baseName}_base64.txt`,
      byteLength: new TextEncoder().encode(encoded).byteLength,
    };
  }

  if (target === 'hex') {
    const encoded = binaryBuffer ? bufferToHex(binaryBuffer) : textToHex(textContent);
    return {
      data: encoded,
      mimeType: 'text/plain;charset=utf-8',
      fileName: `${baseName}_hex.txt`,
      byteLength: new TextEncoder().encode(encoded).byteLength,
    };
  }

  if (target === 'html') {
    let resultHtml = '';
    if (source === 'markdown' || source === 'md') {
      resultHtml = markdownToHtml(textContent);
    } else if (source === 'json') {
      const csv = jsonToCsv(textContent);
      const rows = parseCsvRows(csv);
      if (rows.length > 0) {
        let t = '<table class="doc-table"><thead><tr>';
        rows[0].forEach((h) => (t += `<th>${escapeHtml(h)}</th>`));
        t += '</tr></thead><tbody>';
        rows.slice(1).forEach((r) => {
          t += '<tr>';
          r.forEach((c) => (t += `<td>${escapeHtml(c)}</td>`));
          t += '</tr>';
        });
        t += '</tbody></table>';
        resultHtml = sanitizeHtml(t);
      } else {
        resultHtml = `<pre><code>${escapeHtml(textContent)}</code></pre>`;
      }
    } else if (source === 'csv' || source === 'tsv') {
      const delim = source === 'tsv' ? '\t' : undefined;
      const rows = parseCsvRows(textContent, delim);
      if (rows.length > 0) {
        let t = '<table class="doc-table"><thead><tr>';
        rows[0].forEach((h) => (t += `<th>${escapeHtml(h)}</th>`));
        t += '</tr></thead><tbody>';
        rows.slice(1).forEach((r) => {
          t += '<tr>';
          r.forEach((c) => (t += `<td>${escapeHtml(c)}</td>`));
          t += '</tr>';
        });
        t += '</tbody></table>';
        resultHtml = sanitizeHtml(t);
      } else {
        resultHtml = `<pre><code>${escapeHtml(textContent)}</code></pre>`;
      }
    } else {
      resultHtml = sanitizeHtml(textContent);
    }

    return {
      data: resultHtml,
      mimeType: 'text/html;charset=utf-8',
      fileName: `${baseName}.html`,
      byteLength: new TextEncoder().encode(resultHtml).byteLength,
    };
  }

  if (target === 'markdown' || target === 'md') {
    let resultMd = '';
    if (source === 'html') {
      resultMd = htmlToMarkdown(textContent);
    } else if (source === 'json') {
      const csv = jsonToCsv(textContent);
      const rows = parseCsvRows(csv);
      if (rows.length > 0) {
        const header = rows[0];
        const sep = header.map(() => '---');
        resultMd = `| ${header.join(' | ')} |\n| ${sep.join(' | ')} |\n`;
        rows.slice(1).forEach((r) => {
          resultMd += `| ${r.join(' | ')} |\n`;
        });
      } else {
        resultMd = '```json\n' + textContent + '\n```';
      }
    } else {
      resultMd = textContent;
    }

    return {
      data: resultMd,
      mimeType: 'text/markdown;charset=utf-8',
      fileName: `${baseName}.md`,
      byteLength: new TextEncoder().encode(resultMd).byteLength,
    };
  }

  if (target === 'csv') {
    let resultCsv = '';
    if (source === 'json') {
      resultCsv = jsonToCsv(textContent, options.delimiter ?? ',');
    } else if (source === 'tsv') {
      const json = tsvToJson(textContent, { coerceTypes: false });
      resultCsv = jsonToCsv(json, options.delimiter ?? ',');
    } else {
      resultCsv = textContent;
    }

    return {
      data: resultCsv,
      mimeType: 'text/csv;charset=utf-8',
      fileName: `${baseName}.csv`,
      byteLength: new TextEncoder().encode(resultCsv).byteLength,
    };
  }

  if (target === 'tsv') {
    let resultTsv = '';
    if (source === 'json') {
      resultTsv = jsonToTsv(textContent);
    } else if (source === 'csv') {
      const json = csvToJson(textContent, options.delimiter ?? ',', { coerceTypes: false });
      resultTsv = jsonToTsv(json);
    } else {
      resultTsv = textContent;
    }

    return {
      data: resultTsv,
      mimeType: 'text/tab-separated-values;charset=utf-8',
      fileName: `${baseName}.tsv`,
      byteLength: new TextEncoder().encode(resultTsv).byteLength,
    };
  }

  if (target === 'json') {
    let jsonObj: unknown = null;
    if (source === 'csv') {
      jsonObj = csvToJson(textContent, options.delimiter, { coerceTypes: options.coerceTypes ?? true });
    } else if (source === 'tsv') {
      jsonObj = tsvToJson(textContent, { coerceTypes: options.coerceTypes ?? true });
    } else if (source === 'xml') {
      jsonObj = xmlToJson(textContent);
    } else if (source === 'yaml' || source === 'yml') {
      jsonObj = yamlToJson(textContent);
    } else if (source === 'base64') {
      const decoded = base64ToText(textContent);
      jsonObj = JSON.parse(decoded);
    } else if (source === 'hex') {
      const decoded = hexToText(textContent);
      jsonObj = JSON.parse(decoded);
    } else {
      jsonObj = JSON.parse(textContent);
    }

    if (options.jsonSortKeys) {
      jsonObj = sortObjectKeys(jsonObj);
    }

    const indent = typeof options.jsonIndent === 'number' ? options.jsonIndent : (options.prettyJson !== false ? 2 : 0);
    const formatted = indent > 0 ? JSON.stringify(jsonObj, null, indent) : JSON.stringify(jsonObj);
    return {
      data: formatted,
      mimeType: 'application/json;charset=utf-8',
      fileName: `${baseName}.json`,
      byteLength: new TextEncoder().encode(formatted).byteLength,
    };
  }

  if (target === 'xml') {
    let xmlOutput = '';
    if (source === 'json') {
      const parsed = JSON.parse(textContent);
      xmlOutput = jsonToXml(parsed);
    } else if (source === 'yaml' || source === 'yml') {
      const parsed = yamlToJson(textContent);
      xmlOutput = jsonToXml(parsed);
    } else if (source === 'csv') {
      const json = csvToJson(textContent, options.delimiter, { coerceTypes: options.coerceTypes ?? true });
      xmlOutput = jsonToXml(json);
    } else if (source === 'tsv') {
      const json = tsvToJson(textContent, { coerceTypes: options.coerceTypes ?? true });
      xmlOutput = jsonToXml(json);
    } else {
      xmlOutput = sanitizeHtml(textContent);
    }

    return {
      data: xmlOutput,
      mimeType: 'application/xml;charset=utf-8',
      fileName: `${baseName}.xml`,
      byteLength: new TextEncoder().encode(xmlOutput).byteLength,
    };
  }

  if (target === 'yaml') {
    let yamlOutput = '';
    if (source === 'json') {
      const parsed = JSON.parse(textContent);
      yamlOutput = jsonToYaml(parsed);
    } else if (source === 'xml') {
      const json = xmlToJson(textContent);
      yamlOutput = jsonToYaml(json);
    } else if (source === 'csv') {
      const json = csvToJson(textContent, options.delimiter, { coerceTypes: options.coerceTypes ?? true });
      yamlOutput = jsonToYaml(json);
    } else if (source === 'tsv') {
      const json = tsvToJson(textContent, { coerceTypes: options.coerceTypes ?? true });
      yamlOutput = jsonToYaml(json);
    } else {
      yamlOutput = `content: |\n  ${textContent.replace(/\n/g, '\n  ')}\n`;
    }

    return {
      data: yamlOutput,
      mimeType: 'application/yaml;charset=utf-8',
      fileName: `${baseName}.yaml`,
      byteLength: new TextEncoder().encode(yamlOutput).byteLength,
    };
  }

  if (target === 'txt') {
    let plainText = textContent;
    if (source === 'html') {
      plainText = htmlToMarkdown(textContent).replace(/[#*`_~]/g, '');
    } else if (source === 'base64') {
      plainText = base64ToText(textContent);
    } else if (source === 'hex') {
      plainText = hexToText(textContent);
    }

    return {
      data: plainText,
      mimeType: 'text/plain;charset=utf-8',
      fileName: `${baseName}.txt`,
      byteLength: new TextEncoder().encode(plainText).byteLength,
    };
  }

  return {
    data: textContent,
    mimeType: 'text/plain;charset=utf-8',
    fileName: `${baseName}.txt`,
    byteLength: new TextEncoder().encode(textContent).byteLength,
  };
}
