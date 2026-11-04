# Universal Convertor — Project Structure Index

Use this file as the primary search index before running directory scans or grep queries.

## Root Configuration & Deployment
- `wrangler.json`: Cloudflare Workers Static Assets configuration (directory `./dist`, SPA routing, compatibility flags).
- `wrangler.toml`: Cloudflare Workers legacy configuration fallback.
- `next.config.ts`: Next.js 15+ App Router configuration, 30-day immutable cache headers, CSP, and security headers.
- `package.json`: NPM package metadata, scripts (`dev`, `build`, `start`, `typecheck`, `lint`), and dependencies.
- `tsconfig.json`: TypeScript 5.x/7.x strict compiler configuration.
- `metadata.json`: AI Studio application metadata and capabilities.
- `index.html`: Vite SPA HTML entrypoint.
- `vite.config.ts`: Vite 6 build configuration for Cloudflare Workers Static Assets.

## Application Entry & Layout
- `app/layout.tsx`: Root HTML shell, responsive viewport, metadata, Schema.org JSON-LD structured data, Dark/Light theme class.
- `app/page.tsx`: Next.js App Router root page mounting `src/App.tsx`.
- `app/globals.css`: Tailwind CSS v4 root stylesheet (`@import "tailwindcss";`).
- `src/main.tsx`: Client-side React 19 mount entrypoint.
- `src/App.tsx`: Central application workspace, top-of-page Dropzone, ConversionToolbar, FileQueueItem list, Before/After PreviewModal, SEO descriptions, feature cards, format matrix, and FAQ accordion.
- `src/worker-edge.ts`: Cloudflare Workers edge handler serving static assets with 30-day immutable caching headers and security policies.

## UI Components (`src/components/`)
- `src/components/Header.tsx`: Sticky navigation bar with app branding, 100% Free badge, live queue count indicator, and theme toggle button (`React.memo`).
- `src/components/Dropzone.tsx`: Interactive drag-and-drop zone, file browser, clipboard paste (`Ctrl+V`) listener, and quick-test sample image buttons (`React.memo`).
- `src/components/ConversionToolbar.tsx`: Global target format dropdown, quality slider, advanced controls (resize, background color, EXIF toggle, PDF settings), and batch action triggers (`React.memo`).
- `src/components/FileQueueItem.tsx`: Individual queued file card, thumbnail, format conversion arrow, dimensions, size savings badge, format selector, regenerate button, compare, download, and remove actions (`React.memo`).
- `src/components/PreviewModal.tsx`: High-precision Before/After visual comparison modal with interactive split slider and side-by-side view modes (`React.memo`).

## Processing Core (`src/core/`)
- `src/core/workerPool.ts`: Concurrency-limited Web Worker thread pool with FIFO task queue, progress listeners, Transferable ArrayBuffer dispatching, and lifecycle management.
- `src/core/zipArchiver.ts`: Ultra-fast client-side ZIP archive generator powered by `fflate` for batch downloads.
- `src/core/pdfGenerator.ts`: Client-side single and multi-page PDF generation and image merging powered by `pdf-lib`.
- `src/core/documentConverter.ts`: Re-export barrel for modular document converters.
- `src/core/converters/documentConverter.ts`: Universal client-side document converter (Markdown, HTML, Plain Text, XML, JSON, CSV, TSV).
- `src/core/converters/imageConverter.ts`: Hardware-accelerated image conversion routines (BMP, TIFF, ICO encoders, grayscale, dimension calculations).
- `src/core/converters/psdConverter.ts`: Adobe Photoshop PSD composite decoder using `@webtoon/psd`.

## Web Workers (`src/workers/`)
- `src/workers/conversion.worker.ts`: Dedicated worker thread running `OffscreenCanvas`, format encoding/decoding (WebP, AVIF, PNG, JPEG, ICO, BMP, TIFF), aspect-ratio resizing, background color fill, and multi-size ICO binary generation.

## Utilities & Security (`src/utils/`)
- `src/utils/magicBytes.ts`: Binary header signature validator inspecting the first 16-64 bytes to prevent MIME spoofing.
- `src/utils/svgSanitizer.ts`: DOMParser-based SVG sanitizer removing scripts, event handlers, malicious URI schemes, and dangerous XML tags.

## Type Definitions (`src/types/`)
- `src/types/converter.ts`: Strict TypeScript types for input formats, output formats, queue items, worker payloads, conversion options, and format compatibility matrix.
- `src/types/conversionOptionsSchema.ts`: Runtime Zod schema for validating conversion options, imported only by validation and tests.
- `public/.well-known/ai-catalog.json`: AI discovery catalog metadata for the deployed application.

## Agent Rules & Guidelines (`.agents/rules/`)
- `.agents/rules/core.md`: Core platform architecture, token preservation, zero code comments rule, verification loop.
- `.agents/rules/security.md`: Zero cloud uploads, SVG sanitization, magic bytes, memory cleanup.
- `.agents/rules/seo.md`: Technical SEO, GEO (Generative Engine Optimization), AEO (Answer Engine Optimization), Schema.org JSON-LD, `/llms.txt`.
- `.agents/rules/performance.md`: Concurrency, Web Workers, Transferables, component memoization, zero CLS.
- `.agents/rules/cache.md`: 30-day browser & edge caching mandate (`max-age=2592000, immutable`).
- `.agents/rules/ui.md`: UI/UX Pro Max design system, top-of-page operations mandate, responsive layout, Dark/Light theme.
- `.agents/rules/components.md`: Component-first architecture, strict props typing, named exports, zero duplication.
- `.agents/rules/test.md`: Testing pure functions with `node:test` and 4-tier input coverage.
- `.agents/rules/git.md`: Git workflow, mandatory post-task commit, strictly ZERO `git push`.
