---
trigger: always_on
---

# RULE: components — Component-First Architecture, Strict Typing & Memoization

## Core Mandate — ALWAYS ON
This rule is ALWAYS ACTIVE for every task, every file, every code change — no exceptions.

---

## ABSOLUTE PROHIBITIONS

### ZERO INLINE UI DUPLICATION
- Reusable UI patterns (headers, dropzones, queue cards, modals, format selectors, sliders) MUST reside in focused components under `src/components/`.
- Copy-pasting JSX blocks or state logic across files is STRICTLY FORBIDDEN.
- Search `PROJECT_STRUCTURE.md` and `src/components/` first before creating any component.

### ZERO `any` IN COMPONENT PROPS OR CALLBACKS
- Every component MUST define a complete, strictly typed `interface ComponentNameProps { ... }`.
- Using `any` in props, event types, or callback arguments is ABSOLUTELY FORBIDDEN.
- React event signatures must be typed explicitly: `React.ChangeEvent<HTMLInputElement>`, `React.DragEvent<HTMLDivElement>`, etc.

### ZERO UNMEMOIZED MODULAR COMPONENTS
- All primary UI components (`Header`, `Dropzone`, `ConversionToolbar`, `FileQueueItem`, `PreviewModal`) MUST be exported with `React.memo(ComponentName)`.
- Re-rendering all items when one item finishes conversion is a performance bug.

---

## Component Architecture Matrix

| Component | File Path | Scope & Purpose |
|---|---|---|
| `Header` | `src/components/Header.tsx` | Sticky top navigation, branding, theme toggle, and live queue count badge |
| `Dropzone` | `src/components/Dropzone.tsx` | Drag-and-drop zone, file input, clipboard paste listener, and quick-test sample image generators |
| `ConversionToolbar` | `src/components/ConversionToolbar.tsx` | Global target format selection, quality slider, advanced controls (resize, background color, EXIF toggle, PDF settings), and batch action triggers |
| `FileQueueItem` | `src/components/FileQueueItem.tsx` | Individual queued file card, thumbnail, metadata, progress bar, format selector, regenerate button, compare, download, and remove actions |
| `PreviewModal` | `src/components/PreviewModal.tsx` | Interactive Before/After image comparison modal with interactive split slider and side-by-side view |

---

## Component Creation & Modification Protocol
1. **Search First:** Always check `PROJECT_STRUCTURE.md` before adding a new component.
2. **Strict Named Exports:** Always export as a named constant or component:
   ```tsx
   const MyComponent: React.FC<MyComponentProps> = ({ ... }): React.ReactElement => {
     return ( ... );
   };
   export const MyComponent = React.memo(MyComponent);
   ```
3. **Zero Code Comments:** Never include `//`, `/* */`, or `{/* */}` inside the component file.
4. **Mobile First:** Ensure all layout grids and flex containers degrade gracefully on narrow viewports.

---

## Enforcement Checklist
Before completing ANY component modification:
- [ ] Explicit TypeScript props interface with zero `any`
- [ ] Component wrapped with `React.memo`
- [ ] No duplicated UI blocks
- [ ] Mobile-first responsive layout tested
- [ ] Zero comments in code file
- [ ] `npm run typecheck` passes with zero errors
