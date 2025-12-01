# AI Guide: nano-rfc6902

This document provides project context for AI/codegen assistants: structure, utilities, build, code standards, and contribution workflow.

## Repository overview

Key files and directories:

- [`package.json`](package.json)
- [`tsconfig.json`](tsconfig.json)
- [`vite.config.ts`](vite.config.ts)
- [`eslint.config.js`](eslint.config.js)
- [`.prettierrc.json`](.prettierrc.json)
- [`src/index.ts`](src/index.ts)
- [`src/applyPatch.ts`](src/applyPatch.ts)
- [`src/createPatch.ts`](src/createPatch.ts)
- [`src/types.ts`](src/types.ts)
- [`src/utils/utils.ts`](src/utils/utils.ts)
- [`src/utils/isSafeApply.ts`](src/utils/isSafeApply.ts)
- [`src/isSafeApply.ts`](src/isSafeApply.ts)
- [`src/tests/`](src/tests)
- [`src/utils/tests/`](src/utils/tests)
- [`README.md`](README.md)

### File tree (abridged)

```
.
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── index.ts
│   ├── applyPatch.ts
│   ├── createPatch.ts
│   ├── types.ts
│   ├── isSafeApply.ts           # public wrapper for isSafeApply entry
│   └── utils/
│       ├── utils.ts
│       └── isSafeApply.ts       # implementation
│
│   ├── tests/
│   │   ├── applyPatch.test.ts
│   │   └── createPatch.test.ts
│   └── utils/tests/
│       ├── isSafeApply.test.ts
│       └── utils.test.ts
└── README.md
```

## Build system

- Bundler: Vite library mode with Rollup under the hood. See [`vite.config.ts`](vite.config.ts).
- Type generation: `vite-plugin-dts` configured to emit flattened declarations for public entries only.
- Targets: ES2020, outputs ESM and CJS with sourcemaps.
- Public entries:
  - Main bundle: [`src/index.ts`](src/index.ts) → `dist/index.{js,cjs,d.ts}`
  - Utility bundle: [`src/isSafeApply.ts`](src/isSafeApply.ts) → `dist/isSafeApply.{js,cjs,d.ts}`

Scripts (from [`package.json`](package.json)):

- dev: `vite`
- build: `tsc && vite build`
- test: `vitest`
- coverage: `vitest --coverage run`
- lint: `eslint . --cache`
- prettier: `prettier --write .`
- size: `npm run build && size-limit`

## Public API surface

Exposed via subpath exports in [`package.json`](package.json):

- `nano-rfc6902` → main API (`createPatch`, `applyPatch`, types)
- `nano-rfc6902/isSafeApply` → standalone utility

Import examples (ESM):

```js
import { createPatch, applyPatch } from "nano-rfc6902";
import { isSafeApply } from "nano-rfc6902/isSafeApply";
```

CommonJS:

```js
const { createPatch, applyPatch } = require("nano-rfc6902");
const { isSafeApply } = require("nano-rfc6902/isSafeApply");
```

## Utilities

- isSafeApply: checks that a patch only addresses object properties (no array indices or `-`). Implementation: [`src/utils/isSafeApply.ts`](src/utils/isSafeApply.ts), public entry wrapper: [`src/isSafeApply.ts`](src/isSafeApply.ts).
- JSON Pointer helpers used by utils are in [`src/utils/utils.ts`](src/utils/utils.ts).

## Coding standards

- Language: TypeScript, strict mode. See [`tsconfig.json`](tsconfig.json).
  - `"strict": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, `"noFallthroughCasesInSwitch": true`
  - `"moduleResolution": "bundler"`, `"target": "ES2020"`, `"lib": ["ES2020","DOM"]`
- Module format: Project is ESM-first (`"type": "module"`), builds export both ESM and CJS.
- Linting: ESLint v9, config in [`eslint.config.js`](eslint.config.js).
- Formatting: Prettier v3, config in [`.prettierrc.json`](.prettierrc.json).
- Tests: Vitest. Tests live under [`src/tests`](src/tests) and [`src/utils/tests`](src/utils/tests). File names end with `.test.ts`.
- File naming: camelCase for files, lowercased directories. Public entries can have top-level files under `src/` for clarity (e.g., [`src/isSafeApply.ts`](src/isSafeApply.ts)).

## Conventions

- Types mirror RFC 6902 in [`src/types.ts`](src/types.ts).
- Patching is in-place; `applyPatch` mutates the target.
- Paths use JSON Pointer (RFC 6901).
- Zero runtime dependencies; keep implementation minimal and portable.

## Adding a new utility

1. Implement under [`src/utils`](src/utils) (e.g., `src/utils/foo.ts`) and write tests in [`src/utils/tests`](src/utils/tests) (e.g., `foo.test.ts`).
2. Decide exposure:
   - Main bundle: export from [`src/index.ts`](src/index.ts).
   - Separate entry: create a thin wrapper at `src/Foo.ts` that re-exports from utils:
     ```ts
     // src/Foo.ts
     export { Foo } from "./utils/Foo";
     ```
   - Then:
     - Add the entry in [`vite.config.ts`](vite.config.ts) under `build.lib.entry`.
     - Update subpath exports in [`package.json`](package.json).
     - Ensure `vite-plugin-dts` includes the new public entry and excludes tests.
3. Run `npm run build` and verify `dist/Foo.{js,cjs,d.ts}`.

## Testing

- Unit tests with Vitest:
  ```bash
  npm test
  npm run test:ui
  ```
- Keep tests colocated under `src/**/tests` to allow type-only emission while excluding tests from published typings.

## Size and performance

- Size budgets configured in [`.size-limit.json`](.size-limit.json). Check with:

  ```bash
  npm run size
  ```

- Prefer simple loops and small helpers; avoid heavy abstractions.

## Release checklist (for maintainers and AIs)

- [ ] Lint and format clean (`npm run lint`, `npm run prettier`)
- [ ] All tests green (`npm test`)
- [ ] Build succeeds and dist contains only expected root artifacts
- [ ] README updated for any new public API
- [ ] Package exports updated if new entries added

## Notes for AI assistants

- When editing files, prefer minimal diffs. For code-gen, keep to existing patterns.
- Avoid exporting internal modules directly; expose via top-level wrappers when creating new entries.
- When adding entries, also update docs and tests.

## References

- RFC 6902 (JSON Patch)
- RFC 6901 (JSON Pointer)
