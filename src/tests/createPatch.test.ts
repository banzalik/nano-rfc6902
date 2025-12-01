import { describe, it, expect } from "vitest";
import { createPatch, applyPatch } from "../index.ts";

describe("createPatch", () => {
  describe("add operations", () => {
    it("should create add operation for new property", () => {
      const patch = createPatch(
        { first: "Chris" },
        { first: "Chris", last: "Brown" },
      );

      expect(patch).toEqual([{ op: "add", path: "/last", value: "Brown" }]);
    });

    it("should create add operation for multiple new properties", () => {
      const patch = createPatch(
        { first: "Chris" },
        { first: "Chris", last: "Brown", age: 30 },
      );
      expect(patch).toEqual([
        { op: "add", path: "/last", value: "Brown" },
        { op: "add", path: "/age", value: 30 },
      ]);
    });

    it("should create add operation for nested property", () => {
      const patch = createPatch(
        { person: { first: "Chris" } },
        { person: { first: "Chris", last: "Brown" } },
      );
      expect(patch).toEqual([
        { op: "add", path: "/person/last", value: "Brown" },
      ]);
    });

    it("should create add operation for array element", () => {
      const patch = createPatch([1, 2, 3], [1, 2, 3, 4]);
      expect(patch).toEqual([{ op: "add", path: "/3", value: 4 }]);
    });

    it("should create add operation for new object property", () => {
      const patch = createPatch({}, { address: { city: "NYC" } });
      expect(patch).toEqual([
        { op: "add", path: "/address", value: { city: "NYC" } },
      ]);
    });
  });

  describe("remove operations", () => {
    it("should create remove operation for deleted property", () => {
      const patch = createPatch(
        { first: "Chris", last: "Brown" },
        { first: "Chris" },
      );
      expect(patch).toEqual([{ op: "remove", path: "/last" }]);
    });

    it("should create remove operation for array element", () => {
      const patch = createPatch([1, 2, 3, 4], [1, 2, 3]);
      expect(patch).toEqual([{ op: "remove", path: "/3" }]);
    });

    it("should create remove operation for nested property", () => {
      const patch = createPatch(
        { person: { first: "Chris", last: "Brown" } },
        { person: { first: "Chris" } },
      );
      expect(patch).toEqual([{ op: "remove", path: "/person/last" }]);
    });
  });

  describe("replace operations", () => {
    it("should create replace operation for changed value", () => {
      const patch = createPatch(
        { first: "Chris", age: 20 },
        { first: "Chris", age: 21 },
      );
      expect(patch).toEqual([{ op: "replace", path: "/age", value: 21 }]);
    });

    it("should create replace operation for changed string", () => {
      const patch = createPatch({ first: "Chris" }, { first: "Christopher" });
      expect(patch).toEqual([
        { op: "replace", path: "/first", value: "Christopher" },
      ]);
    });

    it("should create replace operation for changed nested value", () => {
      const patch = createPatch(
        { person: { age: 20 } },
        { person: { age: 21 } },
      );
      expect(patch).toEqual([
        { op: "replace", path: "/person/age", value: 21 },
      ]);
    });

    it("should create replace operation for array element", () => {
      const patch = createPatch([1, 2, 3], [1, 5, 3]);
      expect(patch).toEqual([{ op: "replace", path: "/1", value: 5 }]);
    });

    it("should create replace operation for changed object", () => {
      const patch = createPatch(
        { address: { city: "LA" } },
        { address: { city: "NYC" } },
      );
      expect(patch).toEqual([
        { op: "replace", path: "/address/city", value: "NYC" },
      ]);
    });
  });

  describe("complex scenarios", () => {
    it("should handle mix of operations", () => {
      const patch = createPatch(
        { first: "Chris", age: 20, temp: "remove" },
        { first: "Chris", age: 21, last: "Brown" },
      );
      expect(patch).toContainEqual({ op: "replace", path: "/age", value: 21 });
      expect(patch).toContainEqual({
        op: "add",
        path: "/last",
        value: "Brown",
      });
      expect(patch).toContainEqual({ op: "remove", path: "/temp" });
    });

    it("should handle empty to object", () => {
      const patch = createPatch({}, { first: "Chris" });
      expect(patch).toEqual([{ op: "add", path: "/first", value: "Chris" }]);
    });

    it("should handle object to empty", () => {
      const patch = createPatch({ first: "Chris" }, {});
      expect(patch).toEqual([{ op: "remove", path: "/first" }]);
    });

    it("should handle identical objects", () => {
      const patch = createPatch(
        { first: "Chris", last: "Brown" },
        { first: "Chris", last: "Brown" },
      );
      expect(patch).toEqual([]);
    });

    it("should handle null values", () => {
      const patch = createPatch({ first: "Chris" }, { first: null });
      expect(patch).toEqual([{ op: "replace", path: "/first", value: null }]);
    });

    it("should handle boolean values", () => {
      const patch = createPatch({ active: false }, { active: true });
      expect(patch).toEqual([{ op: "replace", path: "/active", value: true }]);
    });

    it("should handle undefined values", () => {
      const patch = createPatch({ first: "Chris" }, { first: undefined });
      expect(patch).toEqual([{ op: "remove", path: "/first" }]);
    });
    it("should handle array to object conversion", () => {
      const patch = createPatch([1, 2, 3], { a: 1, b: 2, c: 3 });
      expect(patch).toEqual([
        { op: "replace", path: "", value: { a: 1, b: 2, c: 3 } },
      ]);
    });

    it("should handle object to array conversion", () => {
      const patch = createPatch({ a: 1, b: 2 }, [1, 2]);
      expect(patch).toEqual([{ op: "replace", path: "", value: [1, 2] }]);
    });
  });

  describe("array operations", () => {
    it("should handle empty to array", () => {
      const patch = createPatch([], [1, 2, 3]);
      expect(patch).toEqual([
        { op: "add", path: "/0", value: 1 },
        { op: "add", path: "/1", value: 2 },
        { op: "add", path: "/2", value: 3 },
      ]);
    });

    it("should handle array with objects", () => {
      const patch = createPatch([{ id: 1, name: "A" }], [{ id: 1, name: "B" }]);
      expect(patch).toEqual([{ op: "replace", path: "/0/name", value: "B" }]);
    });

    it("should detect add to end of array", () => {
      const patch = createPatch([1, 2, 3], [1, 2, 3, 4, 5]);
      expect(patch).toEqual([
        { op: "add", path: "/3", value: 4 },
        { op: "add", path: "/4", value: 5 },
      ]);
    });

    it("should detect add to start of array", () => {
      const patch = createPatch([2, 3, 4], [1, 2, 3, 4]);
      expect(patch).toContainEqual({ op: "add", path: "/0", value: 1 });
    });

    it("should detect add in middle of array", () => {
      const patch = createPatch([1, 3], [1, 2, 3]);
      expect(patch).toContainEqual({ op: "add", path: "/1", value: 2 });
    });

    it("should detect modify element in array", () => {
      const patch = createPatch([1, 2, 3, 4], [1, 2, 99, 4]);
      expect(patch).toEqual([{ op: "replace", path: "/2", value: 99 }]);
    });

    it("should detect multiple modifications in array", () => {
      const patch = createPatch([1, 2, 3, 4, 5], [1, 20, 3, 40, 5]);
      expect(patch).toContainEqual({ op: "replace", path: "/1", value: 20 });
      expect(patch).toContainEqual({ op: "replace", path: "/3", value: 40 });
    });

    it("should detect delete from array", () => {
      const patch = createPatch([1, 2, 3, 4, 5], [1, 2, 4, 5]);
      expect(patch).toContainEqual({ op: "remove", path: "/2" });
    });

    it("should detect delete from start of array", () => {
      const patch = createPatch([1, 2, 3], [2, 3]);
      expect(patch).toContainEqual({ op: "remove", path: "/0" });
    });

    it("should detect delete from end of array", () => {
      const patch = createPatch([1, 2, 3], [1, 2]);
      expect(patch).toEqual([{ op: "remove", path: "/2" }]);
    });

    it("should detect multiple deletes from array", () => {
      const patch = createPatch([1, 2, 3, 4, 5], [1, 3, 5]);
      expect(
        patch.filter((op) => op.op === "remove").length,
      ).toBeGreaterThanOrEqual(2);
    });

    it("should detect move inside array (element shifted)", () => {
      const patch = createPatch([1, 2, 3, 4], [2, 3, 4, 1]);
      // Moving an element can be detected as remove + add
      expect(patch.length).toBeGreaterThan(0);
    });

    it("should handle array of objects with modifications", () => {
      const patch = createPatch(
        [
          { id: 1, name: "Alice", age: 30 },
          { id: 2, name: "Bob", age: 25 },
        ],
        [
          { id: 1, name: "Alice", age: 31 },
          { id: 2, name: "Bobby", age: 25 },
        ],
      );
      expect(patch).toContainEqual({
        op: "replace",
        path: "/0/age",
        value: 31,
      });
      expect(patch).toContainEqual({
        op: "replace",
        path: "/1/name",
        value: "Bobby",
      });
    });

    it("should handle array of objects with add", () => {
      const patch = createPatch(
        [{ id: 1, name: "Alice" }],
        [
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
        ],
      );
      expect(patch).toContainEqual({
        op: "add",
        path: "/1",
        value: { id: 2, name: "Bob" },
      });
    });

    it("should handle array of objects with delete", () => {
      const patch = createPatch(
        [
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
        ],
        [{ id: 1, name: "Alice" }],
      );
      expect(patch).toContainEqual({ op: "remove", path: "/1" });
    });

    it("should handle moving complex objects inside array", () => {
      const patch = createPatch(
        [
          {
            id: 1,
            name: "Alice",
            role: "admin",
            meta: { active: true, score: 100 },
          },
          {
            id: 2,
            name: "Bob",
            role: "user",
            meta: { active: true, score: 85 },
          },
          {
            id: 3,
            name: "Charlie",
            role: "moderator",
            meta: { active: false, score: 92 },
          },
        ],
        [
          {
            id: 2,
            name: "Bob",
            role: "user",
            meta: { active: true, score: 85 },
          },
          {
            id: 3,
            name: "Charlie",
            role: "moderator",
            meta: { active: false, score: 92 },
          },
          {
            id: 1,
            name: "Alice",
            role: "admin",
            meta: { active: true, score: 100 },
          },
        ],
      );
      // LCS-based diff should detect this as a series of operations
      // The exact operations depend on the algorithm, but should successfully transform the array
      expect(patch.length).toBeGreaterThan(0);

      // Verify the patch can be applied correctly
      const original = [
        {
          id: 1,
          name: "Alice",
          role: "admin",
          meta: { active: true, score: 100 },
        },
        { id: 2, name: "Bob", role: "user", meta: { active: true, score: 85 } },
        {
          id: 3,
          name: "Charlie",
          role: "moderator",
          meta: { active: false, score: 92 },
        },
      ];
      const expected = [
        { id: 2, name: "Bob", role: "user", meta: { active: true, score: 85 } },
        {
          id: 3,
          name: "Charlie",
          role: "moderator",
          meta: { active: false, score: 92 },
        },
        {
          id: 1,
          name: "Alice",
          role: "admin",
          meta: { active: true, score: 100 },
        },
      ];

      // Apply patch to verify correctness
      const testObj = JSON.parse(JSON.stringify(original));
      applyPatch(testObj, patch);
      expect(testObj).toEqual(expected);
    });

    it("should handle reordering with complex nested objects", () => {
      const patch = createPatch(
        [
          {
            userId: "user-1",
            profile: { firstName: "John", lastName: "Doe" },
            settings: { theme: "dark", notifications: true },
          },
          {
            userId: "user-2",
            profile: { firstName: "Jane", lastName: "Smith" },
            settings: { theme: "light", notifications: false },
          },
        ],
        [
          {
            userId: "user-2",
            profile: { firstName: "Jane", lastName: "Smith" },
            settings: { theme: "light", notifications: false },
          },
          {
            userId: "user-1",
            profile: { firstName: "John", lastName: "Doe" },
            settings: { theme: "dark", notifications: true },
          },
        ],
      );

      expect(patch.length).toBeGreaterThan(0);

      // The patch should contain operations that transform the first array into the second
      // It might be remove + add operations due to reordering
      const hasRemoveOps = patch.some((op) => op.op === "remove");
      const hasAddOps = patch.some((op) => op.op === "add");
      expect(hasRemoveOps || hasAddOps).toBe(true);
    });

    it("should handle complex array changes", () => {
      const patch = createPatch([1, 2, 3], [1, 20, 3, 4]);
      expect(patch).toContainEqual({ op: "replace", path: "/1", value: 20 });
      expect(patch).toContainEqual({ op: "add", path: "/3", value: 4 });
    });

    it("should handle nested arrays", () => {
      const patch = createPatch(
        [
          [1, 2],
          [3, 4],
        ],
        [
          [1, 2],
          [3, 4, 5],
        ],
      );
      expect(patch).toEqual([{ op: "add", path: "/1/2", value: 5 }]);
    });

    it("should handle array to empty array", () => {
      const patch = createPatch([1, 2, 3], []);
      expect(patch.filter((op) => op.op === "remove").length).toBe(3);
    });
  });

  describe("complex nested structures", () => {
    it("should handle deeply nested objects with arrays", () => {
      const obj1 = {
        a: [{ b: 123 }, { c: 456 }, { d: "dasd" }],
        b: {
          c: "dasd",
          h: [{ x: 1 }, { y: 2 }],
        },
      };
      const obj2 = {
        a: [{ b: 123 }, { c: 789 }, { d: "dasd" }],
        b: {
          c: "dasd",
          h: [{ x: 1 }, { y: 2 }],
        },
      };
      const patch = createPatch(obj1, obj2);
      expect(patch).toContainEqual({
        op: "replace",
        path: "/a/1/c",
        value: 789,
      });
    });

    it("should handle adding to nested array in object", () => {
      const obj1 = {
        a: [{ b: 123 }],
        b: { c: "test", h: [{ x: 1 }] },
      };
      const obj2 = {
        a: [{ b: 123 }, { c: 456 }],
        b: { c: "test", h: [{ x: 1 }, { y: 2 }] },
      };
      const patch = createPatch(obj1, obj2);
      expect(patch).toContainEqual({
        op: "add",
        path: "/a/1",
        value: { c: 456 },
      });
      expect(patch).toContainEqual({
        op: "add",
        path: "/b/h/1",
        value: { y: 2 },
      });
    });

    it("should handle removing from nested array", () => {
      const obj1 = {
        a: [{ b: 123 }, { c: 456 }, { d: "dasd" }],
        b: { c: "dasd", h: [{ x: 1 }, { y: 2 }] },
      };
      const obj2 = {
        a: [{ b: 123 }, { d: "dasd" }],
        b: { c: "dasd", h: [{ x: 1 }] },
      };
      const patch = createPatch(obj1, obj2);
      expect(patch).toContainEqual({ op: "remove", path: "/a/1" });
      expect(patch).toContainEqual({ op: "remove", path: "/b/h/1" });
    });

    it("should handle modifying nested object properties", () => {
      const obj1 = {
        a: [{ b: 123, extra: "data" }],
        b: { c: "dasd", h: [{ x: 1, name: "first" }] },
      };
      const obj2 = {
        a: [{ b: 999, extra: "data" }],
        b: { c: "modified", h: [{ x: 1, name: "updated" }] },
      };
      const patch = createPatch(obj1, obj2);
      expect(patch).toContainEqual({
        op: "replace",
        path: "/a/0/b",
        value: 999,
      });
      expect(patch).toContainEqual({
        op: "replace",
        path: "/b/c",
        value: "modified",
      });
      expect(patch).toContainEqual({
        op: "replace",
        path: "/b/h/0/name",
        value: "updated",
      });
    });

    it("should handle complex mixed operations", () => {
      const obj1 = {
        users: [
          { id: 1, name: "Alice", meta: { active: true, score: 100 } },
          { id: 2, name: "Bob", meta: { active: false, score: 50 } },
        ],
        config: {
          settings: { theme: "dark", language: "en" },
          features: ["feature1", "feature2"],
        },
      };
      const obj2 = {
        users: [
          { id: 1, name: "Alice", meta: { active: true, score: 150 } },
          { id: 2, name: "Bobby", meta: { active: true, score: 50 } },
        ],
        config: {
          settings: { theme: "light", language: "en" },
          features: ["feature1", "feature2", "feature3"],
        },
      };
      const patch = createPatch(obj1, obj2);

      expect(patch).toContainEqual({
        op: "replace",
        path: "/users/0/meta/score",
        value: 150,
      });
      expect(patch).toContainEqual({
        op: "replace",
        path: "/users/1/name",
        value: "Bobby",
      });
      expect(patch).toContainEqual({
        op: "replace",
        path: "/users/1/meta/active",
        value: true,
      });
      expect(patch).toContainEqual({
        op: "replace",
        path: "/config/settings/theme",
        value: "light",
      });
      expect(patch).toContainEqual({
        op: "add",
        path: "/config/features/2",
        value: "feature3",
      });
    });

    it("should handle deeply nested arrays (3+ levels)", () => {
      const obj1 = {
        level1: {
          level2: [{ level3: [{ level4: "value1" }] }],
        },
      };
      const obj2 = {
        level1: {
          level2: [{ level3: [{ level4: "value2" }] }],
        },
      };
      const patch = createPatch(obj1, obj2);
      expect(patch).toEqual([
        {
          op: "replace",
          path: "/level1/level2/0/level3/0/level4",
          value: "value2",
        },
      ]);
    });

    it("should handle array of arrays with modifications", () => {
      const obj1 = {
        matrix: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9],
        ],
      };
      const obj2 = {
        matrix: [
          [1, 2, 3],
          [4, 99, 6],
          [7, 8, 9],
        ],
      };
      const patch = createPatch(obj1, obj2);
      expect(patch).toEqual([
        { op: "replace", path: "/matrix/1/1", value: 99 },
      ]);
    });

    it("should handle complex object with null and undefined values", () => {
      const obj1 = {
        a: [{ b: null, c: "test" }],
        b: { c: undefined, d: "value" },
      };
      const obj2 = {
        a: [{ b: "updated", c: "test" }],
        b: { c: null, d: "value" },
      };
      const patch = createPatch(obj1, obj2);
      expect(patch).toContainEqual({
        op: "replace",
        path: "/a/0/b",
        value: "updated",
      });
      expect(patch).toContainEqual({
        op: "replace",
        path: "/b/c",
        value: null,
      });
    });

    it("should handle adding entire nested structure", () => {
      const obj1 = {
        a: [{ b: 123 }],
      };
      const obj2 = {
        a: [{ b: 123 }],
        newSection: {
          data: [
            { id: 1, values: [10, 20, 30] },
            { id: 2, values: [40, 50, 60] },
          ],
        },
      };
      const patch = createPatch(obj1, obj2);
      expect(patch).toEqual([
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
    });

    it("should handle removing entire nested structure", () => {
      const obj1 = {
        a: [{ b: 123 }],
        removeMe: {
          data: [{ id: 1, values: [10, 20, 30] }],
        },
      };
      const obj2 = {
        a: [{ b: 123 }],
      };
      const patch = createPatch(obj1, obj2);
      expect(patch).toEqual([{ op: "remove", path: "/removeMe" }]);
    });

    it("should handle restructuring nested data", () => {
      const obj1 = {
        data: {
          items: [
            { type: "A", value: 1 },
            { type: "B", value: 2 },
          ],
          metadata: { count: 2 },
        },
      };
      const obj2 = {
        data: {
          items: [
            { type: "A", value: 10 },
            { type: "C", value: 3 },
          ],
          metadata: { count: 2, updated: true },
        },
      };
      const patch = createPatch(obj1, obj2);
      expect(patch).toContainEqual({
        op: "replace",
        path: "/data/items/0/value",
        value: 10,
      });
      expect(patch).toContainEqual({
        op: "replace",
        path: "/data/items/1/type",
        value: "C",
      });
      expect(patch).toContainEqual({
        op: "replace",
        path: "/data/items/1/value",
        value: 3,
      });
      expect(patch).toContainEqual({
        op: "add",
        path: "/data/metadata/updated",
        value: true,
      });
    });
  });

  describe("JSON serialization", () => {
    it("should work with JSON.stringify/parse roundtrip", () => {
      const obj1 = { first: "Chris" };
      const obj2 = { first: "Chris", last: "Brown" };

      const serialized1 = JSON.parse(JSON.stringify(obj1));
      const serialized2 = JSON.parse(JSON.stringify(obj2));

      const patch = createPatch(serialized1, serialized2);
      expect(patch).toEqual([{ op: "add", path: "/last", value: "Brown" }]);
    });
  });
});
