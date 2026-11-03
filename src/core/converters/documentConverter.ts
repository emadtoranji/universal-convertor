export type DocumentFormat =
  | 'json'
  | 'csv'
  | 'tsv'
  | 'md'
  | 'html'
  | 'txt'
  | 'xml';

export interface CsvParseOptions {
  delimiter?: string;
  coerceTypes?: boolean;
  headers?: string[];
  skipEmptyLines?: boolean;
  trimFields?: boolean;
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
  htmlWrapDocument?: boolean;
}

export interface DocumentConvertResult {
  data: string | Uint8Array;
  mimeType: string;
  fileName: string;
  byteLength: number;
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
    const trimmed = jsonInput.trim();
    if (!trimmed) {
      return '';
    }
    parsed = JSON.parse(trimmed);
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
      Object.keys(row as Record<string, unknown>).forEach((key) => {
        if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
          headerSet.add(key);
        }
      });
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
  if (/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
    const num = Number(trimmed);
    if (!Number.isNaN(num) && num <= Number.MAX_SAFE_INTEGER && num >= Number.MIN_SAFE_INTEGER) {
      return num;
    }
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

export function csvToJson(
  csvString: string,
  delimiter?: string,
  options?: CsvParseOptions
): Array<Record<string, unknown>> {
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
    const item: Record<string, unknown> = Object.create(null);
    headers.forEach((header, colIdx) => {
      if (header === '__proto__' || header === 'constructor' || header === 'prototype') {
        return;
      }
      let cell = row[colIdx] ?? '';
      if (shouldTrim) cell = cell.trim();
      item[header] = coerce ? coerceScalar(cell) : cell;
    });
    result.push({ ...item });
  });

  return result;
}

export function tsvToJson(tsvString: string, options?: CsvParseOptions): Array<Record<string, unknown>> {
  return csvToJson(tsvString, '\t', options);
}

export function sortObjectKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    for (const key of keys) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return obj;
}

export function markdownToHtml(md: string, wrapDocument = false): string {
  const lines = md.split(/\r?\n/);
  const htmlLines: string[] = [];
  let inCodeBlock = false;
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        htmlLines.push('</code></pre>');
        inCodeBlock = false;
      } else {
        htmlLines.push('<pre><code>');
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      htmlLines.push(escapeHtml(line));
      continue;
    }

    const trimmed = line.trim();

    if (trimmed.startsWith('#')) {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = inlineMarkdown(match[2]);
        htmlLines.push(`<h${level}>${text}</h${level}>`);
        continue;
      }
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        htmlLines.push('<ul>');
        inList = true;
      }
      const itemText = inlineMarkdown(trimmed.substring(2));
      htmlLines.push(`<li>${itemText}</li>`);
      continue;
    }

    if (inList) {
      htmlLines.push('</ul>');
      inList = false;
    }

    if (trimmed.length === 0) {
      continue;
    }

    htmlLines.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  if (inList) {
    htmlLines.push('</ul>');
  }
  if (inCodeBlock) {
    htmlLines.push('</code></pre>');
  }

  const bodyContent = htmlLines.join('\n');
  if (wrapDocument) {
    return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Document</title>\n</head>\n<body>\n${bodyContent}\n</body>\n</html>`;
  }

  return bodyContent;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMarkdown(text: string): string {
  let res = escapeHtml(text);
  res = res.replace(/`([^`]+)`/g, '<code>$1</code>');
  res = res.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  res = res.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  res = res.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return res;
}

export function htmlToMarkdown(html: string): string {
  let md = html;
  md = md.replace(/<head[\s\S]*?<\/head>/gi, '');
  md = md.replace(/<style[\s\S]*?<\/style>/gi, '');
  md = md.replace(/<script[\s\S]*?<\/script>/gi, '');

  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n##### $1\n');
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n###### $1\n');

  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n');
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

  md = md.replace(/<[^>]+>/g, '');
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");
  md = md.replace(/&nbsp;/g, ' ');

  return md.split('\n').map((l) => l.trimRight()).join('\n').trim();
}

export function htmlToPlainText(html: string): string {
  let text = html;
  text = text.replace(/<head[\s\S]*?<\/head>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  return text.trim();
}

export function markdownToPlainText(md: string): string {
  let text = md;
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/^#{1,6}\s+(.*)$/gm, '$1');
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  text = text.replace(/^[-*]\s+/gm, '');
  return text.trim();
}

export function xmlToJson(xml: string): Record<string, unknown> | Array<unknown> {
  const cleanXml = xml.replace(/<\?xml[\s\S]*?\?>/i, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  const rootTagMatch = cleanXml.match(/^<([a-zA-Z0-9_-]+)[^>]*>([\s\S]*)<\/\1>$/);
  if (!rootTagMatch) {
    return { xml: cleanXml };
  }

  const rootName = rootTagMatch[1];
  const innerContent = rootTagMatch[2].trim();

  const childPattern = /<([a-zA-Z0-9_-]+)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>|<([a-zA-Z0-9_-]+)(?:\s+[^>]*)?\/>/g;
  const children: Record<string, unknown[]> = {};
  let match: RegExpExecArray | null;
  let hasChildren = false;

  while ((match = childPattern.exec(innerContent)) !== null) {
    hasChildren = true;
    const tagName = match[1] || match[3];
    const content = match[2] !== undefined ? match[2].trim() : '';

    if (tagName === '__proto__' || tagName === 'constructor' || tagName === 'prototype') {
      continue;
    }

    if (!children[tagName]) {
      children[tagName] = [];
    }

    if (content.includes('<') && content.includes('>')) {
      children[tagName].push(xmlToJson(`<${tagName}>${content}</${tagName}>`));
    } else {
      children[tagName].push(coerceScalar(content));
    }
  }

  if (!hasChildren) {
    return { [rootName]: coerceScalar(innerContent) };
  }

  const simplified: Record<string, unknown> = {};
  Object.keys(children).forEach((k) => {
    const list = children[k];
    simplified[k] = list.length === 1 ? list[0] : list;
  });

  return { [rootName]: simplified };
}

export function jsonToXml(obj: unknown, rootTag = 'root'): string {
  function serializeNode(key: string, value: unknown): string {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return '';
    }
    const safeTag = key.replace(/[^a-zA-Z0-9_-]/g, '_') || 'item';
    if (value === null || value === undefined) {
      return `<${safeTag}/>`;
    }
    if (Array.isArray(value)) {
      return value.map((item) => serializeNode(safeTag, item)).join('\n');
    }
    if (typeof value === 'object') {
      const inner = Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => serializeNode(k, v))
        .join('\n  ');
      return `<${safeTag}>\n  ${inner}\n</${safeTag}>`;
    }
    return `<${safeTag}>${escapeHtml(String(value))}</${safeTag}>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n${serializeNode(rootTag, obj)}`;
}

export async function convertDocument(
  input: string | ArrayBuffer | Uint8Array,
  options: DocumentConvertOptions
): Promise<DocumentConvertResult> {
  const target = options.targetFormat.toLowerCase() as DocumentFormat;
  const source = (options.sourceFormat?.toLowerCase() as DocumentFormat) ?? 'json';
  const baseName = options.fileName ? options.fileName.replace(/\.[^/.]+$/, '') : 'converted_document';

  let textContent = '';
  if (typeof input === 'string') {
    textContent = input;
  } else {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    textContent = decoder.decode(bytes);
  }

  const trimmedInput = textContent.trim();
  if (!trimmedInput) {
    if (target === 'json') {
      return {
        data: '[]',
        mimeType: 'application/json;charset=utf-8',
        fileName: `${baseName}.json`,
        byteLength: 2,
      };
    }
    return {
      data: '',
      mimeType: 'text/plain;charset=utf-8',
      fileName: `${baseName}.${target}`,
      byteLength: 0,
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
    } else if (source === 'html') {
      const plain = htmlToPlainText(textContent);
      jsonObj = plain.split('\n').filter((l) => l.trim().length > 0);
    } else if (source === 'txt' || source === 'md') {
      jsonObj = textContent.split('\n').filter((l) => l.trim().length > 0);
    } else {
      jsonObj = JSON.parse(textContent);
    }

    if (options.jsonSortKeys) {
      jsonObj = sortObjectKeys(jsonObj);
    }

    const indent =
      typeof options.jsonIndent === 'number'
        ? options.jsonIndent
        : options.prettyJson !== false
        ? 2
        : 0;
    const formatted = indent > 0 ? JSON.stringify(jsonObj, null, indent) : JSON.stringify(jsonObj);
    return {
      data: formatted,
      mimeType: 'application/json;charset=utf-8',
      fileName: `${baseName}.json`,
      byteLength: new TextEncoder().encode(formatted).byteLength,
    };
  }

  if (target === 'csv') {
    let resultCsv = '';
    if (source === 'json') {
      resultCsv = jsonToCsv(textContent, options.delimiter ?? ',');
    } else if (source === 'tsv') {
      const json = tsvToJson(textContent, { coerceTypes: false });
      resultCsv = jsonToCsv(json, options.delimiter ?? ',');
    } else if (source === 'xml') {
      const json = xmlToJson(textContent);
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
    } else if (source === 'xml') {
      const json = xmlToJson(textContent);
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

  if (target === 'xml') {
    let xmlStr = '';
    if (source === 'json') {
      xmlStr = jsonToXml(JSON.parse(textContent));
    } else if (source === 'csv') {
      const json = csvToJson(textContent, options.delimiter);
      xmlStr = jsonToXml(json, 'records');
    } else if (source === 'tsv') {
      const json = tsvToJson(textContent);
      xmlStr = jsonToXml(json, 'records');
    } else {
      xmlStr = jsonToXml({ content: textContent });
    }

    return {
      data: xmlStr,
      mimeType: 'application/xml;charset=utf-8',
      fileName: `${baseName}.xml`,
      byteLength: new TextEncoder().encode(xmlStr).byteLength,
    };
  }

  if (target === 'html') {
    let htmlStr = '';
    if (source === 'md') {
      htmlStr = markdownToHtml(textContent, options.htmlWrapDocument ?? true);
    } else if (source === 'txt') {
      const body = textContent
        .split('\n')
        .map((l) => `<p>${escapeHtml(l)}</p>`)
        .join('\n');
      htmlStr = options.htmlWrapDocument
        ? `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"></head>\n<body>\n${body}\n</body>\n</html>`
        : body;
    } else if (source === 'json' || source === 'csv' || source === 'tsv') {
      const rows =
        source === 'csv'
          ? parseCsvRows(textContent, options.delimiter ?? ',')
          : source === 'tsv'
          ? parseCsvRows(textContent, '\t')
          : [Object.keys(JSON.parse(textContent)), Object.values(JSON.parse(textContent)).map(String)];
      const tableRows = rows
        .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
        .join('\n');
      const tableHtml = `<table border="1">\n${tableRows}\n</table>`;
      htmlStr = options.htmlWrapDocument
        ? `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"></head>\n<body>\n${tableHtml}\n</body>\n</html>`
        : tableHtml;
    } else {
      htmlStr = textContent;
    }

    return {
      data: htmlStr,
      mimeType: 'text/html;charset=utf-8',
      fileName: `${baseName}.html`,
      byteLength: new TextEncoder().encode(htmlStr).byteLength,
    };
  }

  if (target === 'md') {
    let mdStr = '';
    if (source === 'html') {
      mdStr = htmlToMarkdown(textContent);
    } else if (source === 'txt') {
      mdStr = textContent;
    } else if (source === 'json') {
      mdStr = `\`\`\`json\n${textContent}\n\`\`\``;
    } else {
      mdStr = textContent;
    }

    return {
      data: mdStr,
      mimeType: 'text/markdown;charset=utf-8',
      fileName: `${baseName}.md`,
      byteLength: new TextEncoder().encode(mdStr).byteLength,
    };
  }

  if (target === 'txt') {
    let txtStr = '';
    if (source === 'html') {
      txtStr = htmlToPlainText(textContent);
    } else if (source === 'md') {
      txtStr = markdownToPlainText(textContent);
    } else {
      txtStr = textContent;
    }

    return {
      data: txtStr,
      mimeType: 'text/plain;charset=utf-8',
      fileName: `${baseName}.txt`,
      byteLength: new TextEncoder().encode(txtStr).byteLength,
    };
  }

  return {
    data: textContent,
    mimeType: 'text/plain;charset=utf-8',
    fileName: `${baseName}.txt`,
    byteLength: new TextEncoder().encode(textContent).byteLength,
  };
}
