import { describe, it, expect } from "vitest";
import { applyPatch } from "../index.ts";

describe("applyPatch", () => {
  describe("add operation", () => {
    it("should add a new property to object", () => {
      const obj = { first: "Chris" };
      applyPatch(obj, [{ op: "add", path: "/last", value: "Brown" }]);
      expect(obj).toEqual({ first: "Chris", last: "Brown" });
    });

    it("should add multiple properties", () => {
      const obj = { first: "Chris" };
      applyPatch(obj, [
        { op: "add", path: "/last", value: "Brown" },
        { op: "add", path: "/age", value: 30 },
      ]);
      expect(obj).toEqual({ first: "Chris", last: "Brown", age: 30 });
    });

    it("should add nested property", () => {
      const obj = { person: { first: "Chris" } };
      applyPatch(obj, [{ op: "add", path: "/person/last", value: "Brown" }]);
      expect(obj).toEqual({ person: { first: "Chris", last: "Brown" } });
    });

    it("should add array element at specific index", () => {
      const arr = [1, 2, 3];
      applyPatch(arr, [{ op: "add", path: "/1", value: 1.5 }]);
      expect(arr).toEqual([1, 1.5, 2, 3]);
    });

    it("should add array element at end using /-", () => {
      const users = [{ first: "Chris", last: "Brown", age: 20 }];
      applyPatch(users, [
        { op: "add", path: "/-", value: { first: "Raphael", age: 37 } },
      ]);
      expect(users).toEqual([
        { first: "Chris", last: "Brown", age: 20 },
        { first: "Raphael", age: 37 },
      ]);
    });

    it("should add array element at start (index 0)", () => {
      const arr = [2, 3, 4];
      applyPatch(arr, [{ op: "add", path: "/0", value: 1 }]);
      expect(arr).toEqual([1, 2, 3, 4]);
    });

    it("should add multiple elements to array end", () => {
      const arr = [1, 2];
      applyPatch(arr, [
        { op: "add", path: "/-", value: 3 },
        { op: "add", path: "/-", value: 4 },
      ]);
      expect(arr).toEqual([1, 2, 3, 4]);
    });

    it("should add to middle of array", () => {
      const arr = [1, 3];
      applyPatch(arr, [{ op: "add", path: "/1", value: 2 }]);
      expect(arr).toEqual([1, 2, 3]);
    });

    it("should add to empty object", () => {
      const obj = {};
      applyPatch(obj, [{ op: "add", path: "/name", value: "Test" }]);
      expect(obj).toEqual({ name: "Test" });
    });

    it("should add object as value", () => {
      const obj = { name: "Test" };
      applyPatch(obj, [
        { op: "add", path: "/address", value: { city: "NYC", zip: "10001" } },
      ]);
      expect(obj).toEqual({
        name: "Test",
        address: { city: "NYC", zip: "10001" },
      });
    });

    it("should add null value", () => {
      const obj = { name: "Test" };
      applyPatch(obj, [{ op: "add", path: "/value", value: null }]);
      expect(obj).toEqual({ name: "Test", value: null });
    });
  });

  describe("remove operation", () => {
    it("should remove a property from object", () => {
      const obj = { first: "Chris", last: "Brown" };
      applyPatch(obj, [{ op: "remove", path: "/last" }]);
      expect(obj).toEqual({ first: "Chris" });
    });

    it("should remove nested property", () => {
      const obj = { person: { first: "Chris", last: "Brown" } };
      applyPatch(obj, [{ op: "remove", path: "/person/last" }]);
      expect(obj).toEqual({ person: { first: "Chris" } });
    });

    it("should remove array element", () => {
      const arr = [1, 2, 3, 4];
      applyPatch(arr, [{ op: "remove", path: "/2" }]);
      expect(arr).toEqual([1, 2, 4]);
    });

    it("should remove first array element", () => {
      const arr = [1, 2, 3];
      applyPatch(arr, [{ op: "remove", path: "/0" }]);
      expect(arr).toEqual([2, 3]);
    });

    it("should remove last array element", () => {
      const arr = [1, 2, 3];
      applyPatch(arr, [{ op: "remove", path: "/2" }]);
      expect(arr).toEqual([1, 2]);
    });

    it("should remove multiple array elements", () => {
      const arr = [1, 2, 3, 4, 5];
      applyPatch(arr, [
        { op: "remove", path: "/4" },
        { op: "remove", path: "/2" },
      ]);
      expect(arr).toEqual([1, 2, 4]);
    });

    it("should remove multiple properties", () => {
      const obj = { a: 1, b: 2, c: 3 };
      applyPatch(obj, [
        { op: "remove", path: "/a" },
        { op: "remove", path: "/c" },
      ]);
      expect(obj).toEqual({ b: 2 });
    });
  });

  describe("replace operation", () => {
    it("should replace a property value", () => {
      const obj = { first: "Chris", age: 20 };
      applyPatch(obj, [{ op: "replace", path: "/age", value: 21 }]);
      expect(obj).toEqual({ first: "Chris", age: 21 });
    });

    it("should replace string value", () => {
      const obj = { name: "Chris" };
      applyPatch(obj, [{ op: "replace", path: "/name", value: "Christopher" }]);
      expect(obj).toEqual({ name: "Christopher" });
    });

    it("should replace nested value", () => {
      const obj = { person: { age: 20 } };
      applyPatch(obj, [{ op: "replace", path: "/person/age", value: 21 }]);
      expect(obj).toEqual({ person: { age: 21 } });
    });

    it("should replace array element", () => {
      const arr = [1, 2, 3];
      applyPatch(arr, [{ op: "replace", path: "/1", value: 5 }]);
      expect(arr).toEqual([1, 5, 3]);
    });

    it("should replace first array element", () => {
      const arr = [1, 2, 3];
      applyPatch(arr, [{ op: "replace", path: "/0", value: 99 }]);
      expect(arr).toEqual([99, 2, 3]);
    });

    it("should replace last array element", () => {
      const arr = [1, 2, 3];
      applyPatch(arr, [{ op: "replace", path: "/2", value: 99 }]);
      expect(arr).toEqual([1, 2, 99]);
    });

    it("should replace multiple array elements", () => {
      const arr = [1, 2, 3, 4, 5];
      applyPatch(arr, [
        { op: "replace", path: "/1", value: 20 },
        { op: "replace", path: "/3", value: 40 },
      ]);
      expect(arr).toEqual([1, 20, 3, 40, 5]);
    });

    it("should replace with object", () => {
      const obj = { data: "simple" };
      applyPatch(obj, [
        { op: "replace", path: "/data", value: { complex: true } },
      ]);
      expect(obj).toEqual({ data: { complex: true } });
    });

    it("should replace with null", () => {
      const obj = { value: "something" };
      applyPatch(obj, [{ op: "replace", path: "/value", value: null }]);
      expect(obj).toEqual({ value: null });
    });

    it("should replace boolean", () => {
      const obj = { active: false };
      applyPatch(obj, [{ op: "replace", path: "/active", value: true }]);
      expect(obj).toEqual({ active: true });
    });
  });

  describe("move operation", () => {
    it("should move a property within object", () => {
      const obj = { a: { value: 1 }, b: {} };
      applyPatch(obj, [{ op: "move", from: "/a/value", path: "/b/value" }]);
      expect(obj).toEqual({ a: {}, b: { value: 1 } });
    });

    it("should move array element", () => {
      const arr = [1, 2, 3];
      applyPatch(arr, [{ op: "move", from: "/0", path: "/2" }]);
      expect(arr).toEqual([2, 3, 1]);
    });

    it("should move array element from end to start", () => {
      const arr = [1, 2, 3, 4];
      applyPatch(arr, [{ op: "move", from: "/3", path: "/0" }]);
      expect(arr).toEqual([4, 1, 2, 3]);
    });

    it("should move array element to middle", () => {
      const arr = [1, 2, 3, 4];
      applyPatch(arr, [{ op: "move", from: "/0", path: "/2" }]);
      expect(arr).toEqual([2, 3, 1, 4]);
    });

    it("should move within array of objects", () => {
      const arr = [
        { id: 1, name: "A" },
        { id: 2, name: "B" },
        { id: 3, name: "C" },
      ];
      applyPatch(arr, [{ op: "move", from: "/2", path: "/0" }]);
      expect(arr).toEqual([
        { id: 3, name: "C" },
        { id: 1, name: "A" },
        { id: 2, name: "B" },
      ]);
    });
  });

  describe("copy operation", () => {
    it("should copy a property value", () => {
      const obj = { a: { value: 1 }, b: {} };
      applyPatch(obj, [{ op: "copy", from: "/a/value", path: "/b/value" }]);
      expect(obj).toEqual({ a: { value: 1 }, b: { value: 1 } });
    });

    it("should copy array element", () => {
      const arr = [1, 2, 3];
      applyPatch(arr, [{ op: "copy", from: "/0", path: "/-" }]);
      expect(arr).toEqual([1, 2, 3, 1]);
    });
  });

  describe("test operation", () => {
    it("should succeed when value matches", () => {
      const obj = { first: "Chris", age: 20 };
      expect(() => {
        applyPatch(obj, [{ op: "test", path: "/age", value: 20 }]);
      }).not.toThrow();
    });

    it("should throw when value does not match", () => {
      const obj = { first: "Chris", age: 20 };
      expect(() => {
        applyPatch(obj, [{ op: "test", path: "/age", value: 21 }]);
      }).toThrow();
    });

    it("should test nested value", () => {
      const obj = { person: { age: 20 } };
      expect(() => {
        applyPatch(obj, [{ op: "test", path: "/person/age", value: 20 }]);
      }).not.toThrow();
    });

    it("should test nested object with different keys", () => {
      const obj = { data: { a: 1, b: 2 } };
      expect(() => {
        applyPatch(obj, [{ op: "test", path: "/data", value: { a: 1, c: 2 } }]);
      }).toThrow();
    });

    it("should test nested object with different number of keys", () => {
      const obj = { data: { a: 1 } };
      expect(() => {
        applyPatch(obj, [{ op: "test", path: "/data", value: { a: 1, b: 2 } }]);
      }).toThrow();
    });
  });

  describe("complex scenarios", () => {
    it("should apply multiple operations from example", () => {
      const users = [{ first: "Chris", last: "Brown", age: 20 }];
      applyPatch(users, [
        { op: "replace", path: "/0/age", value: 21 },
        { op: "add", path: "/-", value: { first: "Raphael", age: 37 } },
      ]);
      expect(users).toEqual([
        { first: "Chris", last: "Brown", age: 21 },
        { first: "Raphael", age: 37 },
      ]);
    });

    it("should handle sequential operations on same path", () => {
      const obj = { value: 1 };
      applyPatch(obj, [
        { op: "replace", path: "/value", value: 2 },
        { op: "replace", path: "/value", value: 3 },
      ]);
      expect(obj).toEqual({ value: 3 });
    });

    it("should handle operations on arrays of objects", () => {
      const arr = [
        { id: 1, name: "A" },
        { id: 2, name: "B" },
      ];
      applyPatch(arr, [
        { op: "replace", path: "/0/name", value: "Updated" },
        { op: "add", path: "/-", value: { id: 3, name: "C" } },
      ]);
      expect(arr).toEqual([
        { id: 1, name: "Updated" },
        { id: 2, name: "B" },
        { id: 3, name: "C" },
      ]);
    });

    it("should handle deeply nested operations", () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              value: "deep",
            },
          },
        },
      };
      applyPatch(obj, [
        {
          op: "replace",
          path: "/level1/level2/level3/value",
          value: "updated",
        },
      ]);
      expect(obj).toEqual({
        level1: {
          level2: {
            level3: {
              value: "updated",
            },
          },
        },
      });
    });
  });

  describe("error handling", () => {
    it("should throw on invalid JSON Pointer", () => {
      const obj = { first: "Chris" };
      expect(() => {
        applyPatch(obj, [{ op: "add", path: "invalid", value: "test" }]);
      }).toThrow("Invalid JSON Pointer");
    });

    it("should throw on invalid path for remove", () => {
      const obj = { first: "Chris" };
      expect(() => {
        applyPatch(obj, [{ op: "remove", path: "/nonexistent" }]);
      }).toThrow();
    });

    it("should throw on invalid path for replace", () => {
      const obj = { first: "Chris" };
      expect(() => {
        applyPatch(obj, [
          { op: "replace", path: "/nonexistent", value: "test" },
        ]);
      }).toThrow();
    });

    it("should throw on invalid array index", () => {
      const arr = [1, 2, 3];
      expect(() => {
        applyPatch(arr, [{ op: "replace", path: "/10", value: 5 }]);
      }).toThrow();
    });

    it("should throw on unknown operation", () => {
      const obj = { first: "Chris" };
      expect(() => {
        applyPatch(obj, [
          { op: "unknown" as any, path: "/first", value: "test" },
        ]);
      }).toThrow("Unknown operation: unknown");
    });
    it("should throw when accessing path through null", () => {
      const obj = { data: null };
      expect(() => {
        applyPatch(obj, [
          { op: "replace", path: "/data/property", value: "test" },
        ]);
      }).toThrow();
    });

    it("should throw when accessing path through undefined", () => {
      const obj = { data: undefined };
      expect(() => {
        applyPatch(obj, [
          { op: "replace", path: "/data/property", value: "test" },
        ]);
      }).toThrow();
    });

    it("should handle JSON Pointer encoding in paths", () => {
      const obj = { "a~b": "value1", "c/d": "value2" };
      applyPatch(obj, [
        { op: "replace", path: "/a~0b", value: "updated1" },
        { op: "replace", path: "/c~1d", value: "updated2" },
      ]);
      expect(obj).toEqual({ "a~b": "updated1", "c/d": "updated2" });
    });
  });

  describe("complex nested structures", () => {
    it("should apply patches to deeply nested objects with arrays", () => {
      const obj = {
        a: [{ b: 123 }, { c: 456 }, { d: "dasd" }],
        b: {
          c: "dasd",
          h: [{ x: 1 }, { y: 2 }],
        },
      };
      applyPatch(obj, [
        { op: "replace", path: "/a/1/c", value: 789 },
        { op: "replace", path: "/b/h/1/y", value: 99 },
      ]);
      expect(obj).toEqual({
        a: [{ b: 123 }, { c: 789 }, { d: "dasd" }],
        b: {
          c: "dasd",
          h: [{ x: 1 }, { y: 99 }],
        },
      });
    });

    it("should add to nested arrays in complex object", () => {
      const obj = {
        a: [{ b: 123 }],
        b: { c: "test", h: [{ x: 1 }] },
      };
      applyPatch(obj, [
        { op: "add", path: "/a/1", value: { c: 456 } },
        { op: "add", path: "/b/h/1", value: { y: 2 } },
      ]);
      expect(obj).toEqual({
        a: [{ b: 123 }, { c: 456 }],
        b: { c: "test", h: [{ x: 1 }, { y: 2 }] },
      });
    });

    it("should remove from nested arrays", () => {
      const obj = {
        a: [{ b: 123 }, { c: 456 }, { d: "dasd" }],
        b: { c: "dasd", h: [{ x: 1 }, { y: 2 }] },
      };
      applyPatch(obj, [
        { op: "remove", path: "/a/1" },
        { op: "remove", path: "/b/h/1" },
      ]);
      expect(obj).toEqual({
        a: [{ b: 123 }, { d: "dasd" }],
        b: { c: "dasd", h: [{ x: 1 }] },
      });
    });

    it("should handle complex mixed operations on nested structures", () => {
      const obj = {
        users: [
          { id: 1, name: "Alice", meta: { active: true, score: 100 } },
          { id: 2, name: "Bob", meta: { active: false, score: 50 } },
        ],
        config: {
          settings: { theme: "dark", language: "en" },
          features: ["feature1", "feature2"],
        },
      };
      applyPatch(obj, [
        { op: "replace", path: "/users/0/meta/score", value: 150 },
        { op: "replace", path: "/users/1/name", value: "Bobby" },
        { op: "replace", path: "/users/1/meta/active", value: true },
        { op: "replace", path: "/config/settings/theme", value: "light" },
        { op: "add", path: "/config/features/2", value: "feature3" },
      ]);
      expect(obj).toEqual({
        users: [
          { id: 1, name: "Alice", meta: { active: true, score: 150 } },
          { id: 2, name: "Bobby", meta: { active: true, score: 50 } },
        ],
        config: {
          settings: { theme: "light", language: "en" },
          features: ["feature1", "feature2", "feature3"],
        },
      });
    });

    it("should handle 4+ level deep nesting", () => {
      const obj = {
        level1: {
          level2: [{ level3: [{ level4: "value1" }] }],
        },
      };
      applyPatch(obj, [
        {
          op: "replace",
          path: "/level1/level2/0/level3/0/level4",
          value: "value2",
        },
      ]);
      expect(obj).toEqual({
        level1: {
          level2: [{ level3: [{ level4: "value2" }] }],
        },
      });
    });

    it("should handle matrix (array of arrays)", () => {
      const obj = {
        matrix: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9],
        ],
      };
      applyPatch(obj, [
        { op: "replace", path: "/matrix/1/1", value: 99 },
        { op: "add", path: "/matrix/0/-", value: 4 },
      ]);
      expect(obj).toEqual({
        matrix: [
          [1, 2, 3, 4],
          [4, 99, 6],
          [7, 8, 9],
        ],
      });
    });

    it("should add entire nested structure", () => {
      const obj = {
        a: [{ b: 123 }],
      };
      applyPatch(obj, [
        {
          op: "add",
          path: "/newSection",
          value: {
            data: [
              { id: 1, values: [10, 20, 30] },
              { id: 2, values: [40, 50, 60] },
            ],
          },
        },
      ]);
      expect(obj).toEqual({
        a: [{ b: 123 }],
        newSection: {
          data: [
            { id: 1, values: [10, 20, 30] },
            { id: 2, values: [40, 50, 60] },
          ],
        },
      });
    });

    it("should remove entire nested structure", () => {
      const obj = {
        a: [{ b: 123 }],
        removeMe: {
          data: [{ id: 1, values: [10, 20, 30] }],
        },
      };
      applyPatch(obj, [{ op: "remove", path: "/removeMe" }]);
      expect(obj).toEqual({
        a: [{ b: 123 }],
      });
    });

    it("should handle deeply nested array modifications", () => {
      const obj = {
        data: {
          items: [
            { type: "A", value: 1, tags: ["tag1", "tag2"] },
            { type: "B", value: 2, tags: ["tag3"] },
          ],
        },
      };
      applyPatch(obj, [
        { op: "replace", path: "/data/items/0/value", value: 10 },
        { op: "add", path: "/data/items/0/tags/-", value: "tag3" },
        { op: "remove", path: "/data/items/1/tags/0" },
      ]);
      expect(obj).toEqual({
        data: {
          items: [
            { type: "A", value: 10, tags: ["tag1", "tag2", "tag3"] },
            { type: "B", value: 2, tags: [] },
          ],
        },
      });
    });

    it("should handle move operations in nested structures", () => {
      const obj = {
        sections: {
          a: { value: "important" },
          b: {},
        },
      };
      applyPatch(obj, [
        { op: "move", from: "/sections/a/value", path: "/sections/b/value" },
      ]);
      expect(obj).toEqual({
        sections: {
          a: {},
          b: { value: "important" },
        },
      });
    });

    it("should handle copy operations in nested structures", () => {
      const obj = {
        template: { id: 1, config: { setting: "value" } },
        instances: [],
      };
      applyPatch(obj, [
        { op: "copy", from: "/template/config", path: "/instances/-" },
      ]);
      expect(obj.instances).toEqual([{ setting: "value" }]);
      expect(obj.template.config).toEqual({ setting: "value" });
    });

    it("should handle multiple operations on same nested path", () => {
      const obj = {
        data: {
          counters: [
            { id: 1, value: 0 },
            { id: 2, value: 0 },
          ],
        },
      };
      applyPatch(obj, [
        { op: "replace", path: "/data/counters/0/value", value: 1 },
        { op: "replace", path: "/data/counters/0/value", value: 2 },
        { op: "replace", path: "/data/counters/1/value", value: 5 },
      ]);
      expect(obj).toEqual({
        data: {
          counters: [
            { id: 1, value: 2 },
            { id: 2, value: 5 },
          ],
        },
      });
    });
  });

  describe("JSON serialization compatibility", () => {
    it("should work with patches from JSON", () => {
      const obj = { first: "Chris" };
      const patchJson = '[{"op":"add","path":"/last","value":"Brown"}]';
      const patch = JSON.parse(patchJson);

      applyPatch(obj, patch);
      expect(obj).toEqual({ first: "Chris", last: "Brown" });
    });

    it("should work with object from JSON", () => {
      const objJson = '{"first":"Chris"}';
      const obj = JSON.parse(objJson);

      applyPatch(obj, [{ op: "add", path: "/last", value: "Brown" }]);
      expect(obj).toEqual({ first: "Chris", last: "Brown" });
    });
  });
});
