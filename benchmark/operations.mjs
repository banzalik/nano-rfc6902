import { createPatch as nanoCreatePatch, applyPatch as nanoApplyPatch } from "../dist/index.js";
import { createPatch as refCreatePatch, applyPatch as refApplyPatch } from "rfc6902";

const { process, console } = globalThis;

const ITERATIONS = Number.parseInt(process.env.BENCH_ITERATIONS ?? "5000", 10);
const WARMUP = Number.parseInt(process.env.BENCH_WARMUP ?? "500", 10);
const RUNS = Number.parseInt(process.env.BENCH_RUNS ?? "21", 10);

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
};

const measureMs = (fn) => {
  const start = process.hrtime.bigint();
  fn();
  const end = process.hrtime.bigint();
  return Number(end - start) / 1_000_000;
};

const withMedianDuration = (measureFn) => {
  const runs = Number.isInteger(RUNS) && RUNS > 0 ? RUNS : 1;
  const durations = [];
  for (let i = 0; i < runs; i++) {
    durations.push(measureFn());
  }
  return {
    durationMs: median(durations),
    runs,
  };
};

const formatPerf = (row) => {
  return [
    row.name.padEnd(20),
    `total=${row.totalMs.toFixed(2).padStart(8)}ms`,
    `avg=${row.perOpMs.toFixed(4).padStart(8)}ms/op`,
    `throughput=${row.opsPerSec.toFixed(0).padStart(8)} ops/s`,
  ].join(" | ");
};

const printSection = (title, lines) => {
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));
  for (const line of lines) {
    console.log(line);
  }
};

const applyCases = [
  {
    op: "add",
    makeTarget: () => ({ obj: { a: 1 }, arr: [1, 2] }),
    patch: [{ op: "add", path: "/obj/b", value: 2 }],
  },
  {
    op: "remove",
    makeTarget: () => ({ obj: { a: 1, b: 2 }, arr: [1, 2, 3] }),
    patch: [{ op: "remove", path: "/obj/b" }],
  },
  {
    op: "replace",
    makeTarget: () => ({ obj: { a: 1 }, arr: [1, 2] }),
    patch: [{ op: "replace", path: "/obj/a", value: 99 }],
  },
  {
    op: "move",
    makeTarget: () => ({ src: { value: { x: 1 } }, dst: {} }),
    patch: [{ op: "move", from: "/src/value", path: "/dst/value" }],
  },
  {
    op: "copy",
    makeTarget: () => ({ src: { value: { x: 1 } }, dst: {} }),
    patch: [{ op: "copy", from: "/src/value", path: "/dst/value" }],
  },
  {
    op: "test",
    makeTarget: () => ({ version: 7, payload: { a: 1 } }),
    patch: [{ op: "test", path: "/version", value: 7 }],
  },
];

const createCases = [
  {
    op: "add",
    before: { obj: { a: 1 } },
    after: { obj: { a: 1, b: 2 } },
  },
  {
    op: "remove",
    before: { obj: { a: 1, b: 2 } },
    after: { obj: { a: 1 } },
  },
  {
    op: "replace",
    before: { obj: { a: 1 } },
    after: { obj: { a: 2 } },
  },
  {
    op: "move",
    unsupported: true,
    reason: "createPatch is diff-based and does not emit move operations",
  },
  {
    op: "copy",
    unsupported: true,
    reason: "createPatch is diff-based and does not emit copy operations",
  },
  {
    op: "test",
    unsupported: true,
    reason: "createPatch is diff-based and does not emit test operations",
  },
];

const runApplyCase = (libraryName, applyPatchFn, testCase) => {
  for (let i = 0; i < WARMUP; i++) {
    const target = testCase.makeTarget();
    applyPatchFn(target, testCase.patch);
  }

  const { durationMs } = withMedianDuration(() =>
    measureMs(() => {
      for (let i = 0; i < ITERATIONS; i++) {
        const target = testCase.makeTarget();
        applyPatchFn(target, testCase.patch);
      }
    }),
  );

  return {
    name: `${testCase.op} ${libraryName}`,
    totalMs: durationMs,
    perOpMs: durationMs / ITERATIONS,
    opsPerSec: (ITERATIONS * 1000) / durationMs,
  };
};

const runCreateCase = (libraryName, createPatchFn, testCase) => {
  if (testCase.unsupported) {
    return {
      op: testCase.op,
      unsupported: true,
      reason: testCase.reason,
    };
  }

  for (let i = 0; i < WARMUP; i++) {
    createPatchFn(testCase.before, testCase.after);
  }

  const { durationMs } = withMedianDuration(() =>
    measureMs(() => {
      for (let i = 0; i < ITERATIONS; i++) {
        createPatchFn(testCase.before, testCase.after);
      }
    }),
  );

  const patch = createPatchFn(testCase.before, testCase.after);
  const opKinds = Array.from(new Set(patch.map((operation) => operation.op))).join(",");

  return {
    op: testCase.op,
    unsupported: false,
    name: `${testCase.op} ${libraryName}`,
    totalMs: durationMs,
    perOpMs: durationMs / ITERATIONS,
    opsPerSec: (ITERATIONS * 1000) / durationMs,
    emitted: opKinds || "none",
    patchLength: patch.length,
  };
};

const main = () => {
  console.log("Operation benchmark: nano-rfc6902 vs rfc6902");
  console.log(
    `Iterations: ${ITERATIONS}, Warmup: ${WARMUP}, Runs: ${Number.isInteger(RUNS) && RUNS > 0 ? RUNS : 1} (median)`,
  );

  const applyLines = [];
  for (const testCase of applyCases) {
    const nano = runApplyCase("nano-rfc6902", nanoApplyPatch, testCase);
    const ref = runApplyCase("rfc6902", refApplyPatch, testCase);
    applyLines.push(formatPerf(nano));
    applyLines.push(formatPerf(ref));
    applyLines.push("");
  }

  printSection("applyPatch per operation", applyLines);

  const createLines = [];
  for (const testCase of createCases) {
    if (testCase.unsupported) {
      createLines.push(
        `${testCase.op.padEnd(20)} | unsupported | ${testCase.reason}`,
      );
      continue;
    }

    const nano = runCreateCase("nano-rfc6902", nanoCreatePatch, testCase);
    const ref = runCreateCase("rfc6902", refCreatePatch, testCase);

    createLines.push(
      `${formatPerf(nano)} | emitted=${nano.emitted.padEnd(7)} | patch=${String(nano.patchLength).padStart(2)}`,
    );
    createLines.push(
      `${formatPerf(ref)} | emitted=${ref.emitted.padEnd(7)} | patch=${String(ref.patchLength).padStart(2)}`,
    );
    createLines.push("");
  }

  printSection("createPatch per operation", createLines);

  console.log("\nNotes:");
  console.log("- applyPatch section benchmarks direct RFC operations.");
  console.log("- createPatch only emits diff operations (add/remove/replace).");
  console.log("- move/copy/test are marked unsupported for createPatch by design.");
};

main();
