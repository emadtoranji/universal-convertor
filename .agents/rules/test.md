---
trigger: always_on
---

# RULE: test — Client-Side Pure Logic Testing & Four-Tier Input Coverage Protocol

## Core Mandate — ALWAYS ON
This rule is ALWAYS ACTIVE for every task, every file, every code change — no exceptions.
Testing pure algorithms, validators, sanitizers, and format matrix resolvers is essential to ensure zero regressions and robust client-side reliability.

---

## ⛔ ZERO SERVER/DATABASE DEPENDENCY MANDATE
- This project is a **100% Client-Side Web Application**. Tests must NEVER attempt to connect to external servers, cloud databases, or third-party APIs.
- All tests execute strictly in-memory using pure mock buffers and synthetic files.

---

## Testing Architecture & Directory Structure

All tests reside under `/tests` using the Node.js native test runner (`node:test`, `node:assert/strict`):

```
tests/
├── unit/                  # Pure functions (magicBytes, svgSanitizer, zipArchiver, converter options)
├── formats/               # Format matrix compatibility and extension mappings
└── security/              # Attack payloads, XSS filter tests, prototype pollution guards
```

---

## Technical Standards for Tests

### 1. Test Runner & Assertions
- Use the Node.js native test runner:
  ```ts
  import { describe, it } from 'node:test';
  import assert from 'node:assert/strict';
  ```
- Fast execution with zero external test framework bloat.

### 2. Four-Tier Input Coverage Mandate
Every test suite for a utility must systematically cover four input tiers:
1. **Normal Inputs:** Expected valid buffers (PNG magic bytes, valid SVG text, standard conversion options).
2. **Empty / Boundary Inputs:** Empty `ArrayBuffer(0)`, `""`, `null`, `undefined`, extreme quality numbers (`0`, `100`), extreme dimensions.
3. **Malformed Inputs:** Truncated byte buffers, corrupted XML, mismatched extensions.
4. **Malicious / Attack Inputs:** SVGs containing `<script>`, `onload`, nested iframes, prototype pollution keys (`__proto__`, `constructor`), excessively massive dimensions.

### 3. Strict Code Quality in Tests
- Zero `any`, zero non-null assertions (`!`), and zero unsafe type casts.
- 100% complete test implementations — zero placeholders or `TODO` comments.
- ZERO comments in test files.

---

## Enforcement Checklist
Before completing ANY utility or algorithm task:
- [ ] New pure logic covered by tests in `/tests`
- [ ] Four-tier input coverage tested (normal, boundary, malformed, attack)
- [ ] Node.js native test runner (`node:test`, `node:assert/strict`) used
- [ ] Zero comments in test files
- [ ] `npm run typecheck` passes with zero errors
