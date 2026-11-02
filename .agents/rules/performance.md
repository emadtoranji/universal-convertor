---
trigger: always_on
---

# RULE: performance — Client-Side Concurrency, Web Worker Pool, Memoization & Web Vitals

## Core Mandate — ALWAYS ON
This rule is ALWAYS ACTIVE for every task, every file, every code change — no exceptions.
Performance is Priority #2 after Security. The application must execute conversions with maximum speed, near-zero main-thread blocking, and instantaneous UI response.

---

## ABSOLUTE PROHIBITIONS

### ZERO MAIN-THREAD BLOCKING CONVERSIONS
- Performing CPU-intensive image encoding, format transformation, or decoding on the main browser thread is STRICTLY FORBIDDEN.
- Heavy transformations MUST execute in Web Workers using `OffscreenCanvas` or WebAssembly.
- The UI thread must stay responsive at 60fps at all times.

### ZERO UNTRANSFERRED ARRAYBUFFERS
- When passing large image buffers (exceeding 100KB) between the main thread and Web Workers, you MUST pass the buffer in the `transferables` array: `worker.postMessage(payload, [payload.buffer])`.
- Failing to use Transferables causes browser thread cloning lag and duplicates RAM usage.

### ZERO UNMEMOIZED PROP PASSING TO QUEUE ITEMS
- In batch operations with dozens or hundreds of items, passing unmemoized inline function closures (e.g. `onRemove={() => ...}`) to child components causes unnecessary re-rendering of the entire list.
- All handlers passed to queue items MUST be stabilized with `useCallback`.
- Queue item components MUST be wrapped in `React.memo`.

### ZERO MEMORY RETENTION AFTER EXPORT
- Never keep converted blobs in memory once discarded. Call `URL.revokeObjectURL` when items are deleted, cleared, or regenerated.
- Close `ImageBitmap` instances immediately after drawing with `bitmap.close()`.

### ZERO LAYOUT SHIFT (CLS = 0)
- Dimensions of thumbnails, cards, and toolbars must be constrained to prevent visual jumping when conversion results resolve.

---

## Strict Performance Standards

### 1. Web Worker Concurrency Pool (`src/core/workerPool.ts`)
- The worker pool MUST calculate its concurrency bound dynamically:
  ```ts
  const concurrency = Math.min(Math.max(navigator.hardwareConcurrency || 4, 2), 8);
  ```
- Tasks must be queued in a FIFO scheduler and dispatched to the first available worker.
- Worker lifecycle must be cleanly terminated with `pool.destroy()` on component unmount.

### 2. Component Caching & Memoization Architecture
- **Component Memoization (`React.memo`):**
  - `Header`: Memoized against unnecessary re-renders when queue item state changes.
  - `Dropzone`: Memoized; does not re-render during conversion progress.
  - `ConversionToolbar`: Memoized against item progress updates.
  - `FileQueueItem`: Wrapped in `React.memo` so that progress updates on Item A do NOT re-render Item B, C, or D.
  - `PreviewModal`: Memoized; only renders when active item changes.
- **Hook Memoization (`useCallback` & `useMemo`):**
  - All event handlers (`handleToggleTheme`, `processIncomingFiles`, `handleLoadSample`, `handleGlobalOptionsChange`, `handleItemFormatChange`, `handleRegenerate`, `handleRemoveItem`, `handleClearQueue`, `convertSingleItem`, `handleConvertAll`, `handleDownloadSingle`, `handleDownloadZip`, `handleMergeToPdf`) MUST be wrapped in `useCallback`.
  - Derived calculations (`completedCount`, `pendingCount`, `totalOriginalBytes`, `totalConvertedBytes`) MUST use `useMemo`.

### 3. Native Canvas & Bitmap Optimization
- Standard formats (PNG, JPEG, WebP, AVIF, BMP, ICO) MUST use `createImageBitmap` and `OffscreenCanvas` for hardware-accelerated processing.
- SVG conversions MUST sanitize first, create a clean Blob, render to `ImageBitmap`, and draw to canvas with crisp anti-aliasing.
- ICO files MUST be generated as multi-resolution packages (16x16, 32x32, 48x48) using native binary packaging.

### 4. Fast Compression & Archiving
- ZIP generation MUST use `fflate` for multi-threaded, ultra-low memory DEFLATE compression.
- PDF generation MUST use `pdf-lib` with optimal page embedding (`embedPng`, `embedJpg`) and customizable page dimensions (Original, A4, Letter).

---

## Enforcement Checklist
Before completing ANY task:
- [ ] Concurrency-limited Web Worker pool used for conversions
- [ ] Transferable `ArrayBuffer` objects used across thread boundaries
- [ ] All queue components and item rows wrapped in `React.memo`
- [ ] Event callbacks wrapped in `useCallback` and stats calculations in `useMemo`
- [ ] `URL.revokeObjectURL` and `bitmap.close()` called during cleanup
- [ ] No layout shifts or UI freezing during active conversions
- [ ] `npm run typecheck` passes with zero errors
