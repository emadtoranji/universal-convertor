import meta from './locales/en/meta.json' with { type: 'json' };
import header from './locales/en/header.json' with { type: 'json' };
import dropzone from './locales/en/dropzone.json' with { type: 'json' };
import toolbar from './locales/en/toolbar.json' with { type: 'json' };
import queue from './locales/en/queue.json' with { type: 'json' };
import preview from './locales/en/preview.json' with { type: 'json' };
import features from './locales/en/features.json' with { type: 'json' };
import matrix from './locales/en/matrix.json' with { type: 'json' };
import faq from './locales/en/faq.json' with { type: 'json' };
import terms from './locales/en/terms.json' with { type: 'json' };
import date from './locales/en/date.json' with { type: 'json' };

export const enDictionary = {
  meta,
  header,
  dropzone,
  toolbar,
  queue,
  preview,
  features,
  matrix,
  faq,
  terms,
  date,
} as const;

export const defaultLocale = 'en' as const;

export type AppDictionary = typeof enDictionary;
export type TranslationNamespace = keyof AppDictionary;

type Primitive = string | number | boolean;

type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}${'' extends P ? '' : '.'}${P}`
    : never
  : never;

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7];

type Leaves<T, D extends number = 6> = [D] extends [never]
  ? never
  : T extends Primitive
    ? ''
    : T extends readonly unknown[]
      ? never
      : T extends object
        ? { [K in keyof T]-?: Join<K, Leaves<T[K], Prev[D]>> }[keyof T]
        : '';

export type TranslationKey = Leaves<AppDictionary>;
export type ScopedTranslationKey<N extends TranslationNamespace> = Leaves<AppDictionary[N]>;
export type TranslationParams = Record<string, string | number>;

function resolvePath(obj: unknown, path: string): unknown {
  const segments = path.split('.');
  let current: unknown = obj;
  for (const seg of segments) {
    if (seg === '__proto__' || seg === 'constructor' || seg === 'prototype') {
      return undefined;
    }
    if (current && typeof current === 'object' && Object.prototype.hasOwnProperty.call(current, seg)) {
      current = (current as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return current;
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, token: string) => {
    return token in params ? String(params[token]) : `{${token}}`;
  });
}

function translate(key: TranslationKey, params?: TranslationParams): string {
  const value = resolvePath(enDictionary, key);
  if (typeof value === 'string') {
    return interpolate(value, params);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return key;
}

export interface TypedTranslator {
  (key: TranslationKey, params?: TranslationParams): string;
  meta: typeof meta;
  header: typeof header;
  dropzone: typeof dropzone;
  toolbar: typeof toolbar;
  queue: typeof queue;
  preview: typeof preview;
  features: typeof features;
  matrix: typeof matrix;
  faq: typeof faq;
  terms: typeof terms;
  date: typeof date;
}

export const t: TypedTranslator = Object.assign(translate, enDictionary);

export const i18n = enDictionary;

export function createScopedT<N extends TranslationNamespace>(namespace: N) {
  return function scopedT(
    key: ScopedTranslationKey<N>,
    params?: TranslationParams
  ): string {
    const fullKey = `${namespace}.${key}` as TranslationKey;
    return translate(fullKey, params);
  };
}

export default t;
