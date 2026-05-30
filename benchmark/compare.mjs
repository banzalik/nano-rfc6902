import { createPatch as nanoCreatePatch, applyPatch as nanoApplyPatch } from "../dist/index.js";
import { createPatch as refCreatePatch, applyPatch as refApplyPatch } from "rfc6902";

const { process, console, structuredClone } = globalThis;

const ITERATIONS = 5000;
const WARMUP = 500;
const RUNS = Number.parseInt(process.env.BENCH_RUNS ?? "21", 10);

const deepClone = (value) => structuredClone(value);

const makeFixtures = () => {
  const before = {
    user: {
      id: 42,
      name: "Chris",
      active: true,
      tags: ["a", "b", "c", "d"],
      profile: {
        city: "NYC",
        age: 30,
        stats: { score: 10, rank: 4 },
      },
    },
    items: [
      { id: 1, qty: 1 },
      { id: 2, qty: 2 },
      { id: 3, qty: 3 },
      { id: 4, qty: 4 },
    ],
  };

  const after = {
    user: {
      id: 42,
      name: "Christopher",
      active: true,
      tags: ["a", "x", "c", "d", "e"],
      profile: {
        city: "Boston",
        age: 31,
        stats: { score: 15, rank: 3 },
      },
    },
    items: [
      { id: 1, qty: 2 },
      { id: 2, qty: 2 },
      { id: 4, qty: 5 },
      { id: 5, qty: 1 },
    ],
  };

  return { before, after };
};

const measure = (fn) => {
  const start = process.hrtime.bigint();
  fn();
  const end = process.hrtime.bigint();
  return Number(end - start) / 1_000_000;
};

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
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

const runDiffBenchmark = (name, createPatchFn, before, after) => {
  for (let i = 0; i < WARMUP; i++) {
    createPatchFn(before, after);
  }

  const { durationMs, runs } = withMedianDuration(() =>
    measure(() => {
      for (let i = 0; i < ITERATIONS; i++) {
        createPatchFn(before, after);
      }
    }),
  );

  return {
    name,
    totalMs: durationMs,
    perOpMs: durationMs / ITERATIONS,
    opsPerSec: (ITERATIONS * 1000) / durationMs,
    runs,
  };
};

const runPatchBenchmark = (name, createPatchFn, applyPatchFn, before, after) => {
  const patch = createPatchFn(before, after);

  for (let i = 0; i < WARMUP; i++) {
    const target = deepClone(before);
    applyPatchFn(target, patch);
  }

  const { durationMs, runs } = withMedianDuration(() =>
    measure(() => {
      for (let i = 0; i < ITERATIONS; i++) {
        const target = deepClone(before);
        applyPatchFn(target, patch);
      }
    }),
  );

  return {
    name,
    totalMs: durationMs,
    perOpMs: durationMs / ITERATIONS,
    opsPerSec: (ITERATIONS * 1000) / durationMs,
    patchLength: patch.length,
    runs,
  };
};

const printTable = (title, rows) => {
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));
  for (const row of rows) {
    const line = [
      `${row.name.padEnd(13)}`,
      `total=${row.totalMs.toFixed(2).padStart(8)}ms`,
      `avg=${row.perOpMs.toFixed(4).padStart(8)}ms/op`,
      `throughput=${row.opsPerSec.toFixed(0).padStart(8)} ops/s`,
      "patchLength" in row ? `patch=${String(row.patchLength).padStart(3)}` : "",
    ]
      .filter(Boolean)
      .join(" | ");
    console.log(line);
  }
};

const main = () => {
  const { before, after } = makeFixtures();

  console.log("JSON Patch benchmark: nano-rfc6902 vs rfc6902");
  console.log(`Iterations: ${ITERATIONS}, Warmup: ${WARMUP}, Runs: ${Number.isInteger(RUNS) && RUNS > 0 ? RUNS : 1} (median)`);

  const diffRows = [
    runDiffBenchmark("nano-rfc6902", nanoCreatePatch, before, after),
    runDiffBenchmark("rfc6902", refCreatePatch, before, after),
  ];

  const patchRows = [
    runPatchBenchmark("nano-rfc6902", nanoCreatePatch, nanoApplyPatch, before, after),
    runPatchBenchmark("rfc6902", refCreatePatch, refApplyPatch, before, after),
  ];

  printTable("Diff benchmark", diffRows);
  printTable("Patch benchmark", patchRows);

  console.log("\nNotes:");
  console.log("- Results are machine-dependent.");
  console.log("- Compare relative throughput under the same Node.js version.");
  console.log("- Run multiple times and consider median values.");
};

main();
