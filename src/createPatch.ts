/**
 * Create JSON Patch operations (RFC 6902) by diffing two values
 */
import type { JSONValue, Operation } from "./types";

const hasOwn = Object.prototype.hasOwnProperty;

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

    for (let i = 0; i < keysA.length; i++) {
      const key = keysA[i];
      if (!hasOwn.call(objB, key)) return false;
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
  if (token.indexOf("~") === -1 && token.indexOf("/") === -1) {
    return token;
  }

  let escaped = "";
  for (let i = 0; i < token.length; i++) {
    const ch = token[i];
    if (ch === "~") {
      escaped += "~0";
    } else if (ch === "/") {
      escaped += "~1";
    } else {
      escaped += ch;
    }
  }
  return escaped;
};

const appendPath = (basePath: string, token: string): string => {
  const escaped = escapeToken(token);
  return basePath === "" ? `/${escaped}` : `${basePath}/${escaped}`;
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
const computeLCS = (
  oldArr: JSONValue[],
  newArr: JSONValue[],
  isEqual: (i: number, j: number) => boolean,
): { matrix: Uint32Array; width: number } => {
  const m = oldArr.length;
  const n = newArr.length;
  const width = n + 1;
  const matrix = new Uint32Array((m + 1) * width);

  for (let i = 1; i <= m; i++) {
    const rowOffset = i * width;
    const prevRowOffset = (i - 1) * width;
    for (let j = 1; j <= n; j++) {
      if (isEqual(i - 1, j - 1)) {
        matrix[rowOffset + j] = matrix[prevRowOffset + (j - 1)] + 1;
      } else {
        const up = matrix[prevRowOffset + j];
        const left = matrix[rowOffset + (j - 1)];
        matrix[rowOffset + j] = up > left ? up : left;
      }
    }
  }

  return { matrix, width };
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
  const totalOld = oldArr.length;
  const totalNew = newArr.length;

  let prefixLen = 0;
  while (
    prefixLen < totalOld &&
    prefixLen < totalNew &&
    deepEqual(oldArr[prefixLen], newArr[prefixLen])
  ) {
    edits.push({
      type: "keep",
      oldIndex: prefixLen,
      newIndex: prefixLen,
    });
    prefixLen++;
  }

  let suffixLen = 0;
  while (
    suffixLen < totalOld - prefixLen &&
    suffixLen < totalNew - prefixLen &&
    deepEqual(oldArr[totalOld - 1 - suffixLen], newArr[totalNew - 1 - suffixLen])
  ) {
    suffixLen++;
  }

  const oldStart = prefixLen;
  const oldEnd = totalOld - suffixLen;
  const newStart = prefixLen;
  const newEnd = totalNew - suffixLen;

  const oldMiddle = oldArr.slice(oldStart, oldEnd);
  const newMiddle = newArr.slice(newStart, newEnd);

  const m = oldMiddle.length;
  const n = newMiddle.length;
  const equalCache: boolean[][] = Array(m)
    .fill(0)
    .map(() => Array(n));

  const isEqual = (i: number, j: number): boolean => {
    const cached = equalCache[i][j];
    if (cached !== undefined) {
      return cached;
    }
    const result = deepEqual(oldMiddle[i], newMiddle[j]);
    equalCache[i][j] = result;
    return result;
  };

  // Handle empty arrays
  if (m === 0 && n === 0) {
    for (let k = 0; k < suffixLen; k++) {
      const oldIndex = totalOld - suffixLen + k;
      const newIndex = totalNew - suffixLen + k;
      edits.push({ type: "keep", oldIndex, newIndex });
    }
    return edits;
  }
  if (m === 0) {
    for (let i = 0; i < n; i++) {
      edits.push({
        type: "add",
        newIndex: newStart + i,
        value: newMiddle[i],
      });
    }
    for (let k = 0; k < suffixLen; k++) {
      const oldIndex = totalOld - suffixLen + k;
      const newIndex = totalNew - suffixLen + k;
      edits.push({ type: "keep", oldIndex, newIndex });
    }
    return edits;
  }
  if (n === 0) {
    for (let i = m - 1; i >= 0; i--) {
      edits.push({ type: "remove", oldIndex: oldStart + i });
    }
    for (let k = 0; k < suffixLen; k++) {
      const oldIndex = totalOld - suffixLen + k;
      const newIndex = totalNew - suffixLen + k;
      edits.push({ type: "keep", oldIndex, newIndex });
    }
    return edits;
  }

  const { matrix: lcs, width } = computeLCS(oldMiddle, newMiddle, isEqual);
  const lcsAt = (row: number, col: number): number => lcs[row * width + col];

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
    if (i > 0 && j > 0 && isEqual(i - 1, j - 1)) {
      // Elements are equal - keep
      backtrack.push({
        type: "keep",
        oldIndex: oldStart + (i - 1),
        newIndex: newStart + (j - 1),
      });
      i--;
      j--;
    } else if (
      i > 0 &&
      j > 0 &&
      lcsAt(i, j) === lcsAt(i - 1, j - 1) &&
      canDiff(oldMiddle[i - 1], newMiddle[j - 1])
    ) {
      // Both can move diagonally AND both are objects/arrays - use nested diffing
      backtrack.push({
        type: "keep",
        oldIndex: oldStart + (i - 1),
        newIndex: newStart + (j - 1),
      });
      i--;
      j--;
    } else if (i > 0 && j > 0 && lcsAt(i, j) === lcsAt(i - 1, j - 1)) {
      // Both pointers can move diagonally, meaning this is a replacement
      backtrack.push({
        type: "replace",
        oldIndex: oldStart + (i - 1),
        newIndex: newStart + (j - 1),
        value: newMiddle[j - 1],
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcsAt(i, j - 1) >= lcsAt(i - 1, j))) {
      // Insertion
      backtrack.push({
        type: "add",
        newIndex: newStart + (j - 1),
        value: newMiddle[j - 1],
      });
      j--;
    } else if (i > 0) {
      // Deletion
      backtrack.push({ type: "remove", oldIndex: oldStart + (i - 1) });
      i--;
    }
  }

  // Reverse to get forward order
  edits.push(...backtrack.reverse());

  for (let k = 0; k < suffixLen; k++) {
    const oldIndex = totalOld - suffixLen + k;
    const newIndex = totalNew - suffixLen + k;
    edits.push({ type: "keep", oldIndex, newIndex });
  }

  return edits;
};

/**
 * Compare two values and generate patch operations
 */
const diff = (oldVal: JSONValue, newVal: JSONValue, path = ""): Operation[] => {
  const operations: Operation[] = [];

  // If values are equal, no patch needed
  if (deepEqual(oldVal, newVal)) {
    return operations;
  }

  // Handle null (but not undefined at object property level)
  if (oldVal === null || newVal === null) {
    if (oldVal !== newVal) {
      operations.push({ op: "replace", path, value: newVal });
    }
    return operations;
  }

  // Handle undefined - only for root level or array elements
  if (oldVal === undefined || newVal === undefined) {
    if (oldVal === undefined && newVal !== undefined) {
      operations.push({ op: "add", path, value: newVal });
    } else if (oldVal !== undefined && newVal === undefined) {
      operations.push({ op: "remove", path });
    }
    return operations;
  }

  // Handle primitives
  if (typeof oldVal !== "object" || typeof newVal !== "object") {
    operations.push({ op: "replace", path, value: newVal });
    return operations;
  }

  // Handle array to non-array or non-array to array
  if (Array.isArray(oldVal) !== Array.isArray(newVal)) {
    operations.push({ op: "replace", path, value: newVal });
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
        const nestedPath = appendPath(path, String(currentIndex));
        const nestedOps = diff(
          oldVal[edit.oldIndex!],
          newVal[edit.newIndex!],
          nestedPath,
        );
        operations.push(...nestedOps);
        currentIndex++;
      } else if (edit.type === "replace") {
        operations.push({
          op: "replace",
          path: appendPath(path, String(currentIndex)),
          value: edit.value,
        });
        currentIndex++;
      } else if (edit.type === "add") {
        operations.push({
          op: "add",
          path: appendPath(path, String(currentIndex)),
          value: edit.value,
        });
        currentIndex++;
      } else if (edit.type === "remove") {
        operations.push({
          op: "remove",
          path: appendPath(path, String(currentIndex)),
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
    if (!hasOwn.call(objNew, key)) {
      operations.push({ op: "remove", path: appendPath(path, key) });
    }
  }

  // Find added and modified keys
  for (const key of newKeys) {
    if (!hasOwn.call(objOld, key)) {
      // Added key
      operations.push({
        op: "add",
        path: appendPath(path, key),
        value: objNew[key],
      });
    } else {
      // Potentially modified key
      operations.push(...diff(objOld[key], objNew[key], appendPath(path, key)));
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
  return diff(oldObj, newObj, "");
};
