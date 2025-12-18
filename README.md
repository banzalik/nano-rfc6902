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

## RFC 6902 JSON Patch Overview

[RFC 6902](https://datatracker.ietf.org/doc/html/rfc6902) defines a JSON document structure for expressing a sequence of operations to apply to a JSON document. It's commonly used for:

- Efficient API updates (send only changes, not entire documents)
- Real-time collaboration and operational transformation
- Version control and change tracking
- Undo/redo functionality
- Optimistic UI updates

### JSON Pointer (RFC 6901)

Operations use JSON Pointer syntax to reference locations in documents:

- `/` - Root document
- `/foo` - Property "foo" at root
- `/foo/bar` - Nested property "bar" inside "foo"
- `/array/0` - First element of array
- `/array/-` - Append to end of array (add operation only)

Special characters must be escaped:

- `~` becomes `~0`
- `/` becomes `~1`

Example: To reference property `"a/b~c"`, use path `"/a~1b~0c"`

### All Operation Types

#### 1. `add` - Add a value

Adds a value at the specified location. For objects, creates or overwrites the property. For arrays, inserts at the index (shifting elements right).

```js
import { applyPatch } from "nano-rfc6902";

// Add object property
const obj = { name: "Alice" };
applyPatch(obj, [{ op: "add", path: "/age", value: 30 }]);
console.log(obj); // { name: "Alice", age: 30 }

// Add to array at specific index
const arr = ["a", "c"];
applyPatch(arr, [{ op: "add", path: "/1", value: "b" }]);
console.log(arr); // ["a", "b", "c"]

// Append to array end
const items = [1, 2];
applyPatch(items, [{ op: "add", path: "/-", value: 3 }]);
console.log(items); // [1, 2, 3]

// Add nested property (auto-creates intermediate objects)
const data = {};
applyPatch(data, [{ op: "add", path: "/user/profile/name", value: "Bob" }]);
console.log(data); // { user: { profile: { name: "Bob" } } }
```

#### 2. `remove` - Remove a value

Removes the value at the specified location. For arrays, removes the element and shifts remaining elements left.

```js
import { applyPatch } from "nano-rfc6902";

// Remove object property
const obj = { name: "Alice", age: 30, city: "NYC" };
applyPatch(obj, [{ op: "remove", path: "/age" }]);
console.log(obj); // { name: "Alice", city: "NYC" }

// Remove array element
const arr = ["a", "b", "c", "d"];
applyPatch(arr, [{ op: "remove", path: "/1" }]);
console.log(arr); // ["a", "c", "d"]

// Remove nested property
const data = { user: { profile: { name: "Bob", email: "bob@example.com" } } };
applyPatch(data, [{ op: "remove", path: "/user/profile/email" }]);
console.log(data); // { user: { profile: { name: "Bob" } } }
```

#### 3. `replace` - Replace a value

Replaces the value at the specified location. Equivalent to remove followed by add, but atomic.

```js
import { applyPatch } from "nano-rfc6902";

// Replace object property
const obj = { name: "Alice", status: "pending" };
applyPatch(obj, [{ op: "replace", path: "/status", value: "active" }]);
console.log(obj); // { name: "Alice", status: "active" }

// Replace array element
const arr = [1, 2, 3];
applyPatch(arr, [{ op: "replace", path: "/1", value: 99 }]);
console.log(arr); // [1, 99, 3]

// Replace nested value
const config = { server: { port: 3000, host: "localhost" } };
applyPatch(config, [{ op: "replace", path: "/server/port", value: 8080 }]);
console.log(config); // { server: { port: 8080, host: "localhost" } }
```

#### 4. `move` - Move a value

Removes the value at `from` location and adds it to `path` location. Atomic operation.

```js
import { applyPatch } from "nano-rfc6902";

// Move property between objects
const obj = { temp: { value: 42 }, data: {} };
applyPatch(obj, [{ op: "move", from: "/temp/value", path: "/data/value" }]);
console.log(obj); // { temp: {}, data: { value: 42 } }

// Move array element
const arr = ["a", "b", "c", "d"];
applyPatch(arr, [{ op: "move", from: "/3", path: "/0" }]);
console.log(arr); // ["d", "a", "b", "c"]

// Rename property
const user = { firstName: "Alice", lastName: "Smith" };
applyPatch(user, [{ op: "move", from: "/firstName", path: "/name" }]);
console.log(user); // { name: "Alice", lastName: "Smith" }
```

#### 5. `copy` - Copy a value

Copies the value at `from` location to `path` location. Creates a deep clone.

```js
import { applyPatch } from "nano-rfc6902";

// Copy object property
const obj = { original: { value: 42 }, backup: {} };
applyPatch(obj, [
  { op: "copy", from: "/original/value", path: "/backup/value" },
]);
console.log(obj); // { original: { value: 42 }, backup: { value: 42 } }

// Copy array element
const arr = [{ id: 1, name: "Alice" }];
applyPatch(arr, [{ op: "copy", from: "/0", path: "/-" }]);
console.log(arr); // [{ id: 1, name: "Alice" }, { id: 1, name: "Alice" }]

// Duplicate nested structure
const data = { template: { x: 1, y: 2 } };
applyPatch(data, [{ op: "copy", from: "/template", path: "/instance" }]);
console.log(data); // { template: { x: 1, y: 2 }, instance: { x: 1, y: 2 } }

// Modifications to copy don't affect original
data.instance.x = 99;
console.log(data.template.x); // Still 1
```

#### 6. `test` - Test a value

Tests that the value at the specified location equals the given value. Throws an error if the test fails. Useful for preventing conflicts in concurrent updates.

```js
import { applyPatch } from "nano-rfc6902";

// Successful test
const obj = { version: 1, data: "hello" };
applyPatch(obj, [
  { op: "test", path: "/version", value: 1 },
  { op: "replace", path: "/data", value: "world" },
]);
console.log(obj); // { version: 1, data: "world" }

// Failed test throws error
const user = { age: 25 };
try {
  applyPatch(user, [
    { op: "test", path: "/age", value: 30 }, // Expects 30, but actual is 25
    { op: "replace", path: "/age", value: 31 },
  ]);
} catch (err) {
  console.log(err.message); // "Test operation failed at path /age"
}

// Test with nested objects
const config = { settings: { theme: "dark", lang: "en" } };
applyPatch(config, [
  { op: "test", path: "/settings/theme", value: "dark" },
  { op: "replace", path: "/settings/theme", value: "light" },
]);
console.log(config); // { settings: { theme: "light", lang: "en" } }
```

### Complex Example: Multiple Operations

```js
import { applyPatch } from "nano-rfc6902";

const document = {
  users: [
    { id: 1, name: "Alice", role: "admin" },
    { id: 2, name: "Bob", role: "user" },
  ],
  metadata: {
    version: 1,
    lastModified: "2024-01-01",
  },
};

applyPatch(document, [
  // Test version before applying changes
  { op: "test", path: "/metadata/version", value: 1 },

  // Update user role
  { op: "replace", path: "/users/1/role", value: "admin" },

  // Add new user
  {
    op: "add",
    path: "/users/-",
    value: { id: 3, name: "Charlie", role: "user" },
  },

  // Update metadata
  { op: "replace", path: "/metadata/lastModified", value: "2024-01-15" },
  { op: "replace", path: "/metadata/version", value: 2 },

  // Add new metadata field
  { op: "add", path: "/metadata/author", value: "System" },
]);

console.log(document);
// {
//   users: [
//     { id: 1, name: "Alice", role: "admin" },
//     { id: 2, name: "Bob", role: "admin" },
//     { id: 3, name: "Charlie", role: "user" }
//   ],
//   metadata: {
//     version: 2,
//     lastModified: "2024-01-15",
//     author: "System"
//   }
// }
```

### Creating Patches Automatically

Instead of manually writing patches, use `createPatch` to generate them:

```js
import { createPatch, applyPatch } from "nano-rfc6902";

const before = {
  name: "Alice",
  age: 30,
  hobbies: ["reading", "gaming"],
  address: { city: "NYC", zip: "10001" },
};

const after = {
  name: "Alice",
  age: 31,
  hobbies: ["reading", "gaming", "hiking"],
  address: { city: "NYC", zip: "10002", country: "USA" },
};

// Generate patch automatically
const patch = createPatch(before, after);
console.log(patch);
// [
//   { op: "replace", path: "/age", value: 31 },
//   { op: "add", path: "/hobbies/2", value: "hiking" },
//   { op: "replace", path: "/address/zip", value: "10002" },
//   { op: "add", path: "/address/country", value: "USA" }
// ]

// Apply to original
applyPatch(before, patch);
console.log(before); // Now matches 'after'
```

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
