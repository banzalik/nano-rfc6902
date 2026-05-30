/**
 * Apply JSON Patch operations (RFC 6902)
 * Mutates the target object/array in place
 */
import type { JSONValue, Operation } from "./types";

const hasOwn = Object.prototype.hasOwnProperty;
const MAX_POINTER_CACHE_SIZE = 4096;
const pointerTokenCache = new Map<string, string[]>();

/**
 * Parse a JSON Pointer path into decoded tokens.
 */
const parsePath = (path: string): string[] => {
  if (path === "") {
    return [];
  }

  if (!path.startsWith("/")) {
    throw new Error(`Invalid JSON Pointer: ${path}`);
  }

  const rawTokens = path.slice(1).split("/");
  for (let i = 0; i < rawTokens.length; i++) {
    const token = rawTokens[i];
    if (token.indexOf("~") === -1) {
      continue;
    }

    let decoded = "";
    for (let j = 0; j < token.length; j++) {
      const ch = token[j];
      if (ch !== "~") {
        decoded += ch;
        continue;
      }

      const next = token[j + 1];
      if (next === "0") {
        decoded += "~";
        j += 1;
      } else if (next === "1") {
        decoded += "/";
        j += 1;
      } else {
        decoded += "~";
      }
    }

    rawTokens[i] = decoded;
  }

  return rawTokens;
};

const getPathTokens = (
  path: string,
  pathCache: Map<string, string[]>,
): string[] => {
  const cached = pathCache.get(path);
  if (cached !== undefined) {
    return cached;
  }

  const tokens = parsePath(path);
  if (pathCache.size >= MAX_POINTER_CACHE_SIZE) {
    pathCache.clear();
  }
  pathCache.set(path, tokens);
  return tokens;
};

const parseArrayIndexStrict = (
  token: string,
  maxExclusive: number,
  pathToken: string,
): number => {
  const length = token.length;
  if (length === 0) {
    throw new Error(`Invalid array index: ${pathToken}`);
  }

  let index = 0;
  for (let i = 0; i < length; i++) {
    const code = token.charCodeAt(i) - 48;
    if (code < 0 || code > 9) {
      throw new Error(`Invalid array index: ${pathToken}`);
    }
    index = index * 10 + code;
  }

  if (index >= maxExclusive) {
    throw new Error(`Invalid array index: ${pathToken}`);
  }

  return index;
};

const parseArrayIndexAllowEnd = (
  token: string,
  maxInclusive: number,
  pathToken: string,
): number => {
  const length = token.length;
  if (length === 0) {
    throw new Error(`Invalid array index: ${pathToken}`);
  }

  let index = 0;
  for (let i = 0; i < length; i++) {
    const code = token.charCodeAt(i) - 48;
    if (code < 0 || code > 9) {
      throw new Error(`Invalid array index: ${pathToken}`);
    }
    index = index * 10 + code;
  }

  if (index > maxInclusive) {
    throw new Error(`Invalid array index: ${pathToken}`);
  }

  return index;
};

/**
 * Get a value at a given path.
 */
const getValueAtPath = (
  obj: JSONValue,
  path: string,
  pathCache: Map<string, string[]>,
): JSONValue => {
  const tokens = getPathTokens(path, pathCache);
  let current: JSONValue = obj;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      throw new Error(`Path does not exist: ${path}`);
    }

    if (Array.isArray(current)) {
      const index = parseArrayIndexStrict(token, current.length, token);
      current = current[index];
      continue;
    }

    if (!hasOwn.call(current, token)) {
      throw new Error(`Path does not exist: ${path}`);
    }
    current = (current as { [key: string]: JSONValue })[token];
  }

  return current;
};

const getParentContainer = (
  obj: JSONValue,
  path: string,
  pathCache: Map<string, string[]>,
): [JSONValue, string] => {
  const tokens = getPathTokens(path, pathCache);
  if (tokens.length === 0) {
    throw new Error("Cannot target root path");
  }

  let current: JSONValue = obj;
  for (let i = 0; i < tokens.length - 1; i++) {
    const token = tokens[i];

    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      throw new Error(`Path does not exist: ${path}`);
    }

    if (Array.isArray(current)) {
      const index = parseArrayIndexStrict(token, current.length, token);
      const next = current[index];
      if (next === null || next === undefined) {
        throw new Error(`Path does not exist: ${path}`);
      }
      current = next;
      continue;
    }

    const next = (current as { [key: string]: JSONValue })[token];
    if (next === null || next === undefined) {
      throw new Error(`Path does not exist: ${path}`);
    }
    current = next;
  }

  return [current, tokens[tokens.length - 1]];
};

/**
 * Set a value at a given path (for objects).
 */
const setValueAtPath = (
  obj: JSONValue,
  path: string,
  value: JSONValue,
  pathCache: Map<string, string[]>,
): void => {
  const [container, lastToken] = getParentContainer(obj, path, pathCache);

  if (container === null || typeof container !== "object") {
    throw new Error("Cannot set property on non-object");
  }

  if (Array.isArray(container)) {
    const index = parseArrayIndexStrict(lastToken, container.length, lastToken);
    container[index] = value;
    return;
  }

  if (!hasOwn.call(container, lastToken)) {
    throw new Error(`Property does not exist: ${lastToken}`);
  }
  (container as { [key: string]: JSONValue })[lastToken] = value;
};

/**
 * Delete a value at a given path.
 */
const deleteValueAtPath = (
  obj: JSONValue,
  path: string,
  pathCache: Map<string, string[]>,
): JSONValue => {
  const [container, lastToken] = getParentContainer(obj, path, pathCache);

  if (container === null || typeof container !== "object") {
    throw new Error("Cannot delete from non-object");
  }

  if (Array.isArray(container)) {
    const index = parseArrayIndexStrict(lastToken, container.length, lastToken);
    const removed = container[index];
    container.splice(index, 1);
    return removed;
  }

  if (!hasOwn.call(container, lastToken)) {
    throw new Error(`Property does not exist: ${lastToken}`);
  }

  const removed = (container as { [key: string]: JSONValue })[lastToken];
  delete (container as { [key: string]: JSONValue })[lastToken];
  return removed;
};

/**
 * Add a value at a given path.
 */
const addValueAtPath = (
  obj: JSONValue,
  path: string,
  value: JSONValue,
  pathCache: Map<string, string[]>,
): void => {
  const tokens = getPathTokens(path, pathCache);

  if (tokens.length === 0) {
    throw new Error("Cannot replace root with add operation");
  }

  let current: JSONValue = obj;
  for (let i = 0; i < tokens.length - 1; i++) {
    const token = tokens[i];

    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      throw new Error(`Path does not exist: ${path}`);
    }

    if (Array.isArray(current)) {
      const index = parseArrayIndexStrict(token, current.length, token);
      const next = current[index];
      if (next === null || next === undefined) {
        throw new Error(`Path does not exist: ${path}`);
      }
      current = next;
      continue;
    }

    const objCurrent = current as { [key: string]: JSONValue };
    let next = objCurrent[token];
    if (next === null || next === undefined) {
      next = {};
      objCurrent[token] = next;
    }
    current = next;
  }

  const lastToken = tokens[tokens.length - 1];
  if (current === null || typeof current !== "object") {
    throw new Error("Cannot add to non-object");
  }

  if (Array.isArray(current)) {
    if (lastToken === "-") {
      current.push(value);
      return;
    }

    const index = parseArrayIndexAllowEnd(lastToken, current.length, lastToken);
    current.splice(index, 0, value);
    return;
  }

  (current as { [key: string]: JSONValue })[lastToken] = value;
};

/**
 * Deep clone a value
 */
const deepClone = (value: JSONValue): JSONValue => {
  if (value === null || value === undefined) {
    return value;
  }

  const type = typeof value;
  if (type !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    const cloned = new Array<JSONValue>(value.length);
    for (let i = 0; i < value.length; i++) {
      cloned[i] = deepClone(value[i]);
    }
    return cloned;
  }

  const obj = value as { [key: string]: JSONValue };
  const clonedObj: { [key: string]: JSONValue } = {};
  for (const key in obj) {
    if (hasOwn.call(obj, key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }
  return clonedObj;
};

/**
 * Deep equality check
 */
const deepEqual = (a: JSONValue, b: JSONValue): boolean => {
  if (a === b) return true;

  if (a === null || b === null) return a === b;
  if (a === undefined || b === undefined) return a === b;

  if (typeof a !== typeof b) return false;

  if (typeof a !== "object" || typeof b !== "object") return a === b;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Both are objects (not arrays)
  if (!Array.isArray(a) && !Array.isArray(b)) {
    const objA = a as { [key: string]: JSONValue };
    const objB = b as { [key: string]: JSONValue };

    let keysACount = 0;
    let keysBCount = 0;

    for (const key in objA) {
      if (!hasOwn.call(objA, key)) {
        continue;
      }
      keysACount += 1;
      if (!hasOwn.call(objB, key)) return false;
      if (!deepEqual(objA[key], objB[key])) return false;
    }

    for (const key in objB) {
      if (hasOwn.call(objB, key)) {
        keysBCount += 1;
      }
    }

    if (keysACount !== keysBCount) return false;

    return true;
  }

  return false;
};

/**
 * Apply a single operation
 */
const applyOperation = (
  obj: JSONValue,
  operation: Operation,
  pathCache: Map<string, string[]>,
): void => {
  switch (operation.op) {
    case "add":
      addValueAtPath(obj, operation.path, operation.value, pathCache);
      break;

    case "remove":
      deleteValueAtPath(obj, operation.path, pathCache);
      break;

    case "replace":
      setValueAtPath(obj, operation.path, operation.value, pathCache);
      break;

    case "move": {
      const value = getValueAtPath(obj, operation.from, pathCache);
      deleteValueAtPath(obj, operation.from, pathCache);
      addValueAtPath(obj, operation.path, value, pathCache);
      break;
    }

    case "copy": {
      const value = getValueAtPath(obj, operation.from, pathCache);
      const clonedValue = deepClone(value);
      addValueAtPath(obj, operation.path, clonedValue, pathCache);
      break;
    }

    case "test": {
      const value = getValueAtPath(obj, operation.path, pathCache);
      if (!deepEqual(value, operation.value)) {
        throw new Error(`Test operation failed at path ${operation.path}`);
      }
      break;
    }

    default:
      throw new Error(`Unknown operation: ${(operation as Operation).op}`);
  }
};

/**
 * Apply a JSON Patch to an object (mutates the object in place)
 */
export const applyPatch = (obj: JSONValue, patch: Operation[]): void => {
  const pathCache = pointerTokenCache;
  for (const operation of patch) {
    applyOperation(obj, operation, pathCache);
  }
};
