import { describe, it } from "vitest";
import { expectTypeOf } from "vitest";
import type {
  JSONValue,
  Operation,
  AddOperation,
  RemoveOperation,
  ReplaceOperation,
  MoveOperation,
  CopyOperation,
  TestOperation,
} from "../types.ts";

describe("types", () => {
  describe("JSONValue", () => {
    it("should accept primitive types", () => {
      expectTypeOf<string>().toMatchTypeOf<JSONValue>();
      expectTypeOf<number>().toMatchTypeOf<JSONValue>();
      expectTypeOf<boolean>().toMatchTypeOf<JSONValue>();
      expectTypeOf<null>().toMatchTypeOf<JSONValue>();
      expectTypeOf<undefined>().toMatchTypeOf<JSONValue>();
    });

    it("should accept arrays", () => {
      expectTypeOf<string[]>().toMatchTypeOf<JSONValue>();
      expectTypeOf<number[]>().toMatchTypeOf<JSONValue>();
      expectTypeOf<(string | number)[]>().toMatchTypeOf<JSONValue>();
    });

    it("should accept objects", () => {
      expectTypeOf<{ key: string }>().toMatchTypeOf<JSONValue>();
      expectTypeOf<{ [key: string]: number }>().toMatchTypeOf<JSONValue>();
    });

    it("should accept nested structures", () => {
      expectTypeOf<{ data: { items: string[] } }>().toMatchTypeOf<JSONValue>();
    });

    it("should reject non-JSON types", () => {
      // @ts-expect-error - Date is not a JSONValue
      expectTypeOf<Date>().toMatchTypeOf<JSONValue>();

      // @ts-expect-error - Function is not a JSONValue
      expectTypeOf<() => void>().toMatchTypeOf<JSONValue>();

      // @ts-expect-error - Symbol is not a JSONValue
      expectTypeOf<symbol>().toMatchTypeOf<JSONValue>();
    });
  });

  describe("Operation types", () => {
    it("AddOperation should have correct structure", () => {
      expectTypeOf<AddOperation>().toHaveProperty("op");
      expectTypeOf<AddOperation>().toHaveProperty("path");
      expectTypeOf<AddOperation>().toHaveProperty("value");

      expectTypeOf<AddOperation["op"]>().toEqualTypeOf<"add">();
      expectTypeOf<AddOperation["path"]>().toEqualTypeOf<string>();
      expectTypeOf<AddOperation["value"]>().toMatchTypeOf<JSONValue>();
    });

    it("RemoveOperation should have correct structure", () => {
      expectTypeOf<RemoveOperation>().toHaveProperty("op");
      expectTypeOf<RemoveOperation>().toHaveProperty("path");
      expectTypeOf<RemoveOperation>().not.toHaveProperty("value");
      expectTypeOf<RemoveOperation>().not.toHaveProperty("from");

      expectTypeOf<RemoveOperation["op"]>().toEqualTypeOf<"remove">();
      expectTypeOf<RemoveOperation["path"]>().toEqualTypeOf<string>();
    });

    it("ReplaceOperation should have correct structure", () => {
      expectTypeOf<ReplaceOperation>().toHaveProperty("op");
      expectTypeOf<ReplaceOperation>().toHaveProperty("path");
      expectTypeOf<ReplaceOperation>().toHaveProperty("value");
      expectTypeOf<ReplaceOperation>().not.toHaveProperty("from");

      expectTypeOf<ReplaceOperation["op"]>().toEqualTypeOf<"replace">();
      expectTypeOf<ReplaceOperation["path"]>().toEqualTypeOf<string>();
      expectTypeOf<ReplaceOperation["value"]>().toMatchTypeOf<JSONValue>();
    });

    it("MoveOperation should have correct structure", () => {
      expectTypeOf<MoveOperation>().toHaveProperty("op");
      expectTypeOf<MoveOperation>().toHaveProperty("from");
      expectTypeOf<MoveOperation>().toHaveProperty("path");
      expectTypeOf<MoveOperation>().not.toHaveProperty("value");

      expectTypeOf<MoveOperation["op"]>().toEqualTypeOf<"move">();
      expectTypeOf<MoveOperation["from"]>().toEqualTypeOf<string>();
      expectTypeOf<MoveOperation["path"]>().toEqualTypeOf<string>();
    });

    it("CopyOperation should have correct structure", () => {
      expectTypeOf<CopyOperation>().toHaveProperty("op");
      expectTypeOf<CopyOperation>().toHaveProperty("from");
      expectTypeOf<CopyOperation>().toHaveProperty("path");
      expectTypeOf<CopyOperation>().not.toHaveProperty("value");

      expectTypeOf<CopyOperation["op"]>().toEqualTypeOf<"copy">();
      expectTypeOf<CopyOperation["from"]>().toEqualTypeOf<string>();
      expectTypeOf<CopyOperation["path"]>().toEqualTypeOf<string>();
    });

    it("TestOperation should have correct structure", () => {
      expectTypeOf<TestOperation>().toHaveProperty("op");
      expectTypeOf<TestOperation>().toHaveProperty("path");
      expectTypeOf<TestOperation>().toHaveProperty("value");
      expectTypeOf<TestOperation>().not.toHaveProperty("from");

      expectTypeOf<TestOperation["op"]>().toEqualTypeOf<"test">();
      expectTypeOf<TestOperation["path"]>().toEqualTypeOf<string>();
      expectTypeOf<TestOperation["value"]>().toMatchTypeOf<JSONValue>();
    });
  });

  describe("Operation union type", () => {
    it("should accept all operation types", () => {
      const addOp: AddOperation = { op: "add", path: "/test", value: "value" };
      const removeOp: RemoveOperation = { op: "remove", path: "/test" };
      const replaceOp: ReplaceOperation = {
        op: "replace",
        path: "/test",
        value: "value",
      };
      const moveOp: MoveOperation = { op: "move", from: "/from", path: "/to" };
      const copyOp: CopyOperation = { op: "copy", from: "/from", path: "/to" };
      const testOp: TestOperation = {
        op: "test",
        path: "/test",
        value: "value",
      };

      expectTypeOf(addOp).toMatchTypeOf<Operation>();
      expectTypeOf(removeOp).toMatchTypeOf<Operation>();
      expectTypeOf(replaceOp).toMatchTypeOf<Operation>();
      expectTypeOf(moveOp).toMatchTypeOf<Operation>();
      expectTypeOf(copyOp).toMatchTypeOf<Operation>();
      expectTypeOf(testOp).toMatchTypeOf<Operation>();
    });

    it("should reject invalid operation types", () => {
      // @ts-expect-error - invalid op type
      const invalidOp: Operation = { op: "invalid", path: "/test" };

      // @ts-expect-error - missing required value property
      const missingValueOp: Operation = { op: "add", path: "/test" };
    });

    it("should enforce operation-specific properties", () => {
      // @ts-expect-error - add operation must have value
      const addWithoutValue: Operation = { op: "add", path: "/test" };

      // @ts-expect-error - remove operation cannot have value
      const removeWithValue: Operation = {
        op: "remove",
        path: "/test",
      };

      // @ts-expect-error - move operation must have from
      const moveWithoutFrom: Operation = { op: "move", path: "/to" };
    });
  });

  describe("type inference", () => {
    it("should infer operation types from op property", () => {
      const operations = [
        { op: "add" as const, path: "/test", value: "hello" },
        { op: "remove" as const, path: "/test" },
        { op: "replace" as const, path: "/test", value: 42 },
        { op: "move" as const, from: "/from", path: "/to" },
        { op: "copy" as const, from: "/from", path: "/to" },
        { op: "test" as const, path: "/test", value: true },
      ] as const;

      expectTypeOf(operations).toMatchTypeOf<readonly Operation[]>();
    });

    it("should maintain type safety in arrays", () => {
      const patch: Operation[] = [
        { op: "add", path: "/name", value: "John" },
        { op: "remove", path: "/oldField" },
        { op: "replace", path: "/age", value: 30 },
        { op: "move", from: "/temp", path: "/final" },
        { op: "copy", from: "/source", path: "/dest" },
        { op: "test", path: "/status", value: "active" },
      ];

      expectTypeOf(patch).toEqualTypeOf<Operation[]>();
    });
  });
});
