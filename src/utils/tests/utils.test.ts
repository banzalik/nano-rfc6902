import { describe, it, expect } from "vitest";
import {
  pointerSegments,
  unescapePointer,
  isArrayIndexSegment,
  isArrayPointer,
} from "../utils";

describe("pointerSegments", () => {
  it("handles root and empty pointers", () => {
    expect(pointerSegments("")).toEqual([]);
    expect(pointerSegments("/")).toEqual([""]);
  });

  it("returns empty for empty or invalid pointers", () => {
    expect(pointerSegments("")).toEqual([]);
    expect(pointerSegments("not/a/pointer")).toEqual([]);
  });

  it("splits and unescapes segments", () => {
    const ptr = "/a/0/b~1c/~0tilde";
    expect(pointerSegments(ptr)).toEqual(["a", "0", "b/c", "~tilde"]);
  });

  it("keeps array append token", () => {
    expect(pointerSegments("/abc/-")).toEqual(["abc", "-"]);
  });
});

describe("unescapePointer", () => {
  it("decodes per RFC6901", () => {
    expect(unescapePointer("~1")).toBe("/");
    expect(unescapePointer("~0")).toBe("~");
    // RFC 6901: "~1" -> "/", "~0" -> "~"
    expect(unescapePointer("a~1b~0c")).toBe("a/b~c");
  });

  it("leaves plain tokens unchanged", () => {
    expect(unescapePointer("plain")).toBe("plain");
  });
});

describe("isArrayIndexSegment", () => {
  it('detects "-" and numeric indices', () => {
    const truths = ["-", "0", "42", "01"] as const;
    for (const s of truths) {
      expect(isArrayIndexSegment(s)).toBe(true);
    }
    const falses = ["a", "x1", "-1", "1.0"] as const;
    for (const s of falses) {
      expect(isArrayIndexSegment(s)).toBe(false);
    }
  });
});

describe("isArrayPointer", () => {
  it("detects any array addressing at any depth", () => {
    expect(isArrayPointer("/items/0")).toBe(true);
    expect(isArrayPointer("/items/-")).toBe(true);
    expect(isArrayPointer("/nested/arr/10/prop")).toBe(true);
    expect(isArrayPointer("/user/name")).toBe(false);
    expect(isArrayPointer("/a/b~1c")).toBe(false);
  });

  it("does not mark root-only pointer as array", () => {
    expect(isArrayPointer("/")).toBe(false);
  });
});
