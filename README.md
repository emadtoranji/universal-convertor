<div align="center">

# ⚡ Universal Convertor

### 100% Free &bull; Zero Server Uploads &bull; Client-Side Concurrency &bull; Total Privacy

[![License: Unlicense](https://img.shields.io/badge/license-Unlicense-blue.svg?style=for-the-badge)](https://unlicense.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript 5+](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Vite 6+](https://img.shields.io/badge/Vite-6.x-646cff.svg?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-CSS_v4-38bdf8.svg?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Zero Uploads](https://img.shields.io/badge/Privacy-Zero_Uploads-10b981.svg?style=for-the-badge)](https://github.com/)

<p align="center">
  <b>Convert images, audio, video, documents, and structured data entirely inside your browser memory.</b><br>
  No cloud queues. No file size limits. No privacy leaks.
</p>

[✨ Live Demo](https://convertor.apidevelopers.ir/) &bull;
[🚀 Quick Start](#-quick-start--how-to-fork--run) &bull;
[📂 Supported Formats](#-supported-format-matrix) &bull;
[🎛️ Conversion Options](#%EF%B8%8F-conversion-options) &bull;
[📜 License](#-license)

---

</div>

## 🌟 Why Universal Convertor?

Most online converters secretly upload your private photos, audio notes, and
confidential documents to cloud servers, queue your jobs behind paywalls, or
downscale quality.

**Universal Convertor is fundamentally different:**

- 🛡️ **100% Client-Side Execution:** Every file is decoded, transformed, and
  encoded directly inside your device's browser memory via Web Workers and
  `OffscreenCanvas`.
- ⚡ **Zero Network Transmissions:** File buffers never leave your machine. Open
  DevTools Network tab and see: zero upload requests!
- 🧵 **Multi-Threaded Worker Pool:** Dynamically scales across your CPU cores
  (`navigator.hardwareConcurrency`) to process dozens of files in parallel
  without freezing the UI.
- 🎯 **Two-Stage Validation Protocol:**
    - **Stage 1 (Pre-Upload):** Immediate extension checking prevents invalid or
      unsupported files (like `.ppt` or `.exe`) from ever being misidentified as
      images.
    - **Stage 2 (Pre-Flight):** Binary Magic Bytes and syntax checking ensure
      file contents genuinely match their extensions before processing.
- 🎨 **Fullscreen Drag & Drop:** Drag files anywhere across the browser viewport
  with smooth background blur and responsive dashed border transitions.
- 📦 **Instant ZIP & Multi-Page PDF:** Client-side ZIP archiving via `fflate`
  and multi-page PDF compilation via `pdf-lib`.

---

## 🚀 Quick Start &bull; How to Fork & Run

You can fork this repository to deploy your own private conversion instance or
contribute enhancements.

### 1. Fork the Repository

Click the **Fork** button at the top-right of the GitHub repository page to
create a copy under your account.

### 2. Clone Your Fork

```bash
git clone https://github.com/<your-username>/universal-convertor.git
cd universal-convertor
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Build for Production

```bash
npm run build
```

The optimized static production bundles will be compiled to the `dist/`
directory.

### 6. Run Test Suite

```bash
npm test
```

Executes all unit, security, and format matrix compatibility tests.

---

## 📂 Supported Format Matrix

| Category                | Input Formats                                                               | Compatible Output Formats                                                           | Processing Engine                    |
| ----------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------ |
| **🖼️ Images**           | `PNG`, `JPEG`, `WebP`, `AVIF`, `SVG`, `BMP`, `ICO`, `GIF`, `TIFF`, `HEIC`   | `WebP`, `AVIF`, `PNG`, `JPEG`, `ICO`, `BMP`, `TIFF`, `PDF`                          | Hardware Canvas / Web Workers        |
| **🎵 Audio**            | `WAV`, `MP3`, `OGG`, `FLAC`, `AAC`, `M4A`                                   | `WAV`, `MP3`                                                                        | Web Audio API / PCM Encoder          |
| **🎬 Video**            | `MP4`, `WebM`, `MOV`, `MKV`, `OGV`                                          | `Audio (WAV)`, `Audio (MP3)`, `Animated GIF`, `WebM`, `Frame (PNG)`, `Frame (JPEG)` | HTML5 Video / MediaRecorder / Canvas |
| **📄 Documents & Data** | `PDF`, `Markdown (.md)`, `HTML`, `JSON`, `CSV`, `TSV`, `TXT`, `XML`, `YAML` | `JSON`, `XML`, `YAML`, `HTML`, `Markdown`, `CSV`, `TSV`, `TXT`, `PDF`               | Pure Client-Side Parser & `pdf-lib`  |

---

## 🎛️ Conversion Options

Universal Convertor provides fine-grained control over output quality,
dimensions, and formatting:

- **Quality Compression:** Adjustable 1% to 100% lossy slider (WebP, AVIF, JPEG,
  Snapshot).
- **Dimension Resizing:**
    - `Original`: Keeps original pixel dimensions.
    - `Percentage`: Scale resolution from 10% to 300%.
    - `Exact Dimensions`: Custom Width × Height with optional aspect ratio lock.
- **Background Color Fill:** Solid HEX color replacement for transparent
  backgrounds when converting PNG/SVG to JPEG or BMP.
- **EXIF Metadata Stripping:** Automatically removes camera geolocation and
  device metadata for maximum privacy.
- **PDF Configuration:** Select page size (`A4`, `US Letter`, `Original`) and
  orientation (`Portrait`, `Landscape`, `Auto`).
- **Audio Configuration:** 16-bit Standard, 24-bit Studio, or 32-bit Float PCM,
  with customizable sample rates (16kHz to 48kHz).
- **JSON Formatting:** Pretty-printed 2-space indentation, minification, and
  alphabetical key sorting for clean version diffs.

---

## 🔒 Security Architecture

```
User File (Local Device)
       │
       ▼
1. Stage 1: Extension Registry Validation (Rejects invalid formats instantly)
       │
       ▼
2. Fullscreen Drag & Drop Viewport Capture
       │
       ▼
3. Stage 2: Binary Magic Bytes Inspection (Verifies signature matches extension)
       │
       ├──► Web Worker Pool (Concurrency-Limited Image Transformation)
       ├──► Web Audio API (In-Memory Audio Processing & WAV Encoding)
       ├──► HTML5 Video & Canvas (Audio Extraction, GIF, & Frame Capture)
       └──► Client Document Parser (JSON/XML/YAML/CSV/Markdown)
       │
       ▼
4. Local Output Blob ──► Instant Direct Download or ZIP Archiving (0 Uploads)
```

- **SVG Sanitization:** All incoming SVG documents pass through DOMParser to
  strip `<script>`, `<foreignObject>`, inline `on*` event handlers, and data
  URIs.
- **Prototype Pollution Defense:** Strict key copying and defensive schema
  validation prevent object prototype poisoning.
- **Memory Cleanup:** Bitmaps are disposed immediately after rendering
  (`bitmap.close()`), and object URLs are revoked upon card dismissal.

---

## 🌐 Cloudflare Workers & 30-Day Caching

Universal Convertor is optimized for ultra-fast global delivery via Cloudflare
Workers Static Assets:

- **30-Day Immutable Caching:**
  `Cache-Control: public, max-age=2592000, immutable` on all scripts, styles,
  images, and fonts.
- **Instant HTML Revalidation:**
  `Cache-Control: public, max-age=0, must-revalidate` on HTML entrypoints.
- **SPA Clean Routing:** Automatic 301 redirection of subpaths to `/`.
- **Complete SEO & AI Bot Access:** Native `robots.txt`, `sitemap.xml`, and
  `/llms.txt` allowing indexing by Googlebot, GPTBot, ClaudeBot, and Perplexity.

---

## 📜 License

This project is released into the **public domain** under
**[The Unlicense](LICENSE)**.

You are completely free to copy, modify, distribute, publish, or sell this
software for personal or commercial purposes without any copyright restrictions
or royalties.
