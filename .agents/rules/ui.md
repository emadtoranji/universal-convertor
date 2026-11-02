---
trigger: always_on
---

# RULE: ui — UI/UX Pro Max Design System, Layout Priority & Styling Standards

## Core Mandate — ALWAYS ON
This rule is ALWAYS ACTIVE for every task, every file, every code change — no exceptions.

---

## 1. Top-Of-Page Operations Layout Mandate (NON-NEGOTIABLE)
- **Dropzone & Operations Workspace at the VERY TOP:**
  - The file dropzone, clipboard paste trigger, and sample test buttons MUST be positioned at the top of the main content area, immediately below the global header.
  - When files are queued or converting, the conversion toolbar and file queue list MUST remain at the top.
  - Users MUST be able to drop and convert files immediately upon landing without scrolling past promotional copy or hero sections.
- **Informational & SEO Content Below:**
  - Comprehensive headline, 100% Free SEO descriptions, feature cards, supported format matrix, and FAQ accordion MUST be positioned below the operational workspace.

---

## 2. ABSOLUTE PROHIBITIONS

### ZERO EMOJI OR RAW TEXT AS INTERACTIVE CONTROLS
- Using raw emoji (e.g. `✓`, `🗑️`, `❌`, `👁️`, `⬇️`) or unicode symbols as interactive button labels, status indicators, or action triggers is STRICTLY FORBIDDEN.
- ONLY `lucide-react` icons (e.g. `CheckCircle2`, `Trash2`, `Download`, `Eye`, `RotateCcw`, `UploadCloud`) are permitted.

### ZERO UNRESPONSIVE OR FIXED-WIDTH CONTAINERS
- Hardcoding fixed pixel widths (e.g. `w-[600px]`, `w-[900px]`) that overflow on mobile screens is STRICTLY FORBIDDEN.
- All views, cards, modals, and lists MUST be fully mobile-first and responsive across 320px phones up to 4K monitors.

### ZERO ARBITRARY INLINE HEX COLORS
- Inline CSS `style={{ color: '#123456' }}` or arbitrary uncurated hex values in code are forbidden.
- Use the curated Tailwind CSS design tokens: `zinc-*` for neutral surfaces/text, `cyan-*` for primary brand accents, `emerald-*` for success/savings, `indigo-*` for secondary highlights, and `pink-*` for vector badges.

### ZERO WHITE-ON-WHITE DROPDOWN BUGS
- All `<select>` and `<option>` elements MUST specify dark and light background and text color classes (`bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100`) so option lists never render illegible white-on-white text in browser native menus.

---

## 3. Styling & Theming Standards

### Tailwind CSS v4 Engine
- Styling engine: Tailwind CSS v4 via `@import "tailwindcss";` in `app/globals.css`.
- Zero legacy `tailwind.config.js`.
- Modern syntax: `bg-color/80`, `border-zinc-800/80`, `backdrop-blur-xl`.

### Seamless Dark & Light Mode Toggle
- The root document element (`html`) toggles between `.dark` and default light mode.
- System/user preference is preserved in `localStorage.getItem('omni_theme')`.
- All text and surfaces must support both modes:
  - Backgrounds: `bg-zinc-50 dark:bg-zinc-950`, `bg-white dark:bg-zinc-900/70`.
  - Borders: `border-zinc-200 dark:border-zinc-800/80`.
  - Typography: `text-zinc-900 dark:text-zinc-100`, `text-zinc-600 dark:text-zinc-400`.

### Typography & Heading Hierarchy
- Maintain strict semantic heading hierarchy (`h1` -> `h2` -> `h3` -> `h4`).
- Exactly ONE `<h1>` per page.
- Clean high-contrast fonts: System UI font stack (`font-sans`) for primary text and `font-mono` for dimensions, byte counts, and percentages.

### Accessibility (a11y)
- **Focus Rings:** Interactive elements must have clear focus rings (`focus-visible:ring-2 focus-visible:ring-cyan-500`).
- **Accessible Names:** Icon-only buttons MUST have `aria-label` and `title` attributes.
- **Modal Isolation:** Modal dialogs must trap focus, dismiss on backdrop click or close button, and prevent background body scrolling when open.

---

## Enforcement Checklist
Before completing ANY task that touches UI or styling:
- [ ] Dropzone and operations workspace verified at the top of the viewport
- [ ] SEO copy, features, format matrix, and FAQ placed below operations
- [ ] Dark and light theme toggle tested and verified
- [ ] Lucide React icons used contextually for all interactive triggers
- [ ] Mobile responsive layout tested at 375px viewport with zero overflow
- [ ] Dropdowns and options verified legible in both themes
- [ ] `npm run typecheck` passes with zero errors
