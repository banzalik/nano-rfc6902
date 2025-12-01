import type { Operation } from "../types";
import { isArrayPointer } from "./utils";

export const isSafeApply = (patch: Operation[]): boolean => {
  if (!Array.isArray(patch) || patch.length === 0) return true;
  for (const op of patch) {
    if (!isSafeOperation(op)) return false;
  }
  return true;
};

const isSafeOperation = (op: Operation): boolean => {
  switch (op.op) {
    case "add":
    case "replace":
    case "remove":
    case "test":
      return !isArrayPointer(op.path);
    case "move":
    case "copy":
      return !isArrayPointer(op.path) && !isArrayPointer(op.from);
    default:
      return false;
  }
};
