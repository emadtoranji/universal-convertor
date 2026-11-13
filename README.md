<div align="center">

# Universal Convertor

Convert images, documents, and dates in the browser. Files stay on your device.

[![License: Unlicense](https://img.shields.io/badge/license-Unlicense-blue.svg?style=for-the-badge)](https://unlicense.org/)
[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Privacy: no uploads](https://img.shields.io/badge/Privacy-no_uploads-10b981.svg?style=for-the-badge)](https://github.com/emadtoranji/universal-convertor)

[Live demo](https://convertor.apidevelopers.ir/) ·
[Date converter](https://convertor.apidevelopers.ir/date) ·
[Quick start](#quick-start) ·
[Formats](#supported-formats) ·
[License](#license)

</div>

## What it does

Universal Convertor is a free static web app. Decoding, conversion, and encoding all run in your browser. File bytes are not sent to a server.

- **Images.** Convert and compress common image formats, including HEIC/HEIF and Photoshop PSD composites. Work runs in a Web Worker pool sized to `navigator.hardwareConcurrency`, so the page stays responsive while several files convert at once.
- **Documents and tables.** Convert Markdown, HTML, plain text, XML, CSV, TSV, and JSON in memory. CSV and TSV follow RFC 4180 quoting rules.
- **Dates.** Convert one date across Solar Hijri (Jalali), Gregorian, and Lunar Hijri. Open it from the [date converter](https://convertor.apidevelopers.ir/date).
- **Packaging.** Download a batch as a ZIP (`fflate`) or combine images into one multi-page PDF (`pdf-lib`).

Drop files anywhere on the page. The app checks the extension first, then checks the file signature (magic bytes) so a renamed file is not treated as a format it is not.

## Date converter

The date tool is a separate page at `/date`. It does not upload the date you enter.

Three calendars stay in sync. Change the year, month, or day on any one of them and the other two update immediately. The conversion uses Julian Day Number math in the browser:

- **Solar Hijri (Jalali)** uses the 33-year astronomical leap cycle used in Iran and Afghanistan.
- **Gregorian** follows the civil leap-year rule and can be copied as an ISO 8601 date.
- **Lunar Hijri** follows the Umm al-Qura month lengths.

Each calendar shows whether the year is a leap year, how many days the month has, and the weekday. The page also shows a Jalali `YYYY-MM-DD` string and the Unix timestamp (seconds since 1970-01-01 UTC). You can step a date forward or back, jump to today, or copy any of those values.

## Supported formats

| Kind | You can open | You can save as |
| --- | --- | --- |
| Images | PNG, JPG, JPEG, JFIF, WebP, AVIF, HEIC/HEIF, SVG, BMP, ICO, GIF, TIFF, PSD | WebP, AVIF, PNG, JPEG, ICO, BMP, TIFF, PDF |
| Documents and tables | Markdown, HTML, plain text, XML, CSV, TSV, JSON | Markdown, HTML, plain text, XML, CSV, TSV, JSON |
| Dates | Solar Hijri, Gregorian, Lunar Hijri | The same three calendars, plus ISO 8601, Jalali `YYYY-MM-DD`, and a Unix timestamp |

ICO output packs 16, 32, 48, 64, 128, and 256 pixel sizes into one file. SVG input is parsed and stripped of scripts, `foreignObject`, inline event handlers, and data URIs before it is drawn.

## Conversion options

- **Quality.** 1% to 100% for WebP, AVIF, and JPEG.
- **Size.** Keep the original pixels, scale by a percentage (10% to 300%), or set an exact width and height. You can lock the aspect ratio.
- **Background.** Fill transparency with a solid color when the output format has no alpha channel, such as JPEG or BMP.
- **Monochrome.** Convert an image to grayscale.
- **EXIF.** Camera location and device metadata are removed from the output.
- **PDF.** Choose A4, US Letter, or the original page size, and portrait, landscape, or automatic orientation.
- **JSON.** Pretty-print with two-space indentation, minify, or sort keys alphabetically.

## Quick start

Requirements: Node.js and npm. Continuous integration runs on Node.js 24.

```bash
git clone https://github.com/emadtoranji/universal-convertor.git
cd universal-convertor
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The date converter is at [http://localhost:3000/date](http://localhost:3000/date).

```bash
npm test          # unit tests
npm run typecheck # TypeScript
npm run build     # static files in dist/
```

To publish your own copy, fork the repository, clone your fork, and deploy the `dist/` folder as static files. The included Cloudflare Worker sets long-lived cache headers on scripts, styles, images, and fonts (`max-age=2592000, immutable`) and revalidates HTML on each request.

## Privacy

A file is read only in browser memory. After a conversion, bitmaps are closed and object URLs are revoked when you dismiss a result. Open the browser network panel during a conversion and you should see no upload of the file.

SVG documents are sanitized before use. Structured data is copied with an allowlist of keys so untrusted JSON cannot overwrite `Object.prototype`.

## License

This project is released into the public domain under [The Unlicense](LICENSE).

You can copy, modify, distribute, publish, or sell it for any purpose, personal or commercial, with no royalties.
