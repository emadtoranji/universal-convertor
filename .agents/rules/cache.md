---
trigger: always_on
---

# RULE: cache — 30-Day Browser Caching, Cloudflare Edge & Static Asset Cache Policy

## Core Mandate — ALWAYS ON
This rule is ALWAYS ACTIVE for every task, every file, every code change — no exceptions.
Maximizing client-side execution speed requires an aggressive, immutable caching strategy for all static assets across both Google AI Studio and Cloudflare Workers.

---

## ABSOLUTE PROHIBITIONS

### ZERO UNCACHED STATIC ASSETS
- Static scripts, stylesheets, fonts, WebAssembly binaries, web manifests, and graphic assets MUST NEVER be served with `no-store` or missing cache headers.
- All static assets MUST be served with the mandatory 30-day immutable cache header:
  `Cache-Control: public, max-age=2592000, immutable`
- Missing or short-lived caching on static bundles is a performance regression.

### ZERO STALE HTML NAVIGATION
- HTML document requests (`/`, `/index.html`) MUST NOT be cached immutably.
- HTML entrypoints MUST be served with `Cache-Control: public, max-age=0, must-revalidate` to ensure users instantly receive application updates while their browser serves static chunks from cache.

---

## Cache Policy Standards

### 1. The 30-Day Immutable Standard
- 30 Days in seconds: `30 * 24 * 60 * 60 = 2592000` seconds.
- Header value:
  ```http
  Cache-Control: public, max-age=2592000, immutable
  ```
- Target file extensions:
  `js`, `mjs`, `css`, `png`, `jpg`, `jpeg`, `webp`, `avif`, `svg`, `ico`, `woff`, `woff2`, `ttf`, `eot`, `wasm`, `json`, `webmanifest`.

### 2. Next.js App Router Implementation (`next.config.ts`)
The `headers()` configuration in `next.config.ts` must maintain:
```ts
async headers() {
  return [
    {
      source: '/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff|woff2|wasm|css|js)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=2592000, immutable',
        },
      ],
    },
    {
      source: '/_next/static/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=2592000, immutable',
        },
      ],
    },
    {
      source: '/manifest.json',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=2592000, immutable',
        },
      ],
    },
  ];
}
```

### 3. Cloudflare Workers Edge Implementation (`src/worker-edge.ts`)
The edge worker handler must inspect the request path and set 30-day caching on static extensions:
```ts
const STATIC_EXTENSIONS = new Set([
  'js', 'css', 'png', 'jpg', 'jpeg', 'webp', 'avif',
  'svg', 'ico', 'woff', 'woff2', 'ttf', 'eot', 'wasm',
  'json', 'webmanifest'
]);

if (STATIC_EXTENSIONS.has(ext)) {
  headers.set('Cache-Control', 'public, max-age=2592000, immutable');
} else {
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
}
```

---

## Enforcement Checklist
Before completing ANY task touching build, edge worker, or configuration:
- [ ] 30-day immutable cache header configured in `next.config.ts`
- [ ] 30-day immutable cache header configured in `src/worker-edge.ts`
- [ ] HTML document headers allow fast revalidation (`max-age=0, must-revalidate`)
- [ ] Static asset types match full extension allowlist
- [ ] `npm run typecheck` passes with zero errors
