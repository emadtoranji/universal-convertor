export type DocumentFormat = 'json' | 'csv' | 'tsv';

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

export async function convertDocument(
  input: string | ArrayBuffer | Uint8Array,
  options: DocumentConvertOptions
): Promise<DocumentConvertResult> {
  const target = options.targetFormat.toLowerCase() as DocumentFormat;
  const source = (options.sourceFormat?.toLowerCase() as DocumentFormat) ?? 'json';
  const baseName = options.fileName ? options.fileName.replace(/\.[^/.]+$/, '') : 'converted_data';

  let textContent = '';
  if (typeof input === 'string') {
    textContent = input;
  } else {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    textContent = decoder.decode(bytes);
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

  return {
    data: textContent,
    mimeType: 'application/json;charset=utf-8',
    fileName: `${baseName}.json`,
    byteLength: new TextEncoder().encode(textContent).byteLength,
  };
}
