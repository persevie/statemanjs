import { createState } from "../packages/statemanjs/statemanjs.js";
import { createStore } from "redux";
import { configureStore, createSlice } from "@reduxjs/toolkit";
import { observable, reaction, configure, computed } from "mobx";
import { createStore as createEffectorStore, createEvent } from "effector";
import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

configure({ enforceActions: "never" });

const ITEMS_COUNT = 10000;
const ITEMS_COUNT_MEDIAN = Math.round(ITEMS_COUNT / 2);
const WARMUP_ITERATIONS = 1000;
const BENCHMARK_ITERATIONS = 1000;
const OPERATIONS_PER_SAMPLE = 100;

const createCounter = () => 0;
const createArray = () => Array.from({ length: ITEMS_COUNT }, (_, i) => i);
const createObject = () =>
    Object.fromEntries(
        Array.from({ length: ITEMS_COUNT }, (_, i) => [i.toString(), i]),
    );

interface BenchmarkResult {
    library: string;
    operation: string;
    avgTime: number;
    minTime: number;
    maxTime: number;
    opsPerSecond: number;
}

interface BenchMeasurement {
    elapsedMs: number;
    operations: number;
}

const results: BenchmarkResult[] = [];

const ensureUnsubscribe = (
    maybeUnsubscribe: unknown,
): (() => void) | undefined => {
    if (typeof maybeUnsubscribe === "function") {
        return maybeUnsubscribe as () => void;
    }

    if (
        maybeUnsubscribe &&
        typeof maybeUnsubscribe === "object" &&
        "unsubscribe" in maybeUnsubscribe &&
        typeof (maybeUnsubscribe as { unsubscribe?: unknown }).unsubscribe ===
            "function"
    ) {
        const subscription = maybeUnsubscribe as { unsubscribe: () => void };
        return () => subscription.unsubscribe();
    }

    return undefined;
};

function finalizeMeasurement(
    unsubscribe: (() => void) | undefined,
    notifications: number,
    expectedNotifications: number,
    startTime: number,
    endTime: number,
): BenchMeasurement | undefined {
    unsubscribe?.();

    if (notifications < expectedNotifications) {
        return undefined;
    }

    return {
        elapsedMs: Math.max(endTime - startTime, 0),
        operations: expectedNotifications,
    };
}

function runBenchmark(
    library: string,
    operation: string,
    setupFn: () => void,
    benchFn: () => BenchMeasurement | undefined,
): BenchmarkResult {
    setupFn();

    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
        benchFn();
    }

    setupFn();

    const perOperationTimes: number[] = [];
    let totalDuration = 0;
    let totalOperations = 0;
    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
        const measurement = benchFn();
        if (!measurement) {
            continue;
        }

        const operations = measurement.operations;
        const duration = Math.max(measurement.elapsedMs, 0);

        if (
            !Number.isFinite(duration) ||
            !Number.isFinite(operations) ||
            operations <= 0
        ) {
            continue;
        }

        totalDuration += duration;
        totalOperations += operations;
        perOperationTimes.push(duration / operations);
    }

    if (perOperationTimes.length === 0 || totalOperations === 0) {
        console.warn(
            `No valid samples captured for ${library} (${operation}). Returning zeros.`,
        );
        return {
            library,
            operation,
            avgTime: 0,
            minTime: 0,
            maxTime: 0,
            opsPerSecond: 0,
        };
    }

    const avgTime = totalDuration / totalOperations;
    const minTime = Math.min(...perOperationTimes);
    const maxTime = Math.max(...perOperationTimes);
    const safeAvg = avgTime > 0 ? avgTime : Number.EPSILON;
    const opsPerSecond = 1000 / safeAvg;

    return {
        library,
        operation,
        avgTime,
        minTime,
        maxTime,
        opsPerSecond,
    };
}

console.log("Starting benchmark with warmup and multiple iterations...\n");
console.log(`Configuration:
- Items count: ${ITEMS_COUNT}
- Warmup iterations: ${WARMUP_ITERATIONS}
- Benchmark iterations: ${BENCHMARK_ITERATIONS}
- Operations per sample: ${OPERATIONS_PER_SAMPLE}
\n`);

// ============================================================
// STATEMANJS
// ============================================================

console.log("Benchmarking StatemanJS...");

// Counter
results.push(
    runBenchmark(
        "StatemanJS",
        "counter",
        () => {},
        () => {
            const operations = OPERATIONS_PER_SAMPLE;
            const state = createState(createCounter());
            let notifications = 0;
            let endTime = 0;
            const unsubscribe = ensureUnsubscribe(
                state.subscribe(() => {
                    notifications += 1;
                    if (notifications === operations) {
                        endTime = performance.now();
                    }
                }),
            );
            const startTime = performance.now();
            let nextValue = state.get();
            for (let i = 0; i < operations; i++) {
                nextValue += 1;
                state.set(nextValue);
            }

            return finalizeMeasurement(
                unsubscribe,
                notifications,
                operations,
                startTime,
                endTime,
            );
        },
    ),
);

// Array
results.push(
    runBenchmark(
        "StatemanJS",
        "array",
        () => {},
        () => {
            const operations = OPERATIONS_PER_SAMPLE;
            const state = createState(createArray());
            let notifications = 0;
            let endTime = 0;
            const unsubscribe = ensureUnsubscribe(
                state.subscribe(() => {
                    notifications += 1;
                    if (notifications === operations) {
                        endTime = performance.now();
                    }
                }),
            );
            const targetIndex = ITEMS_COUNT_MEDIAN;
            const startTime = performance.now();
            for (let i = 0; i < operations; i++) {
                state.update((draft) => {
                    draft[targetIndex] = i;
                });
            }

            return finalizeMeasurement(
                unsubscribe,
                notifications,
                operations,
                startTime,
                endTime,
            );
        },
    ),
);

// Object
results.push(
    runBenchmark(
        "StatemanJS",
        "object",
        () => {},
        () => {
            const operations = OPERATIONS_PER_SAMPLE;
            const state = createState(createObject());
            let notifications = 0;
            let endTime = 0;
            const unsubscribe = ensureUnsubscribe(
                state.subscribe(() => {
                    notifications += 1;
                    if (notifications === operations) {
                        endTime = performance.now();
                    }
                }),
            );
            const targetKey = ITEMS_COUNT_MEDIAN.toString();
            const startTime = performance.now();
            for (let i = 0; i < operations; i++) {
                state.update((draft: any) => {
                    draft[targetKey] = i;
                });
            }

            return finalizeMeasurement(
                unsubscribe,
                notifications,
                operations,
                startTime,
                endTime,
            );
        },
    ),
);

// ============================================================
// REDUX
// ============================================================

console.log("Benchmarking Redux...");

// Counter
results.push(
    runBenchmark(
        "Redux",
        "counter",
        () => {},
        () => {
            const operations = OPERATIONS_PER_SAMPLE;
            const reducer = (
                state = createCounter(),
                action: { type: string },
            ) => {
                if (action.type === "INCREMENT") {
                    return state + 1;
                }
                return state;
            };
            const store = createStore(reducer);
            let notifications = 0;
            let endTime = 0;
            const unsubscribe = ensureUnsubscribe(
                store.subscribe(() => {
                    notifications += 1;
                    if (notifications === operations) {
                        endTime = performance.now();
                    }
                }),
            );
            const startTime = performance.now();
            for (let i = 0; i < operations; i++) {
                store.dispatch({ type: "INCREMENT" });
            }

            return finalizeMeasurement(
                unsubscribe,
                notifications,
                operations,
                startTime,
                endTime,
            );
        },
    ),
);

// Array
results.push(
    runBenchmark(
        "Redux",
        "array",
        () => {},
        () => {
            const operations = OPERATIONS_PER_SAMPLE;
            const reducer = (
                state = createArray(),
                action: { type: string; payload?: number },
            ) => {
                if (action.type === "UPDATE") {
                    const newState = [...state];
                    newState[ITEMS_COUNT_MEDIAN] = action.payload ?? 0;
                    return newState;
                }
                return state;
            };
            const store = createStore(reducer);
            let notifications = 0;
            let endTime = 0;
            const unsubscribe = ensureUnsubscribe(
                store.subscribe(() => {
                    notifications += 1;
                    if (notifications === operations) {
                        endTime = performance.now();
                    }
                }),
            );
            const startTime = performance.now();
            for (let i = 0; i < operations; i++) {
                store.dispatch({ type: "UPDATE", payload: i });
            }

            return finalizeMeasurement(
                unsubscribe,
                notifications,
                operations,
                startTime,
                endTime,
            );
        },
    ),
);

// Object
results.push(
    runBenchmark(
        "Redux",
        "object",
        () => {},
        () => {
            const operations = OPERATIONS_PER_SAMPLE;
            const key = ITEMS_COUNT_MEDIAN.toString();
            const reducer = (
                state = createObject(),
                action: { type: string; payload?: number },
            ) => {
                if (action.type === "UPDATE") {
                    return { ...state, [key]: action.payload ?? 0 };
                }
                return state;
            };
            const store = createStore(reducer);
            let notifications = 0;
            let endTime = 0;
            const unsubscribe = ensureUnsubscribe(
                store.subscribe(() => {
                    notifications += 1;
                    if (notifications === operations) {
                        endTime = performance.now();
                    }
                }),
            );
            const startTime = performance.now();
            for (let i = 0; i < operations; i++) {
                store.dispatch({ type: "UPDATE", payload: i });
            }

            return finalizeMeasurement(
                unsubscribe,
                notifications,
                operations,
                startTime,
                endTime,
            );
        },
    ),
);

// ============================================================
// REDUX TOOLKIT
// ============================================================

// console.log("Benchmarking Redux Toolkit...");

// // Counter
// results.push(
//     runBenchmark(
//         "Redux Toolkit",
//         "counter",
//         () => {},
//         () => {
//             const operations = OPERATIONS_PER_SAMPLE;
//             const slice = createSlice({
//                 name: "counter",
//                 initialState: createCounter(),
//                 reducers: {
//                     increment: (state) => state + 1,
//                 },
//             });
//             const store = configureStore({
//                 reducer: slice.reducer,
//                 devTools: false,
//                 middleware: (getDefaultMiddleware) =>
//                     getDefaultMiddleware({
//                         thunk: false,
//                         immutableCheck: false,
//                         serializableCheck: false,
//                     }),
//             });
//             let notifications = 0;
//             let endTime = 0;
//             const unsubscribe = ensureUnsubscribe(
//                 store.subscribe(() => {
//                     notifications += 1;
//                     if (notifications === operations) {
//                         endTime = performance.now();
//                     }
//                 }),
//             );
//             const startTime = performance.now();
//             for (let i = 0; i < operations; i++) {
//                 store.dispatch(slice.actions.increment());
//             }

//             return finalizeMeasurement(
//                 unsubscribe,
//                 notifications,
//                 operations,
//                 startTime,
//                 endTime,
//             );
//         },
//     ),
// );

// // Array
// results.push(
//     runBenchmark(
//         "Redux Toolkit",
//         "array",
//         () => {},
//         () => {
//             const operations = OPERATIONS_PER_SAMPLE;
//             const slice = createSlice({
//                 name: "array",
//                 initialState: createArray(),
//                 reducers: {
//                     update: (state, action: { payload: number }) => {
//                         state[ITEMS_COUNT_MEDIAN] = action.payload;
//                     },
//                 },
//             });
//             const store = configureStore({
//                 reducer: slice.reducer,
//                 devTools: false,
//                 middleware: (getDefaultMiddleware) =>
//                     getDefaultMiddleware({
//                         thunk: false,
//                         immutableCheck: false,
//                         serializableCheck: false,
//                     }),
//             });
//             let notifications = 0;
//             let endTime = 0;
//             const unsubscribe = ensureUnsubscribe(
//                 store.subscribe(() => {
//                     notifications += 1;
//                     if (notifications === operations) {
//                         endTime = performance.now();
//                     }
//                 }),
//             );
//             const startTime = performance.now();
//             for (let i = 0; i < operations; i++) {
//                 store.dispatch(slice.actions.update(i));
//             }

//             return finalizeMeasurement(
//                 unsubscribe,
//                 notifications,
//                 operations,
//                 startTime,
//                 endTime,
//             );
//         },
//     ),
// );

// // Object
// results.push(
//     runBenchmark(
//         "Redux Toolkit",
//         "object",
//         () => {},
//         () => {
//             const operations = OPERATIONS_PER_SAMPLE;
//             const key = ITEMS_COUNT_MEDIAN.toString();
//             const slice = createSlice({
//                 name: "object",
//                 initialState: createObject(),
//                 reducers: {
//                     update: (state, action: { payload: number }) => {
//                         state[key] = action.payload;
//                     },
//                 },
//             });
//             const store = configureStore({
//                 reducer: slice.reducer,
//                 devTools: false,
//                 middleware: (getDefaultMiddleware) =>
//                     getDefaultMiddleware({
//                         thunk: false,
//                         immutableCheck: false,
//                         serializableCheck: false,
//                     }),
//             });
//             const update = slice.actions.update;
//             let notifications = 0;
//             let endTime = 0;
//             const unsubscribe = ensureUnsubscribe(
//                 store.subscribe(() => {
//                     notifications += 1;
//                     if (notifications === operations) {
//                         endTime = performance.now();
//                     }
//                 }),
//             );
//             const startTime = performance.now();
//             for (let i = 0; i < operations; i++) {
//                 store.dispatch(update(i));
//             }

//             return finalizeMeasurement(
//                 unsubscribe,
//                 notifications,
//                 operations,
//                 startTime,
//                 endTime,
//             );
//         },
//     ),
// );

// ============================================================
// MOBX
// ============================================================

console.log("Benchmarking MobX...");

// Counter
results.push(
    runBenchmark(
        "MobX",
        "counter",
        () => {},
        () => {
            const operations = OPERATIONS_PER_SAMPLE;
            const state = observable({ counter: createCounter() });
            let notifications = 0;
            let endTime = 0;
            const dispose = ensureUnsubscribe(
                reaction(
                    () => state.counter,
                    () => {
                        notifications += 1;
                        if (notifications === operations) {
                            endTime = performance.now();
                        }
                    },
                ),
            );
            const startTime = performance.now();
            for (let i = 0; i < operations; i++) {
                state.counter++;
            }

            return finalizeMeasurement(
                dispose,
                notifications,
                operations,
                startTime,
                endTime,
            );
        },
    ),
);

// Array
results.push(
    runBenchmark(
        "MobX",
        "array",
        () => {},
        () => {
            const operations = OPERATIONS_PER_SAMPLE;
            const state = observable({ array: createArray() });
            let notifications = 0;
            let endTime = 0;
            const targetIndex = ITEMS_COUNT_MEDIAN;
            const dispose = ensureUnsubscribe(
                reaction(
                    () => state.array[targetIndex],
                    () => {
                        notifications += 1;
                        if (notifications === operations) {
                            endTime = performance.now();
                        }
                    },
                ),
            );
            const startTime = performance.now();
            for (let i = 0; i < operations; i++) {
                state.array[targetIndex] = i;
            }

            return finalizeMeasurement(
                dispose,
                notifications,
                operations,
                startTime,
                endTime,
            );
        },
    ),
);

// Object
results.push(
    runBenchmark(
        "MobX",
        "object",
        () => {},
        () => {
            const operations = OPERATIONS_PER_SAMPLE;
            const key = ITEMS_COUNT_MEDIAN.toString();
            const state = observable({ object: createObject() });
            let notifications = 0;
            let endTime = 0;
            const dispose = ensureUnsubscribe(
                reaction(
                    () => state.object[key],
                    () => {
                        notifications += 1;
                        if (notifications === operations) {
                            endTime = performance.now();
                        }
                    },
                ),
            );
            const startTime = performance.now();
            for (let i = 0; i < operations; i++) {
                state.object[key] = i;
            }

            return finalizeMeasurement(
                dispose,
                notifications,
                operations,
                startTime,
                endTime,
            );
        },
    ),
);

// ============================================================
// EFFECTOR
// ============================================================

console.log("Benchmarking Effector...");

// Counter
results.push(
    runBenchmark(
        "Effector",
        "counter",
        () => {},
        () => {
            const operations = OPERATIONS_PER_SAMPLE;
            const store = createEffectorStore(createCounter());
            const event = createEvent<number>();
            store.on(event, (state, payload) => state + payload);
            let notifications = 0;
            let endTime = 0;
            const unsubscribe = ensureUnsubscribe(
                store.watch(() => {
                    notifications += 1;
                    if (notifications === operations) {
                        endTime = performance.now();
                    }
                }),
            );
            const startTime = performance.now();
            for (let i = 0; i < operations; i++) {
                event(1);
            }

            return finalizeMeasurement(
                unsubscribe,
                notifications,
                operations,
                startTime,
                endTime,
            );
        },
    ),
);

// Array
results.push(
    runBenchmark(
        "Effector",
        "array",
        () => {},
        () => {
            const operations = OPERATIONS_PER_SAMPLE;
            const store = createEffectorStore(createArray());
            const event = createEvent<number>();
            store.on(event, (state, payload) => {
                const next = [...state];
                next[ITEMS_COUNT_MEDIAN] = payload;
                return next;
            });
            let notifications = 0;
            let endTime = 0;
            const unsubscribe = ensureUnsubscribe(
                store.watch(() => {
                    notifications += 1;
                    if (notifications === operations) {
                        endTime = performance.now();
                    }
                }),
            );
            const startTime = performance.now();
            for (let i = 0; i < operations; i++) {
                event(i);
            }

            return finalizeMeasurement(
                unsubscribe,
                notifications,
                operations,
                startTime,
                endTime,
            );
        },
    ),
);

// Object
results.push(
    runBenchmark(
        "Effector",
        "object",
        () => {},
        () => {
            const operations = OPERATIONS_PER_SAMPLE;
            const key = ITEMS_COUNT_MEDIAN.toString();
            const store = createEffectorStore(createObject());
            const event = createEvent<number>();
            store.on(event, (state, payload) => {
                return { ...state, [key]: payload };
            });
            let notifications = 0;
            let endTime = 0;
            const unsubscribe = ensureUnsubscribe(
                store.watch(() => {
                    notifications += 1;
                    if (notifications === operations) {
                        endTime = performance.now();
                    }
                }),
            );
            const startTime = performance.now();
            for (let i = 0; i < operations; i++) {
                event(i);
            }

            return finalizeMeasurement(
                unsubscribe,
                notifications,
                operations,
                startTime,
                endTime,
            );
        },
    ),
);

// ============================================================
// RESULTS
// ============================================================

console.log("\n" + "=".repeat(100));
console.log("BENCHMARK RESULTS");
console.log("=".repeat(100));

const libraryGroups = new Map<string, BenchmarkResult[]>();
for (const result of results) {
    if (!libraryGroups.has(result.library)) {
        libraryGroups.set(result.library, []);
    }
    libraryGroups.get(result.library)!.push(result);
}

console.log(
    "\n| Library         | Operation | Avg (ms)   | Min (ms)   | Max (ms)   | Ops/s      |",
);
console.log(
    "|-----------------|-----------|------------|------------|------------|------------|",
);

for (const [library, libResults] of libraryGroups) {
    for (const result of libResults) {
        console.log(
            `| ${library.padEnd(15)} | ${result.operation.padEnd(9)} | ${result.avgTime.toFixed(6).padStart(10)} | ${result.minTime.toFixed(6).padStart(10)} | ${result.maxTime.toFixed(6).padStart(10)} | ${Math.round(result.opsPerSecond).toString().padStart(10)} |`,
        );
    }
}

console.log("\n" + "=".repeat(100));
console.log("LEADERBOARD: FASTEST BY AVG TIME (ms) - Lower is better");
console.log("=".repeat(100));

const operations = ["counter", "array", "object"];
for (const op of operations) {
    const opResults = results.filter((r) => r.operation === op);
    opResults.sort((a, b) => a.avgTime - b.avgTime);

    console.log(`\n${op.toUpperCase()}:`);
    opResults.forEach((r, index) => {
        const medal =
            index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "  ";
        console.log(
            `  ${medal} ${(index + 1).toString().padStart(1)}. ${r.library.padEnd(15)} - ${r.avgTime.toFixed(6)} ms`,
        );
    });
}

console.log("\n" + "=".repeat(100));
console.log("LEADERBOARD: FASTEST BY OPS/S - Higher is better");
console.log("=".repeat(100));

for (const op of operations) {
    const opResults = results.filter((r) => r.operation === op);
    opResults.sort((a, b) => b.opsPerSecond - a.opsPerSecond);

    console.log(`\n${op.toUpperCase()}:`);
    opResults.forEach((r, index) => {
        const medal =
            index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "  ";
        console.log(
            `  ${medal} ${(index + 1).toString().padStart(1)}. ${r.library.padEnd(15)} - ${Math.round(r.opsPerSecond).toLocaleString().padStart(10)} ops/s`,
        );
    });
}

const summaryData: Array<{
    library: string;
    totalAvg: number;
    totalOps: number;
}> = [];
for (const [library, libResults] of libraryGroups) {
    const totalAvg = libResults.reduce((sum, r) => sum + r.avgTime, 0);
    const totalOps = libResults.reduce((sum, r) => sum + r.opsPerSecond, 0);
    summaryData.push({ library, totalAvg, totalOps });
}

const timestamp = new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\..+/, "");
const jsonFilename = `benchmark-results-${timestamp}.json`;

const jsonData = {
    timestamp: new Date().toISOString(),
    config: {
        itemsCount: ITEMS_COUNT,
        warmupIterations: WARMUP_ITERATIONS,
        benchmarkIterations: BENCHMARK_ITERATIONS,
        operationsPerSample: OPERATIONS_PER_SAMPLE,
    },
    results: results,
    summary: summaryData,
};

writeFileSync(jsonFilename, JSON.stringify(jsonData, null, 2));
console.log(`\nResults saved to: ${jsonFilename}`);
console.log("=".repeat(100) + "\n");
