/**
 * Shared types for JSON Patch
 */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JSONValue[]
  | { [key: string]: JSONValue };

export interface AddOperation {
  op: "add";
  path: string;
  value: JSONValue;
}

export interface RemoveOperation {
  op: "remove";
  path: string;
}

export interface ReplaceOperation {
  op: "replace";
  path: string;
  value: JSONValue;
}

export interface MoveOperation {
  op: "move";
  from: string;
  path: string;
}

export interface CopyOperation {
  op: "copy";
  from: string;
  path: string;
}

export interface TestOperation {
  op: "test";
  path: string;
  value: JSONValue;
}

export type Operation =
  | AddOperation
  | RemoveOperation
  | ReplaceOperation
  | MoveOperation
  | CopyOperation
  | TestOperation;
