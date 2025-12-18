# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) and AI/codegen assistants when working with code in this repository.

## Project Overview

nano-rfc6902 is a lightweight JSON Patch (RFC 6902) library for Node.js and browsers. Zero dependencies, tiny footprint (≤ 2 KB min+gz), with support for both ESM and CommonJS.

**Key principles:**

- Zero runtime dependencies; keep implementation minimal and portable
- Patching is in-place; `applyPatch` mutates the target for performance
- Paths use JSON Pointer (RFC 6901) syntax
- Types mirror RFC 6902 specification

## Repository Structure

### Key Files

- `package.json` - Package configuration with dual ESM/CJS exports
- `tsconfig.json` - TypeScript configuration (strict mode, ES2020)
- `vite.config.ts` - Vite build configuration for library mode
- `vitest.config.ts` - Vitest test configuration with coverage thresholds
- `eslint.config.js` - ESLint v9 configuration
- `.prettierrc.json` - Prettier formatting configuration
- `.size-limit.json` - Bundle size budgets

### Source Structure

```
src/
├── index.ts              # Main entry: createPatch, applyPatch, types
├── applyPatch.ts         # RFC 6902 patch application (in-place mutation)
├── createPatch.ts        # Diff algorithm with LCS for arrays
├── types.ts              # RFC 6902 type definitions
├── isSafeApply.ts        # Public wrapper for isSafeApply utility entry
├── utils/
│   ├── utils.ts          # JSON Pointer helpers
│   └── isSafeApply.ts    # Implementation: validates object-only patches
├── tests/
│   ├── applyPatch.test.ts
│   ├── createPatch.test.ts
│   └── types.test.ts
└── utils/tests/
    ├── isSafeApply.test.ts
    └── utils.test.ts
```

## Common Commands

### Build

```bash
npm run build
```

Compiles TypeScript and bundles using Vite + Rollup. Outputs:

- `dist/index.js` (ESM), `dist/index.cjs` (CommonJS), `dist/index.d.ts` (types)
- `dist/isSafeApply.js` (ESM), `dist/isSafeApply.cjs` (CommonJS), `dist/isSafeApply.d.ts` (types)

**Build process:**

1. TypeScript compilation (`tsc`) for type checking
2. Vite build for ESM/CJS bundles with `vite-plugin-dts` generating declarations
3. Target: ES2020, no external dependencies bundled

### Tests

```bash
npm test              # Run tests in watch mode
npm run coverage      # Run tests with coverage report
npm run test:ui       # Open Vitest UI
```

Test files are located in `src/tests/` and `src/utils/tests/`.

**Coverage thresholds** (vitest.config.ts):

- Lines: 90%
- Functions: 100%
- Branches: 80%
- Statements: 85%

### Linting & Formatting

```bash
npm run lint          # Run ESLint
npm run lint:fix      # Auto-fix ESLint issues
npm run prettier      # Format all files with Prettier
```

### Bundle Size

```bash
npm run size          # Check bundle size against limits
```

**Size limits** enforced via `.size-limit.json`:

- Full library: 2 KB
- `applyPatch` alone: 1 KB
- `createPatch` alone: 1 KB
- `isSafeApply` alone: 0.5 KB

Prefer simple loops and small helpers; avoid heavy abstractions.

### Quality Check

```bash
npm run check         # Run prettier + lint + coverage + size
```

## Public API Surface

Exposed via subpath exports in `package.json`:

- `nano-rfc6902` → main API (`createPatch`, `applyPatch`, types)
- `nano-rfc6902/isSafeApply` → standalone utility

**Import examples (ESM):**

```js
import { createPatch, applyPatch } from "nano-rfc6902";
import { isSafeApply } from "nano-rfc6902/isSafeApply";
```

**CommonJS:**

```js
const { createPatch, applyPatch } = require("nano-rfc6902");
const { isSafeApply } = require("nano-rfc6902/isSafeApply");
```

## Code Architecture

### Entry Points

- `src/index.ts` - Main entry point exporting `createPatch`, `applyPatch`, and types
- `src/isSafeApply.ts` - Separate entry for the `isSafeApply` utility (minimal bundle impact)
  - Public wrapper that re-exports from `src/utils/isSafeApply.ts`

### Core Modules

#### `src/createPatch.ts` - Diff Algorithm

Generates RFC 6902 patch operations by diffing two JSON values.

- **LCS-based array diffing** (src/createPatch.ts:78-96):
  - Uses Longest Common Subsequence algorithm for intelligent array diffing
  - Detects insertions, deletions, and replacements
  - Preserves nested diffs when array elements are equal by deep comparison
  - Avoids unnecessary replace operations when elements can be nested-diffed

- **Recursive diffing**: Handles nested objects and arrays
- **Minimal patches**: Produces the smallest set of operations (add, remove, replace)

#### `src/applyPatch.ts` - Patch Application

Applies RFC 6902 patches in-place (mutates target).

- **All RFC 6902 operations**: add, remove, replace, move, copy, test
- **JSON Pointer resolution**: Uses RFC 6901 for path parsing
- **Auto-create intermediate paths**: The `add` operation creates missing intermediate objects
- **In-place mutation**: By design for performance. Clone before applying if immutability is needed.

#### `src/utils/isSafeApply.ts` - Patch Validation

Validates if patches only target object keys (not array indices or the special `-` append).

- Returns `true` if patch is safe to apply without mutating array positions
- For `move` and `copy`, both `from` and `path` must be object-key paths

### Key Implementation Details

#### JSON Pointer Escaping

Follows RFC 6901:

- `~` → `~0`
- `/` → `~1`

Implemented in:

- `createPatch.ts:escapeToken()` - Escapes tokens when building paths
- `applyPatch.ts:parsePath()` - Unescapes tokens when parsing paths

Example: Property `"a/b~c"` uses path `"/a~1b~0c"`

#### In-Place Mutation

`applyPatch` mutates the target object. This is by design for performance. If immutability is needed, clone the target before applying patches.

### Type System

All types are defined in `src/types.ts` and mirror RFC 6902:

- `JSONValue` - Recursive type for JSON-serializable values (includes `undefined` for ergonomic diffing)
- `Operation` - Union of all RFC 6902 operation types
- Individual operation interfaces: `AddOperation`, `RemoveOperation`, `ReplaceOperation`, `MoveOperation`, `CopyOperation`, `TestOperation`

### Build Configuration

- **Vite** (`vite.config.ts`) - Library mode with Rollup, builds ESM and CJS outputs with dual entry points
- **vite-plugin-dts** - Generates flattened TypeScript declarations for public entries only, excluding test files
- **TypeScript** (`tsconfig.json`) - Strict mode enabled with bundler module resolution, target ES2020

## Coding Standards

### TypeScript

Strict mode with additional checks (tsconfig.json):

- `"strict": true`
- `"noUnusedLocals": true`
- `"noUnusedParameters": true`
- `"noFallthroughCasesInSwitch": true`
- `"moduleResolution": "bundler"`
- `"target": "ES2020"`
- `"lib": ["ES2020", "DOM"]`

### Module Format

- Project is ESM-first (`"type": "module"` in package.json)
- Build exports both ESM and CJS for compatibility

### Linting & Formatting

- **ESLint v9**: Configuration in `eslint.config.js`
- **Prettier v3**: Configuration in `.prettierrc.json`

### File Naming

- **camelCase** for files
- **lowercased** directories
- Public entries can have top-level files under `src/` for clarity (e.g., `src/isSafeApply.ts`)
- Test files end with `.test.ts`

### Test Organization

- Tests use Vitest
- Tests live under `src/tests/` and `src/utils/tests/`
- Keep tests colocated under `src/**/tests` to allow type-only emission while excluding tests from published typings

## Development Workflow

### Adding a New Utility

1. **Implement** under `src/utils/` (e.g., `src/utils/foo.ts`)
2. **Write tests** in `src/utils/tests/` (e.g., `foo.test.ts`)
3. **Decide exposure:**
   - **Main bundle**: Export from `src/index.ts`
   - **Separate entry**: Create a thin wrapper at `src/foo.ts`:
     ```ts
     // src/foo.ts
     export { foo } from "./utils/foo";
     ```
     Then:
     - Add entry in `vite.config.ts` under `build.lib.entry`
     - Update subpath exports in `package.json`
     - Ensure `vite-plugin-dts` includes the new public entry and excludes tests
4. **Verify**: Run `npm run build` and check `dist/foo.{js,cjs,d.ts}`
5. **Update docs**: Add to README and update this file

### Pre-commit Hooks

Husky + lint-staged runs on commit:

- Prettier formatting on `*.ts` files
- ESLint auto-fix on `*.ts` files

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on PRs and pushes:

- **build-and-test** job: Builds the library, auto-publishes to npm on main branch commits
- **size** job: Comments on PRs with bundle size changes
- **lint** job: Runs Prettier and ESLint
- **test** job: Runs coverage with artifact upload

**Auto-versioning**: Patch version is auto-bumped on every main branch push (commits tagged with `[skip ci]` are ignored).

## Development Requirements

- Node.js >= 20.0.0 (LTS)
- npm or pnpm

## Release Checklist (for maintainers and AI)

- [ ] Lint and format clean (`npm run lint`, `npm run prettier`)
- [ ] All tests green (`npm test`)
- [ ] Coverage thresholds met (`npm run coverage`)
- [ ] Bundle size within limits (`npm run size`)
- [ ] Build succeeds and dist contains only expected root artifacts
- [ ] README updated for any new public API
- [ ] Package exports updated if new entries added
- [ ] CLAUDE.md updated if architecture changes

## Notes for AI Assistants

### Editing Guidelines

- **Prefer minimal diffs**: When editing files, make focused changes
- **Follow existing patterns**: For code-gen, keep to established patterns
- **No internal exports**: Avoid exporting internal modules directly; expose via top-level wrappers when creating new entries
- **Update documentation**: When adding entries, also update README, docs, and tests

### Key Constraints

- Maintain zero runtime dependencies
- Keep bundle sizes within limits (check `.size-limit.json`)
- Preserve in-place mutation behavior for `applyPatch`
- Follow RFC 6902 and RFC 6901 specifications strictly
- Ensure all tests pass with coverage thresholds met

### Common Tasks

- **Adding operations**: Extend `applyPatch.ts` and add comprehensive tests in `src/tests/applyPatch.test.ts`
- **Improving diff**: Modify `createPatch.ts` LCS algorithm, ensure tests in `src/tests/createPatch.test.ts` pass
- **New utilities**: Follow "Adding a New Utility" workflow above

## References

- [RFC 6902 (JSON Patch)](https://datatracker.ietf.org/doc/html/rfc6902)
- [RFC 6901 (JSON Pointer)](https://datatracker.ietf.org/doc/html/rfc6901)
- [Vite Library Mode](https://vitejs.dev/guide/build.html#library-mode)
- [Vitest Documentation](https://vitest.dev/)
