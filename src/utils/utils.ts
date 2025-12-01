/**
 * JSON Pointer helpers and array path detection.
 *
 * RFC 6901 unescaping: ~1 => '/', ~0 => '~'
 */

/**
 * Split a JSON Pointer string into unescaped segments.
 * Example: "/a/0/b~1c" => ["a", "0", "b/c"]
 */
export const pointerSegments = (pointer: string): string[] => {
  if (!pointer) return [];
  if (pointer[0] !== "/") return []; // not a valid absolute JSON Pointer
  return pointer.slice(1).split("/").map(unescapePointer);
};

/**
 * Unescape a single JSON Pointer segment per RFC 6901.
 */
export const unescapePointer = (seg: string): string => {
  return seg.replace(/~1/g, "/").replace(/~0/g, "~");
};

/**
 * Return true if a segment denotes an array position:
 * - "-" (append to array end)
 * - a non-negative integer index like "0", "1", "42"
 */
export const isArrayIndexSegment = (seg: string): boolean => {
  if (seg === "-") return true;
  return /^\d+$/.test(seg);
};

/**
 * Returns true if any segment in the pointer indicates array addressing.
 * We mark as "touching arrays" if the path navigates through or targets
 * an array index at any depth (including "-" for append).
 */
export const isArrayPointer = (pointer: string): boolean => {
  const segs = pointerSegments(pointer);
  return segs.some(isArrayIndexSegment);
};
