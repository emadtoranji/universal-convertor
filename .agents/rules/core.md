---
trigger: always_on
---

# RULE: core — Platform Architecture, Antigravity Agent Standards & Execution Protocol

## Core Mandate — ALWAYS ON
This rule is ALWAYS ACTIVE for every task, every file, every code change — no exceptions.
All other rules in `.agents/rules/` (`security.md`, `seo.md`, `performance.md`, `cache.md`, `ui.md`, `components.md`, `test.md`, `git.md`) are ALWAYS ACTIVE and MUST be obeyed simultaneously.

---

## 1. Project Identity & Architecture
**Universal Convertor** is a high-performance, 100% client-side, zero-upload universal image and document converter web application.
- **Framework & Runtime:** React 19 + TypeScript 5.x/7.x (Strict Mode) + Next.js 15+ App Router (Google AI Studio development & preview) + Vite 6+ build target for Cloudflare Workers Static Assets.
- **Edge & Cloud Deployment:** Cloudflare Workers Static Assets (`wrangler.json`, `src/worker-edge.ts`) + Google AI Studio containerized preview.
- **Local Conversion Engine:** 
  - Concurrency-limited Web Worker pool (`navigator.hardwareConcurrency`).
  - Native `OffscreenCanvas` & `createImageBitmap` for standard formats.
  - Zero server-side file transmission; all processing happens in browser memory.
  - `pdf-lib` for client-side single & multi-page PDF generation.
  - `fflate` for ultra-fast local ZIP archiving.
  - `zod` for runtime validation.

---

## 2. Priority Hierarchy (STRICT & NON-NEGOTIABLE)
1. **Security & Zero Cloud Uploads** — see `rules/security.md`
2. **Performance & Concurrency** — Web Workers, Transferables, Memoization — see `rules/performance.md`
3. **Anti-Duplication & Clean Code** — search `PROJECT_STRUCTURE.md` before creating any file
4. **UX & Layout Priority** — Operations area & Dropzone at the VERY TOP, followed by SEO copy, features, format matrix, and FAQ — see `rules/ui.md`
5. **SEO, GEO & AEO Standards** — Schema.org JSON-LD, `/llms.txt`, direct-answer answers — see `rules/seo.md`

---

## 3. ABSOLUTE PROHIBITIONS

### ZERO COMMENTS IN CODE FILES (STRICT MANDATE)
- Writing ANY comments inside code files (`.ts`, `.tsx`, `.js`, `.mjs`, `.css`, `.json`) is STRICTLY FORBIDDEN.
- Zero inline comments (`//`), zero block comments (`/* */`), and zero JSX comments (`{/* */}`).
- All code MUST be self-documenting with clean, expressive naming.

### ZERO SERVER UPLOADS & ZERO NETWORK DATA LEAKS
- Transmitting file buffers, blobs, base64 strings, or file metadata to any external server, cloud bucket, or API is STRICTLY AND CATEGORICALLY FORBIDDEN.
- Conversions MUST remain 100% client-side inside the user's browser memory.

### ZERO `any` TYPES
- `any` anywhere in TypeScript code is ABSOLUTELY FORBIDDEN.
- `// @ts-ignore` and `// @ts-expect-error` are FORBIDDEN. Fix the underlying type.
- All function parameters, return types, state hooks, and handlers MUST have explicit types.

### ZERO HARDCODED STYLES & ZERO ARBITRARY Z-INDEXES
- Arbitrary inline CSS styles (`style={{ ... }}`) for layout are forbidden.
- Arbitrary numeric z-indexes (e.g. `z-[99999]`) are forbidden. Use semantic classes or standard Tailwind layering.

### ZERO ORPHANED SCRIPTS
- Temporary agent scratch files, test runner scripts, or debug dumps MUST be deleted immediately upon task completion.

---

## 4. Antigravity Agent Execution Efficiency & Token Preservation

### TOKEN & CPU PRESERVATION MANDATE
1. **Search-First Protocol:** YOU MUST search `PROJECT_STRUCTURE.md`, `src/components/`, and `src/utils/` BEFORE creating any new file or utility.
2. **Never run recursive directory listings** (`list_dir` on `/` or deep trees) to discover files — inspect `PROJECT_STRUCTURE.md` first.
3. **Validation Command:** YOU MUST run `npm run typecheck` (`tsc --noEmit`) for fast validation. NEVER run `next build` for routine verification.
4. **Command Combining:** Combine sequential terminal commands with `&&` to reduce round-trip latency.
5. **Code Completeness:** Produce 100% complete, drop-in replacement code — ZERO placeholders, incomplete snippets, or `TODO` markers.
6. **Reusability:** If a utility exists in `src/utils/` (e.g. `magicBytes.ts`, `svgSanitizer.ts`), import it. Do not rewrite logic.
7. **Verification Loop:** Follow Ultra Mode verification: verify types with `npm run typecheck`, run linter with `npm run lint`, and verify visual/operational behavior with `playwright-cli` when UI changes occur.

---

## 5. Dual Compatibility: Google AI Studio & Cloudflare Workers
- The application must build and run seamlessly in both environments:
  - **Google AI Studio:** Uses Next.js App Router on port 3000 (`/app/layout.tsx`, `/app/page.tsx`, `next.config.ts`).
  - **Cloudflare Workers:** Uses `wrangler.json`, `dist/` directory, and `src/worker-edge.ts` for serving static assets and setting 30-day cache headers.

---

## 6. Post-Task Git Commit Protocol (see rules/git.md)
- After finishing and verifying all modifications, the agent MUST create a local git commit (`git commit`) using Conventional Commits.
- Executing `git push` under ANY circumstances is STRICTLY FORBIDDEN.

---

## Enforcement Checklist
Before marking any task complete:
- [ ] Code is 100% TypeSafe (`npm run typecheck` passes with zero errors)
- [ ] ZERO comments in all touched code files (no `//`, `/* */`, `{/* */}`)
- [ ] Zero server uploads; conversions remain 100% client-side
- [ ] Dropzone and operations workspace positioned at the top of the main viewport
- [ ] Dual compatibility preserved (`wrangler.json` & Next.js config)
- [ ] No temporary/scratch scripts left behind
- [ ] Changes committed locally with Conventional Commits (ZERO `git push`)
