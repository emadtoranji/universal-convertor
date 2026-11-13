# Contributing

Thanks for taking a look. This app converts files and dates in the browser. Pull requests that keep that behavior intact are welcome.

## Set up

```bash
git clone https://github.com/emadtoranji/universal-convertor.git
cd universal-convertor
npm install
npm run dev
```

The file converter is at [http://localhost:3000](http://localhost:3000). The date converter is at [http://localhost:3000/date](http://localhost:3000/date).

## Before you open a pull request

Run both of these. Continuous integration on `main` runs the same checks.

```bash
npm run typecheck
npm test
```

Format changed files with Prettier if the diff is noisy:

```bash
npm run prettier
```

## What makes a good change

- Keep a pull request to one topic. A bug fix and a new format are easier to review apart.
- Match the style of the file you edit. UI copy lives in `src/utils/i18n/locales/`.
- Do not add a network upload for user files. Conversion stays in the browser.
- Do not commit secrets, lockfile churn unrelated to your change, or generated `dist/` output.

## Reporting issues

Use the bug report or feature request template. For a security problem, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
