/**
 * Apply JSON Patch operations (RFC 6902)
 * Mutates the target object/array in place
 */
import type { JSONValue, Operation } from "./types";

/**
 * Parse a JSON Pointer path into tokens
 */
const parsePath = (path: string): string[] => {
  if (path === "") return [];
  if (path === "/") return [""];

  if (!path.startsWith("/")) {
    throw new Error(`Invalid JSON Pointer: ${path}`);
  }

  return path
    .slice(1)
    .split("/")
    .map((token) => token.replace(/~1/g, "/").replace(/~0/g, "~"));
};

/**
 * Get a value at a given path
 */
const getValueAtPath = (obj: JSONValue, path: string): JSONValue => {
  const tokens = parsePath(path);
  let current: JSONValue = obj;

  for (const token of tokens) {
    if (current === null || current === undefined) {
      throw new Error(`Cannot get value at path ${path}`);
    }
    if (typeof current !== "object") {
      throw new Error(`Cannot access property ${token} on non-object`);
    }
    if (Array.isArray(current)) {
      current = current[parseInt(token, 10)];
    } else {
      current = (current as any)[token];
    }
  }

  return current;
};

/**
 * Set a value at a given path (for objects)
 */
const setValueAtPath = (
  obj: JSONValue,
  path: string,
  value: JSONValue,
): void => {
  const tokens = parsePath(path);

  if (tokens.length === 0) {
    throw new Error("Cannot replace root");
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

    const next = Array.isArray(current)
      ? current[parseInt(token, 10)]
      : (current as any)[token];
    if (next === undefined || next === null) {
      throw new Error(`Path does not exist: ${path}`);
    }

    current = next;
  }

  const lastToken = tokens[tokens.length - 1];

  if (current === null || typeof current !== "object") {
    throw new Error(`Cannot set property on non-object`);
  }

  if (Array.isArray(current)) {
    const index = parseInt(lastToken, 10);
    if (isNaN(index) || index < 0 || index >= current.length) {
      throw new Error(`Invalid array index: ${lastToken}`);
    }
    current[index] = value;
  } else {
    if (!(lastToken in (current as any))) {
      throw new Error(`Property does not exist: ${lastToken}`);
    }
    (current as any)[lastToken] = value;
  }
};

/**
 * Delete a value at a given path
 */
const deleteValueAtPath = (obj: JSONValue, path: string): JSONValue => {
  const tokens = parsePath(path);

  if (tokens.length === 0) {
    throw new Error("Cannot delete root");
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

    const next = Array.isArray(current)
      ? current[parseInt(token, 10)]
      : (current as any)[token];
    if (next === undefined || next === null) {
      throw new Error(`Path does not exist: ${path}`);
    }

    current = next;
  }

  const lastToken = tokens[tokens.length - 1];

  if (current === null || typeof current !== "object") {
    throw new Error(`Cannot delete from non-object`);
  }

  if (Array.isArray(current)) {
    const index = parseInt(lastToken, 10);
    if (isNaN(index) || index < 0 || index >= current.length) {
      throw new Error(`Invalid array index: ${lastToken}`);
    }
    const removed = current[index];
    current.splice(index, 1);
    return removed;
  } else {
    if (!(lastToken in (current as any))) {
      throw new Error(`Property does not exist: ${lastToken}`);
    }
    const removed = (current as any)[lastToken];
    delete (current as any)[lastToken];
    return removed;
  }
};

/**
 * Add a value at a given path
 */
const addValueAtPath = (
  obj: JSONValue,
  path: string,
  value: JSONValue,
): void => {
  const tokens = parsePath(path);

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

    const next = Array.isArray(current)
      ? current[parseInt(token, 10)]
      : (current as any)[token];
    if (next === undefined || next === null) {
      throw new Error(`Path does not exist: ${path}`);
    }

    current = next;
  }

  const lastToken = tokens[tokens.length - 1];

  if (current === null || typeof current !== "object") {
    throw new Error(`Cannot add to non-object`);
  }

  if (Array.isArray(current)) {
    if (lastToken === "-") {
      current.push(value);
    } else {
      const index = parseInt(lastToken, 10);
      if (isNaN(index) || index < 0 || index > current.length) {
        throw new Error(`Invalid array index: ${lastToken}`);
      }
      current.splice(index, 0, value);
    }
  } else {
    (current as any)[lastToken] = value;
  }
};

/**
 * Deep clone a value
 */
const deepClone = (value: JSONValue): JSONValue => {
  return JSON.parse(JSON.stringify(value)) as JSONValue;
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

    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(objA[key], objB[key])) return false;
    }

    return true;
  }

  return false;
};

/**
 * Apply a single operation
 */
const applyOperation = (obj: JSONValue, operation: Operation): void => {
  switch (operation.op) {
    case "add":
      addValueAtPath(obj, operation.path, operation.value);
      break;

    case "remove":
      deleteValueAtPath(obj, operation.path);
      break;

    case "replace":
      setValueAtPath(obj, operation.path, operation.value);
      break;

    case "move": {
      const value = getValueAtPath(obj, operation.from);
      deleteValueAtPath(obj, operation.from);
      addValueAtPath(obj, operation.path, value);
      break;
    }

    case "copy": {
      const value = getValueAtPath(obj, operation.from);
      const clonedValue = deepClone(value);
      addValueAtPath(obj, operation.path, clonedValue);
      break;
    }

    case "test": {
      const value = getValueAtPath(obj, operation.path);
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
  for (const operation of patch) {
    applyOperation(obj, operation);
  }
};
