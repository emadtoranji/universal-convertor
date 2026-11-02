import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseThemeFromCookieString,
  THEME_COOKIE_NAME,
  THEME_COOKIE_MAX_AGE,
} from '../../src/utils/theme.ts';

describe('theme - Unit Test Suite', () => {
  it('parses valid dark theme cookie correctly', () => {
    const cookie = 'other=value; theme=dark; session=abc';
    const result = parseThemeFromCookieString(cookie);
    assert.equal(result, 'dark');
  });

  it('parses valid light theme cookie correctly', () => {
    const cookie = 'theme=light';
    const result = parseThemeFromCookieString(cookie);
    assert.equal(result, 'light');
  });

  it('handles cookies without spaces after semicolons', () => {
    const cookie = 'a=1;theme=dark;b=2';
    const result = parseThemeFromCookieString(cookie);
    assert.equal(result, 'dark');
  });

  it('handles URL-encoded cookie values properly', () => {
    const cookie = 'theme=%64%61%72%6b';
    const result = parseThemeFromCookieString(cookie);
    assert.equal(result, 'dark');
  });

  it('returns null for empty cookie strings', () => {
    assert.equal(parseThemeFromCookieString(''), null);
  });

  it('returns null when theme cookie is not present', () => {
    assert.equal(parseThemeFromCookieString('session=xyz; user=123'), null);
  });

  it('returns null for empty theme value', () => {
    assert.equal(parseThemeFromCookieString('theme='), null);
    assert.equal(parseThemeFromCookieString('theme=   '), null);
  });

  it('rejects unsupported theme names', () => {
    assert.equal(parseThemeFromCookieString('theme=blue'), null);
    assert.equal(parseThemeFromCookieString('theme=system'), null);
    assert.equal(parseThemeFromCookieString('theme=sepia'), null);
  });

  it('rejects attack payloads and script injection in theme cookie', () => {
    assert.equal(parseThemeFromCookieString('theme=<script>alert(1)</script>'), null);
    assert.equal(parseThemeFromCookieString('theme=javascript:void(0)'), null);
    assert.equal(parseThemeFromCookieString('theme=__proto__'), null);
    assert.equal(parseThemeFromCookieString('theme=constructor'), null);
  });

  it('verifies theme cookie constants adhere to standards', () => {
    assert.equal(THEME_COOKIE_NAME, 'theme');
    assert.equal(THEME_COOKIE_MAX_AGE, 31536000);
  });
});

