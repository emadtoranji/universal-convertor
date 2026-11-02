---
trigger: always_on
---

# RULE: security — Client-Side Zero-Upload Security, SVG Sanitization, Magic Bytes & Memory Protection

## Core Mandate — ALWAYS ON
This rule is ALWAYS ACTIVE for every task, every file, every code change — no exceptions.
Security is the **#1 Highest Priority** — above performance, above UX, above convenience.

---

## ABSOLUTE PROHIBITIONS

### 1. ZERO NETWORK UPLOADS & ZERO EXTERNAL EXFILTRATION
- NEVER upload or transmit user files, buffers, image data, base64 strings, or file metadata to any external server, third-party service, API endpoint, or tracking provider.
- All file decoders, encoders, resizers, and archivers MUST run 100% locally in browser memory or dedicated Web Workers.
- Network requests during file conversion are a CRITICAL SECURITY BREACH.

### 2. ZERO UNSANITIZED SVG RENDERING
- Raw user-provided SVGs MUST NEVER be rendered into the DOM, Canvas, or an `<img>` tag without passing through `sanitizeSvgString` (`src/utils/svgSanitizer.ts`).
- Any SVG containing `<script>`, `<foreignObject>`, `<iframe>`, `<embed>`, `<object>`, `<audio>`, `<video>`, `<animate>`, `<set>`, `javascript:`, `data:text/html`, or inline event listeners (`onload`, `onerror`, `onclick`, `on*`) MUST be stripped or rejected immediately.

### 3. ZERO BLIND MIME OR EXTENSION TRUST
- NEVER trust file names or browser-supplied MIME types alone (`file.type`).
- EVERY file MUST be validated by inspecting its binary Magic Bytes (`validateMagicBytes` in `src/utils/magicBytes.ts`) on the first 16 to 64 bytes before dispatching to decoders or Web Workers.
- Files with spoofed extensions or malicious binary signatures must be rejected or quarantined.

### 4. ZERO PROTOTYPE POLLUTION
- Options merging, configuration updates, and payload parsing MUST use explicit shallow copies or guarded assignments.
- Keys matching `__proto__`, `constructor`, or `prototype` MUST NEVER be processed dynamically.

### 5. ZERO MEMORY LEAKS & ZERO PERSISTENT OBJECT URLS
- Every `URL.createObjectURL` MUST have a corresponding `URL.revokeObjectURL` executed as soon as the preview is unmounted, regenerated, cleared, or replaced.
- Every `ImageBitmap` created with `createImageBitmap` MUST be immediately closed with `bitmap.close()` once transferred or rendered to canvas.
- Failing to revoke object URLs or close bitmaps causes browser memory exhaustion and tab crashes.

---

## Strict Security Standards

### 1. Magic Bytes Validation Protocol (`src/utils/magicBytes.ts`)
- The first 16 to 64 bytes of every input `File` / `ArrayBuffer` MUST be inspected for known binary signatures:
  - PNG: `89 50 4E 47 0D 0A 1A 0A`
  - JPEG: `FF D8 FF`
  - WebP: `52 49 46 46 ... 57 45 42 50`
  - GIF: `47 49 46 38`
  - TIFF: `49 49 2A 00` (Little Endian) or `4D 4D 00 2A` (Big Endian)
  - BMP: `42 4D`
  - ICO: `00 00 01 00`
  - AVIF / HEIC: `ftyp` box matching `avif`, `avis`, `heic`, `heix`, `mif1`
  - SVG: Clean XML header / `<svg` root element verified via text inspection

### 2. SVG Sanitization Architecture (`src/utils/svgSanitizer.ts`)
- Use DOMParser in the browser to parse XML.
- Strict element allowlist: only graphical SVG elements (`svg`, `path`, `g`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `defs`, `linearGradient`, `radialGradient`, `stop`, `clipPath`, `pattern`, `text`, `tspan`, `use`).
- Dangerous tags strictly removed: `<script>`, `<foreignObject>`, `<audio>`, `<video>`, `<source>`, `<iframe>`, `<embed>`, `<object>`, `<style>` with external `@import`, `<animate>`, `<set>`.
- Attribute sanitization: Strip all attributes matching `/^on[a-z]+/i` (event handlers), and strip attributes containing `javascript:`, `vbscript:`, `data:text/html`, or external URLs.

### 3. Resource Exhaustion & DoS Prevention
- **Dimension Clamping:** Check image dimensions before allocating canvas buffers. Reject or downscale images exceeding `16384 x 16384` pixels to prevent GPU/browser memory panics.
- **Worker Pool Throttling:** Limit concurrent Web Worker threads to `navigator.hardwareConcurrency` (clamped between 2 and 8).
- **Buffer Transfer:** Use Transferable `ArrayBuffer` objects (`postMessage({ ... }, [buffer])`) to transfer memory ownership rather than deep copying massive buffers across thread boundaries.

### 4. HTTP & Edge Security Headers (`next.config.ts` & `src/worker-edge.ts`)
The server and edge workers must continuously send:
- `Content-Security-Policy`:
  `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://picsum.photos; font-src 'self' data:; worker-src 'self' blob:; connect-src 'self' data: blob:; object-src 'none'; base-uri 'self';`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`

---

## Enforcement Checklist
Before completing ANY task:
- [ ] Zero network requests for file conversions (100% client-side memory)
- [ ] Magic byte verification enforced on all file inputs
- [ ] SVG inputs strictly sanitized before rendering
- [ ] `URL.revokeObjectURL` called on obsolete preview and result URLs
- [ ] `ImageBitmap.close()` called immediately after canvas drawing
- [ ] Prototype pollution guards present in options handling
- [ ] Security headers maintained in both `next.config.ts` and `src/worker-edge.ts`
- [ ] `npm run typecheck` passes with zero errors
