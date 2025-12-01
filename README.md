# nano-rfc6902

Lightweight JSON Patch (RFC 6902) utilities for Node.js and the browser.

[![npm version](https://img.shields.io/npm/v/nano-rfc6902)](https://www.npmjs.com/package/nano-rfc6902)
[![npm downloads](https://img.shields.io/npm/dm/nano-rfc6902)](https://www.npmjs.com/package/nano-rfc6902)
[![CI](https://github.com/banzalik/nano-rfc6902/actions/workflows/ci.yml/badge.svg)](https://github.com/banzalik/nano-rfc6902/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/nano-rfc6902)](https://github.com/banzalik/nano-rfc6902/blob/main/LICENSE)
[![zero deps](https://img.shields.io/badge/deps-0-brightgreen)](https://www.npmjs.com/package/nano-rfc6902)
[![types](https://img.shields.io/badge/types-TypeScript-3178c6)](https://www.npmjs.com/package/nano-rfc6902)
[![bundle size](https://badgen.net/bundlephobia/minzip/nano-rfc6902)](https://bundlephobia.com/package/nano-rfc6902)
[![node version](https://img.shields.io/node/v/nano-rfc6902)](https://www.npmjs.com/package/nano-rfc6902)

Highlights:

- Zero dependencies
- Tiny footprint (≤ 2 kB min+gz)
- Fast diff/patch
- ESM + CJS + types
- Works in Node.js and modern browsers

- Generate patches: `createPatch(oldValue, newValue)`
- Apply patches in-place: `applyPatch(target, patch)`

## Installation

```bash
npm install nano-rfc6902
```

## Quick start

### Node.js (ESM)

```js
import { createPatch, applyPatch } from "nano-rfc6902";

const before = { name: "Ada", skills: ["math"] };
const after = { name: "Ada Lovelace", skills: ["math", "programming"] };

// 1) Create a JSON Patch (RFC 6902 operations)
const patch = createPatch(before, after);
// Example patch (shape will depend on diff):
// [
//   { op: 'replace', path: '/name', value: 'Ada Lovelace' },
//   { op: 'add',     path: '/skills/1', value: 'programming' }
// ]

// 2) Apply the patch (mutates the target in-place)
applyPatch(before, patch);

console.log(before); // -> { name: 'Ada Lovelace', skills: ['math', 'programming'] }
```

### Node.js (CommonJS)

```js
const { createPatch, applyPatch } = require("nano-rfc6902");

const a = { count: 1 };
const b = { count: 2 };

const patch = createPatch(a, b);
applyPatch(a, patch);

console.log(a); // -> { count: 2 }
```

### Browser

With a bundler (Vite, Webpack, etc.), import from the package name:

```html
<script type="module">
  import { createPatch, applyPatch } from "nano-rfc6902";

  const oldState = { items: ["a"] };
  const newState = { items: ["a", "b"] };

  const patch = createPatch(oldState, newState);
  applyPatch(oldState, patch);

  console.log(oldState); // -> { items: ['a', 'b'] }
</script>
```

Without a bundler, you can use a CDN that serves ESM:

```html
<script type="module">
  import {
    createPatch,
    applyPatch,
  } from "https://cdn.jsdelivr.net/npm/nano-rfc6902/+esm";

  const src = { a: 1 };
  const dst = { a: 1, b: 2 };

  const patch = createPatch(src, dst);
  applyPatch(src, patch);

  console.log(patch); // e.g., [{ op: 'add', path: '/b', value: 2 }]
</script>
```

## API

### createPatch(oldValue, newValue) => Operation[]

Computes a minimal set of RFC 6902 operations to transform `oldValue` into `newValue`.

- Diffs primitives, objects, and arrays.
- Arrays use an LCS-based strategy to produce intuitive insert/remove/replace operations and preserve nested diffs when elements are equal by deep comparison.

### applyPatch(target, patch) => void

Applies an RFC 6902 patch to `target` in-place.

- Supports `add`, `remove`, `replace`, `move`, `copy`, and `test`.
- Uses JSON Pointer (RFC 6901) for `path` and `from` fields (e.g., `/a/b/0`).
- Throws if paths are invalid or `test` fails.

### Utils: isSafeApply(patch) => boolean

A small utility exported as a separate entry that validates whether a patch only targets object keys (and never array indices or the special `-` append). Returns `true` if the patch is safe to apply without mutating array positions. Implementation: [TypeScript.isSafeApply()](src/utils/isSafeApply.ts:4)

Import

- ESM:
  ```js
  import { isSafeApply } from "nano-rfc6902/isSafeApply";
  ```
- CommonJS:
  ```js
  const { isSafeApply } = require("nano-rfc6902/isSafeApply");
  ```

Safe examples (true)

```js
import { isSafeApply } from "nano-rfc6902/isSafeApply";

const patch = [
  { op: "add", path: "/user/name", value: "Ada" },
  { op: "replace", path: "/meta/title", value: "Dr." },
  { op: "test", path: "/count", value: 1 },
];
isSafeApply(patch); // true
```

Unsafe examples (false)

```js
import { isSafeApply } from "nano-rfc6902/isSafeApply";

// Targets array index
isSafeApply([{ op: "add", path: "/items/0", value: "a" }]); // false

// Appends to array end
isSafeApply([{ op: "add", path: "/items/-", value: "a" }]); // false

// move/copy touching arrays (either from or path)
isSafeApply([{ op: "move", from: "/items/0", path: "/items/1" }]); // false
isSafeApply([{ op: "copy", from: "/a/0", path: "/b/0" }]); // false
```

Notes

- For `move` and `copy`, both `from` and `path` must be object-key paths (no array indices or `-`).
- Empty patches are considered safe.

### Types (TypeScript)

This package ships first-class types. Core shapes mirror RFC 6902:

```ts
type JSONValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JSONValue[]
  | { [key: string]: JSONValue };

type Operation =
  | { op: "add"; path: string; value: JSONValue }
  | { op: "remove"; path: string }
  | { op: "replace"; path: string; value: JSONValue }
  | { op: "move"; from: string; path: string }
  | { op: "copy"; from: string; path: string }
  | { op: "test"; path: string; value: JSONValue };
```

Notes:

- JSON Pointer escaping follows RFC 6901: `~` -> `~0`, `/` -> `~1`.
- `applyPatch` mutates the target you pass in.
- `undefined` is included in `JSONValue` for ergonomic diffs in JS/TS; be aware that literal JSON does not have `undefined`.

## Development

### Prerequisites

- Node.js >= 20.0.0 (LTS)
- npm or pnpm

### Install dependencies

```bash
npm install
```

### Build

```bash
npm run build
```

Outputs:

- `dist/index.js` — ES module
- `dist/index.cjs` — CommonJS
- `dist/index.d.ts` — TypeScript declarations

### Type checking

```bash
npm run type-check
```

### Tests

```bash
npm test
```

## Features

- Zero dependencies
- Tiny footprint: ≤ 2 kB min+gz (size-limit target)
- Fast and efficient diff/patch
- JSON Patch (RFC 6902) create/apply
- Small API surface
- TypeScript types included
- Works in Node.js and modern browsers
- ESM and CJS builds

## License

BSD-3-Clause
