/**
 * Create JSON Patch operations (RFC 6902) by diffing two values
 */
import type { JSONValue, Operation } from "./types";

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
 * Escape a token for JSON Pointer
 */
const escapeToken = (token: string): string => {
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
};

/**
 * Build a JSON Pointer path from tokens
 */
const buildPath = (tokens: string[]): string => {
  if (tokens.length === 0) return "";
  return "/" + tokens.map(escapeToken).join("/");
};

/**
 * Check if two values can be diffed (both are objects or both are arrays)
 */
const canDiff = (a: JSONValue, b: JSONValue): boolean => {
  if (typeof a !== "object" || typeof b !== "object") return false;
  if (a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  return true;
};

/**
 * Compute LCS (Longest Common Subsequence) length matrix
 */
const computeLCS = (oldArr: JSONValue[], newArr: JSONValue[]): number[][] => {
  const m = oldArr.length;
  const n = newArr.length;
  const lcs: number[][] = Array(m + 1)
    .fill(0)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (deepEqual(oldArr[i - 1], newArr[j - 1])) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
      }
    }
  }

  return lcs;
};

/**
 * Compute array diff using LCS algorithm to detect insertions, deletions, and modifications
 */
const computeArrayDiff = (
  oldArr: JSONValue[],
  newArr: JSONValue[],
): {
  type: "keep" | "add" | "remove" | "replace";
  oldIndex?: number;
  newIndex?: number;
  value?: JSONValue;
}[] => {
  const edits: {
    type: "keep" | "add" | "remove" | "replace";
    oldIndex?: number;
    newIndex?: number;
    value?: JSONValue;
  }[] = [];
  const m = oldArr.length;
  const n = newArr.length;

  // Handle empty arrays
  if (m === 0 && n === 0) return edits;
  if (m === 0) {
    for (let i = 0; i < n; i++) {
      edits.push({ type: "add", newIndex: i, value: newArr[i] });
    }
    return edits;
  }
  if (n === 0) {
    for (let i = m - 1; i >= 0; i--) {
      edits.push({ type: "remove", oldIndex: i });
    }
    return edits;
  }

  const lcs = computeLCS(oldArr, newArr);

  // Backtrack to find the edit sequence
  let i = m;
  let j = n;
  const backtrack: {
    type: "keep" | "add" | "remove" | "replace";
    oldIndex?: number;
    newIndex?: number;
    value?: any;
  }[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && deepEqual(oldArr[i - 1], newArr[j - 1])) {
      // Elements are equal - keep
      backtrack.push({ type: "keep", oldIndex: i - 1, newIndex: j - 1 });
      i--;
      j--;
    } else if (
      i > 0 &&
      j > 0 &&
      lcs[i][j] === lcs[i - 1][j - 1] &&
      canDiff(oldArr[i - 1], newArr[j - 1])
    ) {
      // Both can move diagonally AND both are objects/arrays - use nested diffing
      backtrack.push({ type: "keep", oldIndex: i - 1, newIndex: j - 1 });
      i--;
      j--;
    } else if (i > 0 && j > 0 && lcs[i][j] === lcs[i - 1][j - 1]) {
      // Both pointers can move diagonally, meaning this is a replacement
      backtrack.push({
        type: "replace",
        oldIndex: i - 1,
        newIndex: j - 1,
        value: newArr[j - 1],
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      // Insertion
      backtrack.push({ type: "add", newIndex: j - 1, value: newArr[j - 1] });
      j--;
    } else if (i > 0) {
      // Deletion
      backtrack.push({ type: "remove", oldIndex: i - 1 });
      i--;
    }
  }

  // Reverse to get forward order
  return backtrack.reverse();
};

/**
 * Compare two values and generate patch operations
 */
const diff = (
  oldVal: JSONValue,
  newVal: JSONValue,
  path: string[] = [],
): Operation[] => {
  const operations: Operation[] = [];

  // If values are equal, no patch needed
  if (deepEqual(oldVal, newVal)) {
    return operations;
  }

  // Handle null (but not undefined at object property level)
  if (oldVal === null || newVal === null) {
    if (oldVal !== newVal) {
      operations.push({ op: "replace", path: buildPath(path), value: newVal });
    }
    return operations;
  }

  // Handle undefined - only for root level or array elements
  if (oldVal === undefined || newVal === undefined) {
    if (oldVal === undefined && newVal !== undefined) {
      operations.push({ op: "add", path: buildPath(path), value: newVal });
    } else if (oldVal !== undefined && newVal === undefined) {
      operations.push({ op: "remove", path: buildPath(path) });
    }
    return operations;
  }

  // Handle primitives
  if (typeof oldVal !== "object" || typeof newVal !== "object") {
    operations.push({ op: "replace", path: buildPath(path), value: newVal });
    return operations;
  }

  // Handle array to non-array or non-array to array
  if (Array.isArray(oldVal) !== Array.isArray(newVal)) {
    operations.push({ op: "replace", path: buildPath(path), value: newVal });
    return operations;
  }

  // Handle arrays using positional comparison
  if (Array.isArray(oldVal) && Array.isArray(newVal)) {
    const edits = computeArrayDiff(oldVal, newVal);

    // Apply edits and generate operations
    let currentIndex = 0;

    for (const edit of edits) {
      if (edit.type === "keep") {
        // Check if the kept element has internal changes
        const nestedOps = diff(oldVal[edit.oldIndex!], newVal[edit.newIndex!], [
          ...path,
          String(currentIndex),
        ]);
        operations.push(...nestedOps);
        currentIndex++;
      } else if (edit.type === "replace") {
        operations.push({
          op: "replace",
          path: buildPath([...path, String(currentIndex)]),
          value: edit.value,
        });
        currentIndex++;
      } else if (edit.type === "add") {
        operations.push({
          op: "add",
          path: buildPath([...path, String(currentIndex)]),
          value: edit.value,
        });
        currentIndex++;
      } else if (edit.type === "remove") {
        operations.push({
          op: "remove",
          path: buildPath([...path, String(currentIndex)]),
        });
        // Don't increment currentIndex for removes
      }
    }

    return operations;
  }

  // Handle objects (both must be objects at this point, not arrays)
  const objOld = oldVal as { [key: string]: JSONValue };
  const objNew = newVal as { [key: string]: JSONValue };

  const oldKeys = Object.keys(objOld);
  const newKeys = Object.keys(objNew);

  // Find removed keys
  for (const key of oldKeys) {
    if (!(key in objNew)) {
      operations.push({ op: "remove", path: buildPath([...path, key]) });
    }
  }

  // Find added and modified keys
  for (const key of newKeys) {
    if (!(key in objOld)) {
      // Added key
      operations.push({
        op: "add",
        path: buildPath([...path, key]),
        value: objNew[key],
      });
    } else {
      // Potentially modified key
      operations.push(...diff(objOld[key], objNew[key], [...path, key]));
    }
  }

  return operations;
};

/**
 * Create a JSON Patch by comparing two objects
 */
export const createPatch = (
  oldObj: JSONValue,
  newObj: JSONValue,
): Operation[] => {
  return diff(oldObj, newObj, []);
};
