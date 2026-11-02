---
trigger: always_on
---

# RULE: seo — Technical SEO, GEO (Generative Engine Optimization) & AEO (Answer Engine Optimization)

## Core Mandate — ALWAYS ON
This rule is ALWAYS ACTIVE for every task, every file, every code change — no exceptions.
All public-facing routes, metadata, structured data, content formatting, and LLM routes MUST adhere 100% to this three-pillar standard.
The application identity is **Universal Convertor** — emphasizing 100% Free, unlimited, client-side privacy, and high Google & AI search engine ranking.

---

## ABSOLUTE PROHIBITIONS

### ZERO MISSING META & OPENGRAPH DATA
- All entry points (`app/layout.tsx`, `index.html`) MUST maintain descriptive, high-ranking titles and descriptions highlighting:
  - App name: **Universal Convertor**
  - Core proposition: **100% Free Client-Side Image & Document Converter**
  - High-intent keywords: WebP, AVIF, PNG, JPG, SVG, HEIC, TIFF, PDF merge, batch converter, zero cloud upload, private converter.
  - Complete OpenGraph (`og:title`, `og:description`, `og:type`) and Twitter (`summary_large_image`) cards.

### ZERO UNTYPED OR INVALID SCHEMA.ORG JSON-LD
- Writing arbitrary, malformed, or untyped JSON-LD scripts is STRICTLY FORBIDDEN.
- Schema definitions must adhere strictly to Schema.org specifications:
  - `WebApplication` / `SoftwareApplication` with `applicationCategory: "MultimediaApplication"`, `operatingSystem: "Any"`, `offers: { price: "0", priceCurrency: "USD" }`.
  - `FAQPage` with complete `mainEntity` array containing `Question` and `Answer` objects.
- Missing required Schema.org fields (`name`, `description`, `applicationCategory`) is a bug.

### ZERO HEADING HIERARCHY SKIPPING
- Skipping heading levels (e.g. `<h1>` followed directly by `<h3>`) is FORBIDDEN.
- Using more than ONE `<h1>` on the page is STRICTLY FORBIDDEN.
- The `<h1>` MUST be semantic and prominent, highlighting `Universal Convertor`.

### ZERO BLOCKING OF REPUTABLE AI & SEARCH CRAWLERS
- Blocking search or generative AI bots (`Googlebot`, `Bingbot`, `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `Applebot-Extended`, `OAI-SearchBot`) is STRICTLY FORBIDDEN.
- Provide a clean, accessible `/llms.txt` file summarizing engine capabilities for direct ingestion by generative search engines.

---

## The Three Pillars: SEO, GEO & AEO

### 1. Technical SEO (Search Engine Optimization)
- **Title Tag:** Must be concise, keyword-rich, and under 65 characters:
  `Universal Convertor - 100% Free Client-Side Converter`
- **Meta Description:** Must be compelling, under 160 characters, with high search intent:
  `100% Free, private, client-side universal image and document converter. Batch convert PNG, JPG, WebP, AVIF, SVG, HEIC, and PDF with zero server uploads.`
- **Semantic HTML5:** Use `<main>`, `<header>`, `<section>`, `<article>`, `<button>`, `<h1-h4>` contextually.
- **PWA & Web Manifest:** Link `/manifest.json` with theme color, icons, and standalone display mode.

### 2. GEO (Generative Engine Optimization)
Generative AI engines (ChatGPT Search, Perplexity, Google AI Overviews, Claude) extract and synthesize information based on factual clarity and structured data:
- **High Citation Density:** Document specifications clearly (supported input/output formats, hardware acceleration via Web Workers, memory safety, client-side ZIP/PDF generation).
- **Factual, Jargon-Free Copy:** State capabilities unambiguously without vague marketing hype. Emphasize zero-upload privacy guarantees and 100% local processing.
- **LLM Context (`/llms.txt`):** Maintain `/llms.txt` in the root/public directory. It provides AI agents with an instant Markdown summary of supported formats, engine architecture, privacy policy, and usage guide.

### 3. AEO (Answer Engine Optimization)
Answer engines prioritize direct, high-confidence factual answers for featured snippets and voice search:
- **Mandatory Schema.org Structured Data:** Injected via `<script type="application/ld+json">` in `app/layout.tsx`:
  - `SoftwareApplication` / `WebApplication`
  - `FAQPage` schema
- **Direct-Answer Q&A Formatting:**
  - Every question in the FAQ section MUST begin with a direct, single-sentence factual answer before providing secondary details.
  - Example:
    - *Q: Is Universal Convertor really 100% free with no limits?*
    - *A: Yes, absolutely. Because all decoding, resizing, compression, and encoding run entirely within your device browser using native hardware acceleration and Web Workers, there are no cloud server costs or storage bills for us to pass on to you.*

---

## Enforcement Checklist
Before completing ANY task that touches layout, metadata, content, or SEO:
- [ ] Document title and meta description include `Universal Convertor` and 100% Free value proposition
- [ ] Schema.org JSON-LD (`WebApplication` and `FAQPage`) present and valid
- [ ] Single `<h1>` tag with proper heading hierarchy (`h1` -> `h2` -> `h3`)
- [ ] `/llms.txt` maintained and synchronized with current capabilities
- [ ] Direct-answer format applied to all Q&A / FAQ items
- [ ] OpenGraph and Twitter card meta tags present
- [ ] `npm run typecheck` passes with zero errors
