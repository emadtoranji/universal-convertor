import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  jsonToCsv,
  jsonToTsv,
  csvToJson,
  tsvToJson,
  parseCsvRows,
  convertDocument,
  sortObjectKeys,
} from '../../src/core/documentConverter.ts';

describe('documentConverter - Unit Test Suite', () => {
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

  it('converts between CSV, TSV, and JSON formats seamlessly', async () => {
    const jsonInput = JSON.stringify([
      { sku: 'A1', qty: 10 },
      { sku: 'B2', qty: 25 },
    ]);

    const csvResult = await convertDocument(jsonInput, {
      sourceFormat: 'json',
      targetFormat: 'csv',
      fileName: 'inventory.json',
    });
    assert.equal(csvResult.mimeType, 'text/csv;charset=utf-8');
    assert.equal(csvResult.fileName, 'inventory.csv');
    assert.match(String(csvResult.data), /sku,qty/);

    const tsvResult = await convertDocument(csvResult.data, {
      sourceFormat: 'csv',
      targetFormat: 'tsv',
      fileName: 'inventory.csv',
    });
    assert.equal(tsvResult.mimeType, 'text/tab-separated-values;charset=utf-8');
    assert.equal(tsvResult.fileName, 'inventory.tsv');
    assert.match(String(tsvResult.data), /sku\tqty/);

    const backToJson = await convertDocument(tsvResult.data, {
      sourceFormat: 'tsv',
      targetFormat: 'json',
      fileName: 'inventory.tsv',
    });
    assert.equal(backToJson.mimeType, 'application/json;charset=utf-8');
    const parsed = JSON.parse(String(backToJson.data));
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].sku, 'A1');
    assert.equal(parsed[0].qty, 10);
  });

  it('handles empty inputs across tabular data conversions', () => {
    assert.equal(jsonToCsv([]), '');
    assert.deepEqual(csvToJson(''), []);
    assert.deepEqual(sortObjectKeys({}), {});
  });
});
