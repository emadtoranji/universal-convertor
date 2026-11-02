import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSvgString } from '../../src/utils/svgSanitizer.ts';

describe('sanitizeSvgString - Unit Test Suite', () => {
  it('preserves clean vector graphic elements and attributes', () => {
    const safeSvg = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" fill="#00ffff" /><circle cx="50" cy="50" r="30" stroke="#000" /><path d="M10 10 H 90 V 90 H 10 Z" /></svg>';
    const sanitized = sanitizeSvgString(safeSvg);
    assert.match(sanitized, /<rect/);
    assert.match(sanitized, /<circle/);
    assert.match(sanitized, /<path/);
    assert.match(sanitized, /fill="#00ffff"/);
  });

  it('strips dangerous <script> tags and payloads', () => {
    const dirtySvg = '<svg><script>alert("xss")</script><rect width="10" height="10"/></svg>';
    const sanitized = sanitizeSvgString(dirtySvg);
    assert.doesNotMatch(sanitized, /<script/i);
    assert.doesNotMatch(sanitized, /alert/i);
    assert.match(sanitized, /<rect/);
  });

  it('strips dangerous <foreignObject> elements', () => {
    const dirtySvg = '<svg><foreignObject width="100" height="100"><body xmlns="http://www.w3.org/1999/xhtml"><div>Injected</div></body></foreignObject><circle r="5"/></svg>';
    const sanitized = sanitizeSvgString(dirtySvg);
    assert.doesNotMatch(sanitized, /<foreignObject/i);
    assert.doesNotMatch(sanitized, /<body/i);
    assert.match(sanitized, /<circle/);
  });

  it('strips animation vectors (<animate> and <set>)', () => {
    const dirtySvg = '<svg><rect><animate attributeName="href" values="javascript:alert(1)" /><set attributeName="onmouseover" to="alert(1)" /></rect></svg>';
    const sanitized = sanitizeSvgString(dirtySvg);
    assert.doesNotMatch(sanitized, /<animate/i);
    assert.doesNotMatch(sanitized, /<set/i);
    assert.doesNotMatch(sanitized, /javascript:/i);
  });

  it('strips inline event listeners from attributes', () => {
    const dirtySvg = '<svg onload="alert(1)" onclick="malicious()" onerror="exploit()"><rect onmouseover="hack()" width="10" height="10"/></svg>';
    const sanitized = sanitizeSvgString(dirtySvg);
    assert.doesNotMatch(sanitized, /onload/i);
    assert.doesNotMatch(sanitized, /onclick/i);
    assert.doesNotMatch(sanitized, /onerror/i);
    assert.doesNotMatch(sanitized, /onmouseover/i);
  });

  it('strips javascript: and vbscript: URIs from href and xlink:href', () => {
    const dirtySvg = '<svg><a href="javascript:alert(1)"><text>Click</text></a><image xlink:href="javascript:void(0)" /></svg>';
    const sanitized = sanitizeSvgString(dirtySvg);
    assert.doesNotMatch(sanitized, /javascript:/i);
  });

  it('strips DOCTYPE and ENTITY declarations to eliminate XXE attacks', () => {
    const xxeSvg = '<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg><text>&xxe;</text></svg>';
    const sanitized = sanitizeSvgString(xxeSvg);
    assert.doesNotMatch(sanitized, /<!DOCTYPE/i);
    assert.doesNotMatch(sanitized, /<!ENTITY/i);
    assert.doesNotMatch(sanitized, /SYSTEM/i);
  });

  it('handles empty and minimal SVG inputs safely', () => {
    assert.equal(sanitizeSvgString(''), '');
    const minimal = '<svg></svg>';
    const sanitizedMinimal = sanitizeSvgString(minimal);
    assert.equal(sanitizedMinimal, minimal);
  });
});

