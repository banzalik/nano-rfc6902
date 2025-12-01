import { describe, it, expect } from "vitest";
import type { Operation } from "../../types.ts";
import { isSafeApply } from "../isSafeApply.ts";

const ops = (o: Operation[]): Operation[] => o;

describe("isSafeApply", () => {
  it("returns true for object property adds/replaces/removes", () => {
    const patch: Operation[] = ops([
      { op: "add", path: "/user/name", value: "Ada" },
      { op: "replace", path: "/meta/title", value: "Dr." },
      { op: "remove", path: "/flags/archived" },
    ]);
    expect(isSafeApply(patch)).toBe(true);
  });

  it("returns true for patches with only test operations", () => {
    const patch: Operation[] = [
      { op: "test", path: "/user/name", value: "Ada" },
      { op: "test", path: "/count", value: 1 },
    ];
    expect(isSafeApply(patch)).toBe(true);
  });

  it("returns false when targeting array indices", () => {
    const patch: Operation[] = [{ op: "add", path: "/items/0", value: "a" }];
    expect(isSafeApply(patch)).toBe(false);
  });

  it('returns false when appending to arrays with "-"', () => {
    const patch: Operation[] = [{ op: "add", path: "/items/-", value: "a" }];
    expect(isSafeApply(patch)).toBe(false);
  });

  it("returns false for move/copy touching arrays", () => {
    const p1: Operation[] = [
      { op: "move", from: "/items/0", path: "/items/1" },
    ];
    const p2: Operation[] = [{ op: "copy", from: "/a/0", path: "/b/0" }];
    expect(isSafeApply(p1)).toBe(false);
    expect(isSafeApply(p2)).toBe(false);
  });

  it("returns true for move/copy between object keys only", () => {
    const p: Operation[] = [{ op: "move", from: "/a/key", path: "/b/key" }];
    expect(isSafeApply(p)).toBe(true);
  });

  it("returns false when any operation is unsafe", () => {
    const patch: Operation[] = [
      { op: "replace", path: "/user/name", value: "Ada" },
      { op: "add", path: "/list/2", value: 3 },
    ];
    expect(isSafeApply(patch)).toBe(false);
  });

  it("returns true for empty patch", () => {
    expect(isSafeApply([])).toBe(true);
  });
});
