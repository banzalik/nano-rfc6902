/**
 * Barrel exports for JSON Patch library
 * Splits implementation into applyPatch and createPatch modules
 */

import { applyPatch } from "./applyPatch";
import { createPatch } from "./createPatch";

export { applyPatch, createPatch };

export type {
  JSONValue,
  Operation,
  AddOperation,
  RemoveOperation,
  ReplaceOperation,
  MoveOperation,
  CopyOperation,
  TestOperation,
} from "./types";

export default {
  applyPatch,
  createPatch,
};
