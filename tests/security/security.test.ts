import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSvgString } from '../../src/utils/svgSanitizer.ts';
import { validateMagicBytes } from '../../src/utils/magicBytes.ts';
import { ConversionOptionsSchema } from '../../src/types/converter.ts';

describe('security - Attack Payload & Protection Test Suite', () => {
  it('prevents prototype pollution when parsing malformed conversion options', () => {
    const maliciousJson = '{"__proto__": {"polluted": true}, "targetFormat": "webp"}';
    const parsedPayload = JSON.parse(maliciousJson) as Record<string, unknown>;

    const safeOptions = ConversionOptionsSchema.parse(parsedPayload);
    assert.equal(safeOptions.targetFormat, 'webp');

    const testObj: Record<string, unknown> = {};
    assert.equal((testObj as { polluted?: boolean }).polluted, undefined);
    assert.equal(({} as { polluted?: boolean }).polluted, undefined);
  });

  it('strips CDATA obfuscated scripts from SVG documents', () => {
    const cdataSvg = '<svg><script><![CDATA[alert("cdata-xss")]]></script><circle r="10"/></svg>';
    const sanitized = sanitizeSvgString(cdataSvg);

    assert.doesNotMatch(sanitized, /<script/i);
    assert.doesNotMatch(sanitized, /alert/i);
    assert.match(sanitized, /<circle/);
  });

  it('strips SVG animation-based script triggers', () => {
    const animSvg = '<svg><animate onbegin="alert(1)" attributeName="x" dur="1s" /><circle r="5" /></svg>';
    const sanitized = sanitizeSvgString(animSvg);

    assert.doesNotMatch(sanitized, /<animate/i);
    assert.doesNotMatch(sanitized, /onbegin/i);
    assert.doesNotMatch(sanitized, /alert/i);
    assert.match(sanitized, /<circle/);
  });

  it('strips base64 data:text/html payloads in href and xlink:href', () => {
    const dataHtmlSvg = '<svg><a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="><text>Click</text></a></svg>';
    const sanitized = sanitizeSvgString(dataHtmlSvg);

    assert.doesNotMatch(sanitized, /data:text\/html/i);
  });

  it('detects and flags spoofed file extensions with mismatched magic bytes', () => {
    const fakePng = new TextEncoder().encode('{"error": "Not a PNG"}');
    const result = validateMagicBytes(fakePng.buffer, 'document.png');

    assert.ok(result.isValid);
    if (result.isValid) {
      assert.notEqual(result.format, 'png');
      assert.equal(result.format, 'json');
    }
  });

  it('enforces memory limits by refusing files exceeding 150MB limit', () => {
    const fakeOversized = {
      byteLength: 151 * 1024 * 1024,
      slice: () => new ArrayBuffer(8),
    } as unknown as ArrayBuffer;

    const result = validateMagicBytes(fakeOversized, 'huge.jpg');
    assert.equal(result.isValid, false);
    if (!result.isValid) {
      assert.match(result.error, /limit/i);
    }
  });

  it('safely handles null bytes and control characters inside text documents', () => {
    const binaryInsideText = new Uint8Array([0x00, 0x01, 0x02, 0x1f, 0x7f]);
    const result = validateMagicBytes(binaryInsideText.buffer, 'data.csv');

    assert.equal(result.isValid, false);
    if (!result.isValid) {
      assert.match(result.error, /unrecognized|signature|mismatch/i);
    }
  });
});
