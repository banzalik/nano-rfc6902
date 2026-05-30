import { describe, it, expect } from "vitest";
import {
  applyPatch,
  createPatch,
  type Operation,
  type JSONValue,
} from "../index";

type Spec = {
  name: string;
  input: JSONValue;
  patch: Operation[];
  output: JSONValue;
  results: (string | null)[];
  diffable: boolean;
};

const clone = <T>(value: T): T => structuredClone(value);

// This emulates per-op result capture from older APIs by applying each op separately.
const applyPatchCollectResults = (
  target: JSONValue,
  patch: Operation[],
): (string | null)[] => {
  const results: (string | null)[] = [];
  for (const operation of patch) {
    try {
      applyPatch(target, [operation]);
      results.push(null);
    } catch (error) {
      const name = error instanceof Error ? error.name : "Error";
      results.push(name);
    }
  }
  return results;
};

type OperationTrace = {
  op: Operation["op"];
  ok: boolean;
  error: string | null;
  after: JSONValue;
};

const applyPatchTrackOperations = (
  target: JSONValue,
  patch: Operation[],
): OperationTrace[] => {
  const traces: OperationTrace[] = [];
  for (const operation of patch) {
    try {
      applyPatch(target, [operation]);
      traces.push({
        op: operation.op,
        ok: true,
        error: null,
        after: clone(target),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      traces.push({
        op: operation.op,
        ok: false,
        error: message,
        after: clone(target),
      });
    }
  }
  return traces;
};

const specData: Spec[] = [
  {
    name: "add property",
    input: { a: 1 },
    patch: [{ op: "add", path: "/b", value: 2 }],
    output: { a: 1, b: 2 },
    results: [null],
    diffable: true,
  },
  {
    name: "add nested property",
    input: { obj: { a: "A" } },
    patch: [{ op: "add", path: "/obj/b", value: "B" }],
    output: { obj: { a: "A", b: "B" } },
    results: [null],
    diffable: true,
  },
  {
    name: "add array tail index",
    input: [1, 2],
    patch: [{ op: "add", path: "/2", value: 3 }],
    output: [1, 2, 3],
    results: [null],
    diffable: true,
  },
  {
    name: "remove property",
    input: { a: 1, b: 2 },
    patch: [{ op: "remove", path: "/b" }],
    output: { a: 1 },
    results: [null],
    diffable: true,
  },
  {
    name: "remove array index",
    input: [10, 20, 30],
    patch: [{ op: "remove", path: "/1" }],
    output: [10, 30],
    results: [null],
    diffable: true,
  },
  {
    name: "replace property",
    input: { name: "chris" },
    patch: [{ op: "replace", path: "/name", value: "brown" }],
    output: { name: "brown" },
    results: [null],
    diffable: true,
  },
  {
    name: "replace nested property",
    input: { obj: { x: 1 } },
    patch: [{ op: "replace", path: "/obj/x", value: 2 }],
    output: { obj: { x: 2 } },
    results: [null],
    diffable: true,
  },
  {
    name: "move property",
    input: { a: { x: 1 }, b: {} },
    patch: [{ op: "move", from: "/a/x", path: "/b/x" }],
    output: { a: {}, b: { x: 1 } },
    results: [null],
    diffable: false,
  },
  {
    name: "copy property",
    input: { src: { x: 1 }, dst: {} },
    patch: [{ op: "copy", from: "/src/x", path: "/dst/x" }],
    output: { src: { x: 1 }, dst: { x: 1 } },
    results: [null],
    diffable: false,
  },
  {
    name: "test pass",
    input: { value: 1 },
    patch: [{ op: "test", path: "/value", value: 1 }],
    output: { value: 1 },
    results: [null],
    diffable: false,
  },
  {
    name: "test fail",
    input: { value: 1 },
    patch: [{ op: "test", path: "/value", value: 2 }],
    output: { value: 1 },
    results: ["Error"],
    diffable: false,
  },
  {
    name: "escaped slash key",
    input: { "a/b": 1 },
    patch: [{ op: "replace", path: "/a~1b", value: 2 }],
    output: { "a/b": 2 },
    results: [null],
    diffable: true,
  },
  {
    name: "escaped tilde key",
    input: { "m~n": 8 },
    patch: [{ op: "replace", path: "/m~0n", value: 9 }],
    output: { "m~n": 9 },
    results: [null],
    diffable: true,
  },
  {
    name: "replace root child",
    input: { root: { 0: 4 } },
    patch: [{ op: "replace", path: "/root", value: [4] }],
    output: { root: [4] },
    results: [null],
    diffable: true,
  },
  {
    name: "append with dash",
    input: { tag: [1] },
    patch: [{ op: "add", path: "/tag/-", value: 2 }],
    output: { tag: [1, 2] },
    results: [null],
    diffable: false,
  },
  {
    name: "mixed add and replace",
    input: { a: 1, b: 1 },
    patch: [
      { op: "replace", path: "/a", value: 2 },
      { op: "add", path: "/c", value: 3 },
    ],
    output: { a: 2, b: 1, c: 3 },
    results: [null, null],
    diffable: true,
  },
  {
    name: "remove nested property",
    input: { obj: { a: 1, b: 2 } },
    patch: [{ op: "remove", path: "/obj/b" }],
    output: { obj: { a: 1 } },
    results: [null],
    diffable: true,
  },
  {
    name: "copy to array append",
    input: { current: { timestamp: 23 }, history: [] },
    patch: [{ op: "copy", from: "/current", path: "/history/-" }],
    output: { current: { timestamp: 23 }, history: [{ timestamp: 23 }] },
    results: [null],
    diffable: false,
  },
  {
    name: "move array element",
    input: [1, 2, 3],
    patch: [{ op: "move", from: "/0", path: "/2" }],
    output: [2, 3, 1],
    results: [null],
    diffable: false,
  },
];

describe("spec compatibility", () => {
  it("JSON Pointer - rfc-examples", () => {
    const obj = {
      foo: ["bar", "baz"],
      "": 0,
      "a/b": 1,
      "c%d": 2,
      "e^f": 3,
      "g|h": 4,
      "i\\j": 5,
      "k'l": 6,
      " ": 7,
      "m~n": 8,
    };

    const pointers = [
      { path: "", expected: obj },
      { path: "/foo", expected: ["bar", "baz"] },
      { path: "/foo/0", expected: "bar" },
      { path: "/", expected: 0 },
      { path: "/a~1b", expected: 1 },
      { path: "/c%d", expected: 2 },
      { path: "/e^f", expected: 3 },
      { path: "/g|h", expected: 4 },
      { path: "/i\\j", expected: 5 },
      { path: "/k'l", expected: 6 },
      { path: "/ ", expected: 7 },
      { path: "/m~0n", expected: 8 },
    ];

    for (const pointer of pointers) {
      expect(() => {
        applyPatch(obj, [
          { op: "test", path: pointer.path, value: pointer.expected },
        ]);
      }).not.toThrow();
    }
  });

  it("JSON Pointer - package example", () => {
    const obj = {
      first: "chris",
      last: "brown",
      github: {
        account: {
          id: "chbrown",
          handle: "@chbrown",
        },
        repos: ["amulet", "twilight", "rfc6902"],
        stars: [
          {
            owner: "raspberrypi",
            repo: "userland",
          },
          {
            owner: "angular",
            repo: "angular.js",
          },
        ],
      },
      "github/account": "deprecated",
    };

    const pointers = [
      { path: "/first", expected: "chris" },
      { path: "/github~1account", expected: "deprecated" },
      { path: "/github/account/handle", expected: "@chbrown" },
      { path: "/github/repos", expected: ["amulet", "twilight", "rfc6902"] },
      { path: "/github/repos/2", expected: "rfc6902" },
      { path: "/github/stars/0/repo", expected: "userland" },
    ];

    for (const pointer of pointers) {
      expect(() => {
        applyPatch(obj, [
          { op: "test", path: pointer.path, value: pointer.expected },
        ]);
      }).not.toThrow();
    }
  });

  it("Specification format", () => {
    expect(specData).toHaveLength(19);
    const props = ["diffable", "input", "name", "output", "patch", "results"];
    for (const spec of specData) {
      expect(Object.keys(spec).sort()).toEqual(props);
    }
  });

  for (const spec of specData) {
    it(`patch ${spec.name}`, () => {
      const actual = clone(spec.input);
      const results = applyPatchCollectResults(actual, spec.patch);
      expect(actual).toEqual(spec.output);
      expect(results).toEqual(spec.results);
    });
  }

  for (const spec of specData.filter((item) => item.diffable)) {
    it(`diff ${spec.name}`, () => {
      const actual = createPatch(spec.input, spec.output);
      const expected = spec.patch.filter(
        (operation) => operation.op !== "test",
      );
      expect(actual).toEqual(expected);
    });
  }

  describe("operation tracking matrix", () => {
    it("tracks add operation success and failure", () => {
      const successTarget = { obj: { a: 1 }, arr: [1] };
      const successPatch: Operation[] = [
        { op: "add", path: "/obj/b", value: 2 },
        { op: "add", path: "/arr/-", value: 2 },
      ];
      const successTrace = applyPatchTrackOperations(
        successTarget,
        successPatch,
      );

      expect(successTrace.map((entry) => entry.ok)).toEqual([true, true]);
      expect(successTarget).toEqual({ obj: { a: 1, b: 2 }, arr: [1, 2] });

      const failureTarget = { arr: [1] };
      const failureTrace = applyPatchTrackOperations(failureTarget, [
        { op: "add", path: "/arr/99", value: 3 },
      ]);
      expect(failureTrace[0].ok).toBe(false);
      expect(failureTrace[0].error).toContain("Invalid array index");
      expect(failureTarget).toEqual({ arr: [1] });
    });

    it("tracks remove operation success and failure", () => {
      const successTarget = { obj: { a: 1, b: 2 }, arr: [10, 20, 30] };
      const successTrace = applyPatchTrackOperations(successTarget, [
        { op: "remove", path: "/obj/b" },
        { op: "remove", path: "/arr/1" },
      ]);

      expect(successTrace.map((entry) => entry.ok)).toEqual([true, true]);
      expect(successTarget).toEqual({ obj: { a: 1 }, arr: [10, 30] });

      const failureTarget = { obj: { a: 1 } };
      const failureTrace = applyPatchTrackOperations(failureTarget, [
        { op: "remove", path: "/obj/missing" },
      ]);
      expect(failureTrace[0].ok).toBe(false);
      expect(failureTarget).toEqual({ obj: { a: 1 } });
    });

    it("tracks replace operation success and failure", () => {
      const successTarget = { obj: { v: 1 }, arr: [1, 2] };
      const successTrace = applyPatchTrackOperations(successTarget, [
        { op: "replace", path: "/obj/v", value: 2 },
        { op: "replace", path: "/arr/0", value: 9 },
      ]);

      expect(successTrace.map((entry) => entry.ok)).toEqual([true, true]);
      expect(successTarget).toEqual({ obj: { v: 2 }, arr: [9, 2] });

      const failureTarget = { obj: { v: 1 } };
      const failureTrace = applyPatchTrackOperations(failureTarget, [
        { op: "replace", path: "/obj/missing", value: 2 },
      ]);
      expect(failureTrace[0].ok).toBe(false);
      expect(failureTarget).toEqual({ obj: { v: 1 } });
    });

    it("tracks move operation success and failure", () => {
      const successTarget = { src: { value: 1 }, dst: {} };
      const successTrace = applyPatchTrackOperations(successTarget, [
        { op: "move", from: "/src/value", path: "/dst/value" },
      ]);
      expect(successTrace[0].ok).toBe(true);
      expect(successTarget).toEqual({ src: {}, dst: { value: 1 } });

      const failureTarget = { src: {} };
      const failureTrace = applyPatchTrackOperations(failureTarget, [
        { op: "move", from: "/src/missing", path: "/dst/value" },
      ]);
      expect(failureTrace[0].ok).toBe(false);
      expect(failureTarget).toEqual({ src: {} });
    });

    it("tracks copy operation success and failure", () => {
      const successTarget = { src: { cfg: { a: 1 } }, dst: {} };
      const successTrace = applyPatchTrackOperations(successTarget, [
        { op: "copy", from: "/src/cfg", path: "/dst/cfg" },
      ]);
      expect(successTrace[0].ok).toBe(true);
      expect(successTarget).toEqual({
        src: { cfg: { a: 1 } },
        dst: { cfg: { a: 1 } },
      });

      const failureTarget = { src: {} };
      const failureTrace = applyPatchTrackOperations(failureTarget, [
        { op: "copy", from: "/src/missing", path: "/dst/cfg" },
      ]);
      expect(failureTrace[0].ok).toBe(false);
      expect(failureTarget).toEqual({ src: {} });
    });

    it("tracks test operation success and failure", () => {
      const successTarget = { version: 1 };
      const successTrace = applyPatchTrackOperations(successTarget, [
        { op: "test", path: "/version", value: 1 },
      ]);
      expect(successTrace[0].ok).toBe(true);
      expect(successTarget).toEqual({ version: 1 });

      const failureTarget = { version: 1 };
      const failureTrace = applyPatchTrackOperations(failureTarget, [
        { op: "test", path: "/version", value: 2 },
      ]);
      expect(failureTrace[0].ok).toBe(false);
      expect(failureTrace[0].error).toContain("Test operation failed");
      expect(failureTarget).toEqual({ version: 1 });
    });

    it("stops processing patch when an operation fails", () => {
      const target = { state: "ready", count: 1 };
      const patch: Operation[] = [
        { op: "replace", path: "/state", value: "running" },
        { op: "test", path: "/count", value: 999 },
        { op: "replace", path: "/state", value: "done" },
      ];

      expect(() => applyPatch(target, patch)).toThrow("Test operation failed");
      expect(target).toEqual({ state: "running", count: 1 });
    });
  });
});
