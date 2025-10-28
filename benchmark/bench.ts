import { createState } from "../src/statemanjs/index";
import { createStore, createEvent } from "effector";
import { makeAutoObservable, autorun, configure, action, computed } from "mobx";
import {
    configureStore,
    createSlice,
    type PayloadAction,
} from "@reduxjs/toolkit";
import { performance } from "node:perf_hooks";

configure({
    enforceActions: "observed",
});

// ============================================================================
// Types & Constants
// ============================================================================

interface Todo {
    id: number;
    text: string;
    completed: boolean;
    createdAt: number;
}

interface TodoState {
    todos: Todo[];
    filter: "all" | "active" | "completed";
    nextId: number;
}

// Test configuration
const WARMUP_ITERATIONS = 100;
const BENCHMARK_ITERATIONS = 1000;
const TODOS_TO_ADD = 100;

// Expected state constants for validation
const EXPECTED_AFTER_FIRST_TODO: TodoState = {
    todos: [{ id: 1, text: "First todo", completed: false, createdAt: 0 }],
    filter: "all",
    nextId: 2,
};

const EXPECTED_AFTER_COMPLETE_FIRST: TodoState = {
    todos: [{ id: 1, text: "First todo", completed: true, createdAt: 0 }],
    filter: "all",
    nextId: 2,
};

// ============================================================================
// Benchmark Infrastructure
// ============================================================================

interface BenchmarkResult {
    name: string;
    operation: string;
    avgTimeMs: number;
    minTimeMs: number;
    maxTimeMs: number;
    opsPerSecond: number;
    subscriberCallCount: number;
    avgSubscriberLatencyMs: number;
    stateValidationPassed: boolean;
}

interface SubscriberMetrics {
    callCount: number;
    totalLatency: number;
    operationStartTime: number;
}

const results: BenchmarkResult[] = [];

async function warmup(
    fn: () => Promise<SubscriberMetrics>,
    iterations: number,
): Promise<void> {
    for (let i = 0; i < iterations; i++) {
        // await each warmup iteration to allow microtasks to flush
        await fn();
        // ensure microtasks have run
        await Promise.resolve();
    }
}

async function benchmark(
    name: string,
    operation: string,
    fn: () => Promise<SubscriberMetrics>,
    iterations: number,
): Promise<BenchmarkResult> {
    const times: number[] = [];
    let subscriberCallCount = 0;
    let totalSubscriberLatency = 0;
    let stateValidationPassed = true;

    // Warmup (awaitable to allow batch microtasks)
    await warmup(fn, WARMUP_ITERATIONS);

    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const metrics = await fn();
        const end = performance.now();

        times.push(end - start);
        subscriberCallCount += metrics.callCount;
        totalSubscriberLatency += metrics.totalLatency;
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const opsPerSecond = 1000 / avgTime;
    const avgSubscriberLatency =
        subscriberCallCount > 0
            ? totalSubscriberLatency / subscriberCallCount
            : 0;

    return {
        name,
        operation,
        avgTimeMs: avgTime,
        minTimeMs: minTime,
        maxTimeMs: maxTime,
        opsPerSecond,
        subscriberCallCount,
        avgSubscriberLatencyMs: avgSubscriberLatency,
        stateValidationPassed,
    };
}

// ============================================================================
// State Validation Helpers
// ============================================================================

function validateState(
    actual: TodoState,
    expected: TodoState,
    message: string,
): boolean {
    const isValid =
        actual.nextId === expected.nextId &&
        actual.filter === expected.filter &&
        actual.todos.length === expected.todos.length &&
        actual.todos.every((todo, i) => {
            const expectedTodo = expected.todos[i];
            return (
                todo.id === expectedTodo.id &&
                todo.text === expectedTodo.text &&
                todo.completed === expectedTodo.completed
            );
        });

    if (!isValid) {
        console.error(`❌ State validation failed: ${message}`);
        console.error("Expected:", JSON.stringify(expected, null, 2));
        console.error("Actual:", JSON.stringify(actual, null, 2));
    }

    return isValid;
}

// ============================================================================
// MobX Store Class
// ============================================================================

class TodoItem {
    id: number;
    text: string;
    completed: boolean;
    createdAt: number;

    constructor(
        id: number,
        text: string,
        completed: boolean,
        createdAt: number,
    ) {
        this.id = id;
        this.text = text;
        this.completed = completed;
        this.createdAt = createdAt;
        makeAutoObservable(this);
    }
}

class TodoStore {
    todos: TodoItem[] = [];
    filter: "all" | "active" | "completed" = "all";
    nextId: number = 1;

    constructor(initialState: TodoState) {
        this.todos = initialState.todos.map(
            (t) => new TodoItem(t.id, t.text, t.completed, t.createdAt),
        );
        this.filter = initialState.filter;
        this.nextId = initialState.nextId;
        makeAutoObservable(
            this,
            {
                addTodo: action,
                completeTodo: action,
                toggleTodo: action,
                deleteTodo: action,
                changeFilter: action,
                batchOperations: action,
                updateDeepState: action,
                filteredTodos: computed,
            },
            { autoBind: true },
        );
    }

    get filteredTodos(): TodoItem[] {
        switch (this.filter) {
            case "active":
                return this.todos.filter((t) => !t.completed);
            case "completed":
                return this.todos.filter((t) => t.completed);
            default:
                return this.todos;
        }
    }

    addTodo(text: string, createdAt: number): void {
        this.todos.push(new TodoItem(this.nextId, text, false, createdAt));
        this.nextId++;
    }

    completeTodo(id: number): void {
        const todo = this.todos.find((t) => t.id === id);
        if (todo) {
            todo.completed = true;
        }
    }

    toggleTodo(id: number): void {
        const todo = this.todos.find((t) => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
        }
    }

    deleteTodo(id: number): void {
        const index = this.todos.findIndex((t) => t.id === id);
        if (index !== -1) {
            this.todos.splice(index, 1);
        }
    }

    changeFilter(filter: "all" | "active" | "completed"): void {
        this.filter = filter;
    }

    batchOperations(): void {
        const now = Date.now();
        this.addTodo("Batch todo", now);
        const lastId = this.nextId - 1;
        this.completeTodo(lastId);
        this.deleteTodo(lastId);
        this.changeFilter("completed");
    }

    updateDeepState(id: number, text: string): void {
        const todo = this.todos.find((t) => t.id === id);
        if (todo) {
            todo.text = text;
            todo.completed = true;
        }
    }

    getState(): TodoState {
        return {
            todos: this.todos.map((todo) => ({
                id: todo.id,
                text: todo.text,
                completed: todo.completed,
                createdAt: todo.createdAt,
            })),
            filter: this.filter,
            nextId: this.nextId,
        };
    }
}

function createMobxSubscriber(
    store: TodoStore,
    metrics: SubscriberMetrics,
): () => void {
    let isInitialRun = true;
    return autorun(() => {
        store.filteredTodos.length;

        store.filteredTodos.forEach((todo) => {
            todo.text;
            todo.completed;
        });

        if (isInitialRun) {
            isInitialRun = false;
            return;
        }

        const latency = performance.now() - metrics.operationStartTime;
        metrics.totalLatency += latency;
        metrics.callCount++;
    });
}

// ============================================================================
// Redux Toolkit Store
// ============================================================================

function createReduxStore(initialState: TodoState) {
    const todoSlice = createSlice({
        name: "todos",
        initialState,
        reducers: {
            addTodo: (
                state,
                action: PayloadAction<{ text: string; createdAt: number }>,
            ) => {
                state.todos.push({
                    id: state.nextId,
                    text: action.payload.text,
                    completed: false,
                    createdAt: action.payload.createdAt,
                });
                state.nextId++;
            },
            completeTodo: (state, action: PayloadAction<number>) => {
                const todo = state.todos.find((t) => t.id === action.payload);
                if (todo) {
                    todo.completed = true;
                }
            },
            toggleTodo: (state, action: PayloadAction<number>) => {
                const todo = state.todos.find((t) => t.id === action.payload);
                if (todo) {
                    todo.completed = !todo.completed;
                }
            },
            deleteTodo: (state, action: PayloadAction<number>) => {
                const index = state.todos.findIndex(
                    (t) => t.id === action.payload,
                );
                if (index !== -1) {
                    state.todos.splice(index, 1);
                }
            },
            changeFilter: (
                state,
                action: PayloadAction<"all" | "active" | "completed">,
            ) => {
                state.filter = action.payload;
            },
            batchOperations: (state) => {
                const now = Date.now();
                state.todos.push({
                    id: state.nextId,
                    text: "Batch todo",
                    completed: false,
                    createdAt: now,
                });
                const lastId = state.nextId;
                state.nextId++;

                const todo = state.todos.find((t) => t.id === lastId);
                if (todo) {
                    todo.completed = true;
                }

                const index = state.todos.findIndex((t) => t.id === lastId);
                if (index !== -1) {
                    state.todos.splice(index, 1);
                }

                state.filter = "completed";
            },
            updateDeepState: (
                state,
                action: PayloadAction<{ id: number; text: string }>,
            ) => {
                const todo = state.todos.find(
                    (t) => t.id === action.payload.id,
                );
                if (todo) {
                    todo.text = action.payload.text;
                    todo.completed = true;
                }
            },
        },
    });

    return {
        store: configureStore({
            reducer: todoSlice.reducer,
        }),
        actions: todoSlice.actions,
    };
}

// ============================================================================
// Benchmark: Add Single Todo
// ============================================================================

async function benchmarkAddTodo(): Promise<void> {
    const result = await benchmark(
        "Statemanjs",
        "Add Single Todo",
        async () => {
            const state = createState<TodoState>(
                {
                    todos: [],
                    filter: "all",
                    nextId: 1,
                },
                { batch: true },
            );
            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            // Subscribe to track timing
            state.subscribe((newState) => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            // Perform operation
            metrics.operationStartTime = performance.now();
            const now = Date.now();
            state.update((draft) => {
                draft.todos.push({
                    id: draft.nextId,
                    text: "First todo",
                    completed: false,
                    createdAt: now,
                });
                draft.nextId++;
            });

            // Wait microtask so batched subscribers run
            await Promise.resolve();

            // Validate state (ignoring createdAt timestamp)
            const currentState = state.get();
            const expected = { ...EXPECTED_AFTER_FIRST_TODO };
            expected.todos[0].createdAt = now;
            validateState(currentState, expected, "After adding first todo");

            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkAddTodoEffector(): Promise<void> {
    const result = await benchmark(
        "Effector",
        "Add Single Todo",
        async () => {
            const $store = createStore<TodoState>({
                todos: [],
                filter: "all",
                nextId: 1,
            });
            const addTodo = createEvent<{ text: string; createdAt: number }>();

            $store.on(addTodo, (state, payload) => ({
                ...state,
                todos: [
                    ...state.todos,
                    {
                        id: state.nextId,
                        text: payload.text,
                        completed: false,
                        createdAt: payload.createdAt,
                    },
                ],
                nextId: state.nextId + 1,
            }));

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            $store.updates.watch((newState) => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            metrics.operationStartTime = performance.now();
            const now = Date.now();
            addTodo({ text: "First todo", createdAt: now });

            await Promise.resolve();

            const currentState = $store.getState();
            const expected = { ...EXPECTED_AFTER_FIRST_TODO };
            expected.todos[0].createdAt = now;
            validateState(currentState, expected, "After adding first todo");

            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkAddTodoMobX(): Promise<void> {
    const result = await benchmark(
        "MobX",
        "Add Single Todo",
        async () => {
            const store = new TodoStore({
                todos: [],
                filter: "all",
                nextId: 1,
            });

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            const dispose = createMobxSubscriber(store, metrics);

            metrics.operationStartTime = performance.now();
            const now = Date.now();
            store.addTodo("First todo", now);

            await Promise.resolve();

            const currentState = store.getState();
            const expected = { ...EXPECTED_AFTER_FIRST_TODO };
            expected.todos[0].createdAt = now;
            validateState(currentState, expected, "After adding first todo");

            dispose();
            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkAddTodoRedux(): Promise<void> {
    const result = await benchmark(
        "Redux",
        "Add Single Todo",
        async () => {
            const { store, actions } = createReduxStore({
                todos: [],
                filter: "all",
                nextId: 1,
            });

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            const unsubscribe = store.subscribe(() => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            metrics.operationStartTime = performance.now();
            const now = Date.now();
            store.dispatch(
                actions.addTodo({ text: "First todo", createdAt: now }),
            );

            await Promise.resolve();

            const currentState = store.getState();
            const expected = { ...EXPECTED_AFTER_FIRST_TODO };
            expected.todos[0].createdAt = now;
            validateState(currentState, expected, "After adding first todo");

            unsubscribe();
            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

// ============================================================================
// Benchmark: Add Multiple Todos
// ============================================================================

async function benchmarkAddMultipleTodos(): Promise<void> {
    const result = await benchmark(
        "Statemanjs",
        `Add ${TODOS_TO_ADD} Todos`,
        async () => {
            const state = createState<TodoState>(
                {
                    todos: [],
                    filter: "all",
                    nextId: 1,
                },
                { batch: true },
            );
            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            state.subscribe((newState) => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            metrics.operationStartTime = performance.now();
            for (let i = 0; i < TODOS_TO_ADD; i++) {
                state.update((draft) => {
                    draft.todos.push({
                        id: draft.nextId,
                        text: `Todo ${i}`,
                        completed: false,
                        createdAt: Date.now(),
                    });
                    draft.nextId++;
                });
            }

            // Wait microtask to allow batched notifications
            await Promise.resolve();

            // Validate final state
            const currentState = state.get();
            const isValid =
                currentState.todos.length === TODOS_TO_ADD &&
                currentState.nextId === TODOS_TO_ADD + 1 &&
                currentState.todos.every((todo, i) => todo.id === i + 1);

            if (!isValid) {
                console.error("❌ State validation failed: Add multiple todos");
            }

            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkAddMultipleTodosEffector(): Promise<void> {
    const result = await benchmark(
        "Effector",
        `Add ${TODOS_TO_ADD} Todos`,
        async () => {
            const $store = createStore<TodoState>({
                todos: [],
                filter: "all",
                nextId: 1,
            });
            const addTodo = createEvent<{ text: string; createdAt: number }>();

            $store.on(addTodo, (state, payload) => ({
                ...state,
                todos: [
                    ...state.todos,
                    {
                        id: state.nextId,
                        text: payload.text,
                        completed: false,
                        createdAt: payload.createdAt,
                    },
                ],
                nextId: state.nextId + 1,
            }));

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            $store.updates.watch((newState) => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            metrics.operationStartTime = performance.now();
            for (let i = 0; i < TODOS_TO_ADD; i++) {
                addTodo({ text: `Todo ${i}`, createdAt: Date.now() });
            }

            await Promise.resolve();

            const currentState = $store.getState();
            const isValid =
                currentState.todos.length === TODOS_TO_ADD &&
                currentState.nextId === TODOS_TO_ADD + 1 &&
                currentState.todos.every((todo, i) => todo.id === i + 1);

            if (!isValid) {
                console.error(
                    "❌ State validation failed: Add multiple todos (Effector)",
                );
            }

            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkAddMultipleTodosMobX(): Promise<void> {
    const result = await benchmark(
        "MobX",
        `Add ${TODOS_TO_ADD} Todos`,
        async () => {
            const store = new TodoStore({
                todos: [],
                filter: "all",
                nextId: 1,
            });

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            const dispose = createMobxSubscriber(store, metrics);

            metrics.operationStartTime = performance.now();
            for (let i = 0; i < TODOS_TO_ADD; i++) {
                store.addTodo(`Todo ${i}`, Date.now());
            }

            await Promise.resolve();

            const currentState = store.getState();
            const isValid =
                currentState.todos.length === TODOS_TO_ADD &&
                currentState.nextId === TODOS_TO_ADD + 1 &&
                currentState.todos.every((todo, i) => todo.id === i + 1);

            if (!isValid) {
                console.error("❌ State validation failed: Add multiple todos");
            }

            dispose();
            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

// ============================================================================
// Benchmark: Complete Todo
// ============================================================================

async function benchmarkCompleteTodo(): Promise<void> {
    const result = await benchmark(
        "Statemanjs",
        "Complete Single Todo",
        async () => {
            // Setup: Create state with one todo
            const state = createState<TodoState>(
                {
                    todos: [
                        {
                            id: 1,
                            text: "First todo",
                            completed: false,
                            createdAt: 0,
                        },
                    ],
                    filter: "all",
                    nextId: 2,
                },
                { batch: true },
            );

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            // Subscribe BEFORE performing operation
            metrics.operationStartTime = performance.now();
            state.subscribe((newState) => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            // Perform operation
            state.update((draft) => {
                const index = draft.todos.findIndex((t) => t.id === 1);
                if (index !== -1) {
                    draft.todos[index].completed = true;
                }
            });

            await Promise.resolve();

            // Validate state
            const currentState = state.get();
            validateState(
                currentState,
                EXPECTED_AFTER_COMPLETE_FIRST,
                "After completing first todo",
            );

            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkCompleteTodoEffector(): Promise<void> {
    const result = await benchmark(
        "Effector",
        "Complete Single Todo",
        async () => {
            const $store = createStore<TodoState>({
                todos: [
                    {
                        id: 1,
                        text: "First todo",
                        completed: false,
                        createdAt: 0,
                    },
                ],
                filter: "all",
                nextId: 2,
            });
            const completeTodo = createEvent<number>();

            $store.on(completeTodo, (state, todoId) => ({
                ...state,
                todos: state.todos.map((todo) =>
                    todo.id === todoId ? { ...todo, completed: true } : todo,
                ),
            }));

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            metrics.operationStartTime = performance.now();
            $store.updates.watch((newState) => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            completeTodo(1);
            await Promise.resolve();

            const currentState = $store.getState();
            validateState(
                currentState,
                EXPECTED_AFTER_COMPLETE_FIRST,
                "After completing first todo (Effector)",
            );

            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkCompleteTodoMobX(): Promise<void> {
    const result = await benchmark(
        "MobX",
        "Complete Single Todo",
        async () => {
            const store = new TodoStore({
                todos: [
                    {
                        id: 1,
                        text: "First todo",
                        completed: false,
                        createdAt: 0,
                    },
                ],
                filter: "all",
                nextId: 2,
            });

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            const dispose = createMobxSubscriber(store, metrics);

            metrics.operationStartTime = performance.now();
            store.completeTodo(1);

            await Promise.resolve();

            const currentState = store.getState();
            validateState(
                currentState,
                EXPECTED_AFTER_COMPLETE_FIRST,
                "After completing first todo (MobX)",
            );

            dispose();
            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

// ============================================================================
// Benchmark: Toggle Todo
// ============================================================================

async function benchmarkToggleTodo(): Promise<void> {
    const result = await benchmark(
        "Statemanjs",
        "Toggle Single Todo",
        async () => {
            const state = createState<TodoState>(
                {
                    todos: [
                        {
                            id: 1,
                            text: "First todo",
                            completed: false,
                            createdAt: 0,
                        },
                    ],
                    filter: "all",
                    nextId: 2,
                },
                { batch: true },
            );

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            // Subscribe BEFORE performing operation
            metrics.operationStartTime = performance.now();
            state.subscribe((newState) => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            // Perform toggle
            state.update((draft) => {
                const index = draft.todos.findIndex((t) => t.id === 1);
                if (index !== -1) {
                    draft.todos[index].completed =
                        !draft.todos[index].completed;
                }
            });

            await Promise.resolve();

            // Validate state (should be completed now)
            const currentState = state.get();
            const isValid = currentState.todos[0].completed === true;

            if (!isValid) {
                console.error("❌ State validation failed: Toggle todo");
            }

            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkToggleTodoEffector(): Promise<void> {
    const result = await benchmark(
        "Effector",
        "Toggle Single Todo",
        async () => {
            const $store = createStore<TodoState>({
                todos: [
                    {
                        id: 1,
                        text: "First todo",
                        completed: false,
                        createdAt: 0,
                    },
                ],
                filter: "all",
                nextId: 2,
            });
            const toggleTodo = createEvent<number>();

            $store.on(toggleTodo, (state, todoId) => ({
                ...state,
                todos: state.todos.map((todo) =>
                    todo.id === todoId
                        ? { ...todo, completed: !todo.completed }
                        : todo,
                ),
            }));

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            metrics.operationStartTime = performance.now();
            $store.updates.watch((newState) => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            toggleTodo(1);
            await Promise.resolve();

            const currentState = $store.getState();
            const isValid = currentState.todos[0].completed === true;

            if (!isValid) {
                console.error(
                    "❌ State validation failed: Toggle todo (Effector)",
                );
            }

            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkToggleTodoMobX(): Promise<void> {
    const result = await benchmark(
        "MobX",
        "Toggle Single Todo",
        async () => {
            const store = new TodoStore({
                todos: [
                    {
                        id: 1,
                        text: "First todo",
                        completed: false,
                        createdAt: 0,
                    },
                ],
                filter: "all",
                nextId: 2,
            });

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            const dispose = createMobxSubscriber(store, metrics);

            metrics.operationStartTime = performance.now();
            store.toggleTodo(1);

            await Promise.resolve();

            const currentState = store.getState();
            const expected = {
                todos: [
                    {
                        id: 1,
                        text: "First todo",
                        completed: true,
                        createdAt: 0,
                    },
                ],
                filter: "all" as const,
                nextId: 2,
            };
            validateState(
                currentState,
                expected,
                "After toggling first todo (MobX)",
            );

            dispose();
            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

// ============================================================================
// Benchmark: Delete Todo
// ============================================================================

async function benchmarkDeleteTodo(): Promise<void> {
    const result = await benchmark(
        "Statemanjs",
        "Delete Single Todo",
        async () => {
            const state = createState<TodoState>(
                {
                    todos: [
                        {
                            id: 1,
                            text: "First todo",
                            completed: false,
                            createdAt: 0,
                        },
                        {
                            id: 2,
                            text: "Second todo",
                            completed: false,
                            createdAt: 0,
                        },
                    ],
                    filter: "all",
                    nextId: 3,
                },
                { batch: true },
            );

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            state.subscribe((newState) => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            metrics.operationStartTime = performance.now();
            state.update((draft) => {
                draft.todos = draft.todos.filter((t) => t.id !== 1);
            });

            await Promise.resolve();

            // Validate state
            const currentState = state.get();
            const isValid =
                currentState.todos.length === 1 &&
                currentState.todos[0].id === 2;

            if (!isValid) {
                console.error("❌ State validation failed: Delete todo");
            }

            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkDeleteTodoEffector(): Promise<void> {
    const result = await benchmark(
        "Effector",
        "Delete Single Todo",
        async () => {
            const $store = createStore<TodoState>({
                todos: [
                    {
                        id: 1,
                        text: "First todo",
                        completed: false,
                        createdAt: 0,
                    },
                    {
                        id: 2,
                        text: "Second todo",
                        completed: false,
                        createdAt: 0,
                    },
                ],
                filter: "all",
                nextId: 3,
            });
            const deleteTodo = createEvent<number>();

            $store.on(deleteTodo, (state, todoId) => ({
                ...state,
                todos: state.todos.filter((todo) => todo.id !== todoId),
            }));

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            $store.updates.watch((newState) => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            metrics.operationStartTime = performance.now();
            deleteTodo(1);
            await Promise.resolve();

            const currentState = $store.getState();
            const isValid =
                currentState.todos.length === 1 &&
                currentState.todos[0].id === 2;

            if (!isValid) {
                console.error(
                    "❌ State validation failed: Delete todo (Effector)",
                );
            }

            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkDeleteTodoMobX(): Promise<void> {
    const result = await benchmark(
        "MobX",
        "Delete Single Todo",
        async () => {
            const store = new TodoStore({
                todos: [
                    {
                        id: 1,
                        text: "First todo",
                        completed: false,
                        createdAt: 0,
                    },
                    {
                        id: 2,
                        text: "Second todo",
                        completed: false,
                        createdAt: 0,
                    },
                ],
                filter: "all",
                nextId: 3,
            });

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            const dispose = createMobxSubscriber(store, metrics);

            metrics.operationStartTime = performance.now();
            store.deleteTodo(1);

            await Promise.resolve();

            const currentState = store.getState();
            const expected = {
                todos: [
                    {
                        id: 2,
                        text: "Second todo",
                        completed: false,
                        createdAt: 0,
                    },
                ],
                filter: "all" as const,
                nextId: 3,
            };
            validateState(
                currentState,
                expected,
                "After deleting first todo (MobX)",
            );

            dispose();
            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

// ============================================================================
// Benchmark: Filter Todos
// ============================================================================

async function benchmarkFilterTodos(): Promise<void> {
    const result = await benchmark(
        "Statemanjs",
        "Change Filter",
        async () => {
            const state = createState<TodoState>(
                {
                    todos: [
                        {
                            id: 1,
                            text: "First todo",
                            completed: true,
                            createdAt: 0,
                        },
                        {
                            id: 2,
                            text: "Second todo",
                            completed: false,
                            createdAt: 0,
                        },
                    ],
                    filter: "all",
                    nextId: 3,
                },
                { batch: true },
            );

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            state.subscribe((newState) => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            metrics.operationStartTime = performance.now();
            state.update((draft) => {
                draft.filter = "completed";
            });

            await Promise.resolve();

            // Validate state
            const currentState = state.get();
            const isValid = currentState.filter === "completed";

            if (!isValid) {
                console.error("❌ State validation failed: Change filter");
            }

            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkFilterTodosEffector(): Promise<void> {
    const result = await benchmark(
        "Effector",
        "Change Filter",
        async () => {
            const $store = createStore<TodoState>({
                todos: [
                    {
                        id: 1,
                        text: "First todo",
                        completed: true,
                        createdAt: 0,
                    },
                    {
                        id: 2,
                        text: "Second todo",
                        completed: false,
                        createdAt: 0,
                    },
                ],
                filter: "all",
                nextId: 3,
            });
            const changeFilter = createEvent<"all" | "active" | "completed">();

            $store.on(changeFilter, (state, filter) => ({
                ...state,
                filter,
            }));

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            $store.updates.watch((newState) => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            metrics.operationStartTime = performance.now();
            changeFilter("completed");
            await Promise.resolve();

            const currentState = $store.getState();
            const isValid = currentState.filter === "completed";

            if (!isValid) {
                console.error(
                    "❌ State validation failed: Change filter (Effector)",
                );
            }

            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkFilterTodosMobX(): Promise<void> {
    const result = await benchmark(
        "MobX",
        "Change Filter",
        async () => {
            const store = new TodoStore({
                todos: [
                    {
                        id: 1,
                        text: "First todo",
                        completed: false,
                        createdAt: 0,
                    },
                ],
                filter: "all",
                nextId: 2,
            });

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            const dispose = createMobxSubscriber(store, metrics);

            metrics.operationStartTime = performance.now();
            store.changeFilter("completed");

            await Promise.resolve();

            const currentState = store.getState();
            const expected = {
                todos: [
                    {
                        id: 1,
                        text: "First todo",
                        completed: false,
                        createdAt: 0,
                    },
                ],
                filter: "completed" as const,
                nextId: 2,
            };
            validateState(
                currentState,
                expected,
                "After changing filter (MobX)",
            );

            dispose();
            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

// ============================================================================
// Benchmark: Batch Operations (Performance Only)
// Note: Batch mode uses microtasks, so subscriber metrics are not captured
// in synchronous benchmarks. This test only measures operation performance.
// ============================================================================

async function benchmarkBatchOperations(): Promise<void> {
    const result = await benchmark(
        "Statemanjs",
        "Batch: Add + Complete + Delete",
        async () => {
            const state = createState<TodoState>(
                {
                    todos: [],
                    filter: "all",
                    nextId: 1,
                },
                { batch: true },
            );

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            state.subscribe((newState) => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            // Add todo
            metrics.operationStartTime = performance.now();
            state.update((draft) => {
                draft.todos.push({
                    id: draft.nextId,
                    text: "Todo 1",
                    completed: false,
                    createdAt: Date.now(),
                });
                draft.nextId++;
            });

            // Add another
            state.update((draft) => {
                draft.todos.push({
                    id: draft.nextId,
                    text: "Todo 2",
                    completed: false,
                    createdAt: Date.now(),
                });
                draft.nextId++;
            });

            // Complete first
            state.update((draft) => {
                const index = draft.todos.findIndex((t) => t.id === 1);
                if (index !== -1) {
                    draft.todos[index].completed = true;
                }
            });

            // Delete second
            state.update((draft) => {
                draft.todos = draft.todos.filter((t) => t.id !== 2);
            });

            // Wait for microtask to allow batched subscriber to run once
            await Promise.resolve();

            // Validate final state
            const currentState = state.get();
            const isValid =
                currentState.todos.length === 1 &&
                currentState.todos[0].id === 1 &&
                currentState.todos[0].completed === true &&
                currentState.nextId === 3;

            if (!isValid) {
                console.error("❌ State validation failed: Batch operations");
                console.error(
                    "Current state:",
                    JSON.stringify(currentState, null, 2),
                );
            }

            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkBatchOperationsEffector(): Promise<void> {
    const result = await benchmark(
        "Effector",
        "Batch: Add + Complete + Delete",
        async () => {
            const $store = createStore<TodoState>({
                todos: [],
                filter: "all",
                nextId: 1,
            });
            const addTodo = createEvent<{ text: string; createdAt: number }>();
            const completeTodo = createEvent<number>();
            const deleteTodo = createEvent<number>();

            $store
                .on(addTodo, (state, payload) => ({
                    ...state,
                    todos: [
                        ...state.todos,
                        {
                            id: state.nextId,
                            text: payload.text,
                            completed: false,
                            createdAt: payload.createdAt,
                        },
                    ],
                    nextId: state.nextId + 1,
                }))
                .on(completeTodo, (state, todoId) => ({
                    ...state,
                    todos: state.todos.map((todo) =>
                        todo.id === todoId
                            ? { ...todo, completed: true }
                            : todo,
                    ),
                }))
                .on(deleteTodo, (state, todoId) => ({
                    ...state,
                    todos: state.todos.filter((todo) => todo.id !== todoId),
                }));

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            $store.updates.watch((newState) => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            metrics.operationStartTime = performance.now();
            addTodo({ text: "Todo 1", createdAt: Date.now() });
            addTodo({ text: "Todo 2", createdAt: Date.now() });
            completeTodo(1);
            deleteTodo(2);

            await Promise.resolve();

            const currentState = $store.getState();
            const isValid =
                currentState.todos.length === 1 &&
                currentState.todos[0].id === 1 &&
                currentState.todos[0].completed === true &&
                currentState.nextId === 3;

            if (!isValid) {
                console.error(
                    "❌ State validation failed: Batch operations (Effector)",
                );
                console.error(
                    "Current state:",
                    JSON.stringify(currentState, null, 2),
                );
            }

            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkBatchOperationsMobX(): Promise<void> {
    const result = await benchmark(
        "MobX",
        "Batch: Add + Complete + Delete",
        async () => {
            const store = new TodoStore({
                todos: [],
                filter: "all",
                nextId: 1,
            });

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            const dispose = createMobxSubscriber(store, metrics);

            metrics.operationStartTime = performance.now();
            store.batchOperations();

            await Promise.resolve();

            const currentState = store.getState();
            const expected = {
                todos: [] as Todo[],
                filter: "completed" as const,
                nextId: 2,
            };
            validateState(
                currentState,
                expected,
                "After batch operations (MobX)",
            );

            dispose();
            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

// ============================================================================
// Benchmark: Multiple Subscribers
// ============================================================================

async function benchmarkMultipleSubscribers(): Promise<void> {
    const SUBSCRIBER_COUNT = 10;

    const result = await benchmark(
        "Statemanjs",
        `Update with ${SUBSCRIBER_COUNT} Subscribers`,
        async () => {
            const state = createState<TodoState>(
                {
                    todos: [],
                    filter: "all",
                    nextId: 1,
                },
                { batch: true },
            );
            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            // Add multiple subscribers
            for (let i = 0; i < SUBSCRIBER_COUNT; i++) {
                state.subscribe((newState) => {
                    const latency =
                        performance.now() - metrics.operationStartTime;
                    metrics.totalLatency += latency;
                    metrics.callCount++;
                });
            }

            metrics.operationStartTime = performance.now();
            state.update((draft) => {
                draft.todos.push({
                    id: draft.nextId,
                    text: "New todo",
                    completed: false,
                    createdAt: Date.now(),
                });
                draft.nextId++;
            });

            // Wait for microtasks so batched subscribers are called
            await Promise.resolve();

            // Should have called all subscribers
            const isValid = metrics.callCount === SUBSCRIBER_COUNT;
            if (!isValid) {
                console.error(
                    `❌ Expected ${SUBSCRIBER_COUNT} subscriber calls, got ${metrics.callCount}`,
                );
            }

            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkMultipleSubscribersEffector(): Promise<void> {
    const SUBSCRIBER_COUNT = 10;

    const result = await benchmark(
        "Effector",
        `Update with ${SUBSCRIBER_COUNT} Subscribers`,
        async () => {
            const $store = createStore<TodoState>({
                todos: [],
                filter: "all",
                nextId: 1,
            });
            const addTodo = createEvent<{ text: string; createdAt: number }>();

            $store.on(addTodo, (state, payload) => ({
                ...state,
                todos: [
                    ...state.todos,
                    {
                        id: state.nextId,
                        text: payload.text,
                        completed: false,
                        createdAt: payload.createdAt,
                    },
                ],
                nextId: state.nextId + 1,
            }));

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            // Add multiple subscribers
            for (let i = 0; i < SUBSCRIBER_COUNT; i++) {
                $store.updates.watch((newState) => {
                    const latency =
                        performance.now() - metrics.operationStartTime;
                    metrics.totalLatency += latency;
                    metrics.callCount++;
                });
            }

            metrics.operationStartTime = performance.now();
            addTodo({ text: "New todo", createdAt: Date.now() });

            await Promise.resolve();

            // Should have called all subscribers once after initial calls
            const isValid = metrics.callCount === SUBSCRIBER_COUNT;
            if (!isValid) {
                console.error(
                    `❌ Expected ${SUBSCRIBER_COUNT} subscriber calls, got ${metrics.callCount} (Effector)`,
                );
            }

            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkMultipleSubscribersMobX(): Promise<void> {
    const SUBSCRIBER_COUNT = 10;

    const result = await benchmark(
        "MobX",
        `Update with ${SUBSCRIBER_COUNT} Subscribers`,
        async () => {
            const store = new TodoStore({
                todos: [
                    {
                        id: 1,
                        text: "First todo",
                        completed: false,
                        createdAt: 0,
                    },
                ],
                filter: "all",
                nextId: 2,
            });

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            const disposers: Array<() => void> = [];
            for (let i = 0; i < SUBSCRIBER_COUNT; i++) {
                disposers.push(createMobxSubscriber(store, metrics));
            }

            metrics.operationStartTime = performance.now();
            store.completeTodo(1);

            await Promise.resolve();

            const currentState = store.getState();
            validateState(
                currentState,
                EXPECTED_AFTER_COMPLETE_FIRST,
                `After completing with ${SUBSCRIBER_COUNT} subscribers (MobX)`,
            );

            disposers.forEach((d) => d());
            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

// ============================================================================
// Benchmark: Deep State Access
// ============================================================================

async function benchmarkDeepStateAccess(): Promise<void> {
    const result = await benchmark(
        "Statemanjs",
        "Deep State Modification",
        async () => {
            const state = createState<TodoState>(
                {
                    todos: Array.from({ length: 50 }, (_, i) => ({
                        id: i + 1,
                        text: `Todo ${i}`,
                        completed: i % 2 === 0,
                        createdAt: Date.now(),
                    })),
                    filter: "all",
                    nextId: 51,
                },
                { batch: true },
            );

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            // Subscribe BEFORE performing operation
            metrics.operationStartTime = performance.now();
            state.subscribe((newState) => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            // Find and modify a todo in the middle
            const targetId = 25;
            state.update((draft) => {
                const index = draft.todos.findIndex((t) => t.id === targetId);
                if (index !== -1) {
                    draft.todos[index].completed =
                        !draft.todos[index].completed;
                    draft.todos[index].text =
                        `Modified ${draft.todos[index].text}`;
                }
            });

            await Promise.resolve();

            // Validate
            const currentState = state.get();
            const modifiedTodo = currentState.todos.find(
                (t) => t.id === targetId,
            );
            const isValid = modifiedTodo?.text.includes("Modified");

            if (!isValid) {
                console.error("❌ State validation failed: Deep state access");
            }

            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkDeepStateAccessEffector(): Promise<void> {
    const result = await benchmark(
        "Effector",
        "Deep State Modification",
        async () => {
            const $store = createStore<TodoState>({
                todos: Array.from({ length: 50 }, (_, i) => ({
                    id: i + 1,
                    text: `Todo ${i}`,
                    completed: i % 2 === 0,
                    createdAt: Date.now(),
                })),
                filter: "all",
                nextId: 51,
            });
            const modifyTodo = createEvent<number>();

            $store.on(modifyTodo, (state, todoId) => ({
                ...state,
                todos: state.todos.map((todo) =>
                    todo.id === todoId
                        ? {
                              ...todo,
                              completed: !todo.completed,
                              text: `Modified ${todo.text}`,
                          }
                        : todo,
                ),
            }));

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            metrics.operationStartTime = performance.now();
            $store.updates.watch((newState) => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            const targetId = 25;
            modifyTodo(targetId);

            await Promise.resolve();

            const currentState = $store.getState();
            const modifiedTodo = currentState.todos.find(
                (t) => t.id === targetId,
            );
            const isValid = modifiedTodo?.text.includes("Modified");

            if (!isValid) {
                console.error(
                    "❌ State validation failed: Deep state access (Effector)",
                );
            }

            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkDeepStateAccessMobX(): Promise<void> {
    const result = await benchmark(
        "MobX",
        "Deep State Modification",
        async () => {
            const store = new TodoStore({
                todos: Array.from({ length: 50 }, (_, i) => ({
                    id: i + 1,
                    text: `Todo ${i + 1}`,
                    completed: false,
                    createdAt: Date.now(),
                })),
                filter: "all",
                nextId: 51,
            });

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            const dispose = createMobxSubscriber(store, metrics);

            metrics.operationStartTime = performance.now();
            const targetId = 25;
            store.updateDeepState(targetId, "Modified deep todo");

            await Promise.resolve();

            const currentState = store.getState();
            const modifiedTodo = currentState.todos.find(
                (t) => t.id === targetId,
            );
            const isValid = modifiedTodo?.text.includes("Modified");

            if (!isValid) {
                console.error(
                    "❌ State validation failed: Deep state access (MobX)",
                );
            }

            dispose();
            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

// ============================================================================
// Redux Benchmarks
// ============================================================================

async function benchmarkAddMultipleTodosRedux(): Promise<void> {
    const result = await benchmark(
        "Redux",
        `Add ${TODOS_TO_ADD} Todos`,
        async () => {
            const { store, actions } = createReduxStore({
                todos: [],
                filter: "all",
                nextId: 1,
            });

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            const unsubscribe = store.subscribe(() => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            metrics.operationStartTime = performance.now();
            for (let i = 0; i < TODOS_TO_ADD; i++) {
                store.dispatch(
                    actions.addTodo({
                        text: `Todo ${i}`,
                        createdAt: Date.now(),
                    }),
                );
            }

            await Promise.resolve();

            const currentState = store.getState();
            const isValid =
                currentState.todos.length === TODOS_TO_ADD &&
                currentState.nextId === TODOS_TO_ADD + 1 &&
                currentState.todos.every((todo, i) => todo.id === i + 1);

            if (!isValid) {
                console.error("❌ State validation failed: Add multiple todos");
            }

            unsubscribe();
            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkCompleteTodoRedux(): Promise<void> {
    const result = await benchmark(
        "Redux",
        "Complete Single Todo",
        async () => {
            const { store, actions } = createReduxStore({
                todos: [
                    {
                        id: 1,
                        text: "First todo",
                        completed: false,
                        createdAt: 0,
                    },
                ],
                filter: "all",
                nextId: 2,
            });

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            const unsubscribe = store.subscribe(() => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            metrics.operationStartTime = performance.now();
            store.dispatch(actions.completeTodo(1));

            await Promise.resolve();

            const currentState = store.getState();
            validateState(
                currentState,
                EXPECTED_AFTER_COMPLETE_FIRST,
                "After completing first todo (Redux)",
            );

            unsubscribe();
            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkToggleTodoRedux(): Promise<void> {
    const result = await benchmark(
        "Redux",
        "Toggle Single Todo",
        async () => {
            const { store, actions } = createReduxStore({
                todos: [
                    {
                        id: 1,
                        text: "First todo",
                        completed: false,
                        createdAt: 0,
                    },
                ],
                filter: "all",
                nextId: 2,
            });

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            const unsubscribe = store.subscribe(() => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            metrics.operationStartTime = performance.now();
            store.dispatch(actions.toggleTodo(1));

            await Promise.resolve();

            const currentState = store.getState();
            const expected = {
                todos: [
                    {
                        id: 1,
                        text: "First todo",
                        completed: true,
                        createdAt: 0,
                    },
                ],
                filter: "all" as const,
                nextId: 2,
            };
            validateState(
                currentState,
                expected,
                "After toggling first todo (Redux)",
            );

            unsubscribe();
            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkDeleteTodoRedux(): Promise<void> {
    const result = await benchmark(
        "Redux",
        "Delete Single Todo",
        async () => {
            const { store, actions } = createReduxStore({
                todos: [
                    {
                        id: 1,
                        text: "First todo",
                        completed: false,
                        createdAt: 0,
                    },
                    {
                        id: 2,
                        text: "Second todo",
                        completed: false,
                        createdAt: 0,
                    },
                ],
                filter: "all",
                nextId: 3,
            });

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            const unsubscribe = store.subscribe(() => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            metrics.operationStartTime = performance.now();
            store.dispatch(actions.deleteTodo(1));

            await Promise.resolve();

            const currentState = store.getState();
            const expected = {
                todos: [
                    {
                        id: 2,
                        text: "Second todo",
                        completed: false,
                        createdAt: 0,
                    },
                ],
                filter: "all" as const,
                nextId: 3,
            };
            validateState(
                currentState,
                expected,
                "After deleting first todo (Redux)",
            );

            unsubscribe();
            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkFilterTodosRedux(): Promise<void> {
    const result = await benchmark(
        "Redux",
        "Change Filter",
        async () => {
            const { store, actions } = createReduxStore({
                todos: [
                    {
                        id: 1,
                        text: "First todo",
                        completed: false,
                        createdAt: 0,
                    },
                ],
                filter: "all",
                nextId: 2,
            });

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            const unsubscribe = store.subscribe(() => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            metrics.operationStartTime = performance.now();
            store.dispatch(actions.changeFilter("completed"));

            await Promise.resolve();

            const currentState = store.getState();
            const expected = {
                todos: [
                    {
                        id: 1,
                        text: "First todo",
                        completed: false,
                        createdAt: 0,
                    },
                ],
                filter: "completed" as const,
                nextId: 2,
            };
            validateState(
                currentState,
                expected,
                "After changing filter (Redux)",
            );

            unsubscribe();
            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkBatchOperationsRedux(): Promise<void> {
    const result = await benchmark(
        "Redux",
        "Batch: Add + Complete + Delete",
        async () => {
            const { store, actions } = createReduxStore({
                todos: [],
                filter: "all",
                nextId: 1,
            });

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            const unsubscribe = store.subscribe(() => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            metrics.operationStartTime = performance.now();
            store.dispatch(actions.batchOperations());

            await Promise.resolve();

            const currentState = store.getState();
            const expected = {
                todos: [] as Todo[],
                filter: "completed" as const,
                nextId: 2,
            };
            validateState(
                currentState,
                expected,
                "After batch operations (Redux)",
            );

            unsubscribe();
            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkMultipleSubscribersRedux(): Promise<void> {
    const SUBSCRIBER_COUNT = 10;

    const result = await benchmark(
        "Redux",
        `Update with ${SUBSCRIBER_COUNT} Subscribers`,
        async () => {
            const { store, actions } = createReduxStore({
                todos: [
                    {
                        id: 1,
                        text: "First todo",
                        completed: false,
                        createdAt: 0,
                    },
                ],
                filter: "all",
                nextId: 2,
            });

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            const unsubscribers: Array<() => void> = [];
            for (let i = 0; i < SUBSCRIBER_COUNT; i++) {
                const unsubscribe = store.subscribe(() => {
                    const latency =
                        performance.now() - metrics.operationStartTime;
                    metrics.totalLatency += latency;
                    metrics.callCount++;
                });
                unsubscribers.push(unsubscribe);
            }

            metrics.operationStartTime = performance.now();
            store.dispatch(actions.completeTodo(1));

            await Promise.resolve();

            const currentState = store.getState();
            validateState(
                currentState,
                EXPECTED_AFTER_COMPLETE_FIRST,
                `After completing with ${SUBSCRIBER_COUNT} subscribers (Redux)`,
            );

            unsubscribers.forEach((u) => u());
            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

async function benchmarkDeepStateAccessRedux(): Promise<void> {
    const result = await benchmark(
        "Redux",
        "Deep State Modification",
        async () => {
            const { store, actions } = createReduxStore({
                todos: Array.from({ length: 50 }, (_, i) => ({
                    id: i + 1,
                    text: `Todo ${i + 1}`,
                    completed: false,
                    createdAt: Date.now(),
                })),
                filter: "all",
                nextId: 51,
            });

            const metrics: SubscriberMetrics = {
                callCount: 0,
                totalLatency: 0,
                operationStartTime: 0,
            };

            const unsubscribe = store.subscribe(() => {
                const latency = performance.now() - metrics.operationStartTime;
                metrics.totalLatency += latency;
                metrics.callCount++;
            });

            metrics.operationStartTime = performance.now();
            const targetId = 25;
            store.dispatch(
                actions.updateDeepState({
                    id: targetId,
                    text: "Modified deep todo",
                }),
            );

            await Promise.resolve();

            const currentState = store.getState();
            const modifiedTodo = currentState.todos.find(
                (t) => t.id === targetId,
            );
            const isValid = modifiedTodo?.text.includes("Modified");

            if (!isValid) {
                console.error(
                    "❌ State validation failed: Deep state access (Redux)",
                );
            }

            unsubscribe();
            return metrics;
        },
        BENCHMARK_ITERATIONS,
    );

    results.push(result);
}

// ============================================================================
// Main Runner
// ============================================================================

function printResults(): void {
    console.log("\n" + "=".repeat(100));
    console.log(
        "TODO BENCHMARK RESULTS - Statemanjs vs Effector vs MobX vs Redux",
    );
    console.log("=".repeat(100) + "\n");

    console.log(`Warmup iterations: ${WARMUP_ITERATIONS}`);
    console.log(`Benchmark iterations: ${BENCHMARK_ITERATIONS}\n`);

    // Group results by operation
    const groupedResults = new Map<string, BenchmarkResult[]>();
    results.forEach((result) => {
        if (!groupedResults.has(result.operation)) {
            groupedResults.set(result.operation, []);
        }
        groupedResults.get(result.operation)!.push(result);
    });

    // Print comparison for each operation
    groupedResults.forEach((libs, operation) => {
        console.log(`📊 ${operation}`);
        console.log("-".repeat(80));

        libs.forEach((result) => {
            console.log(`\n  ${result.name}:`);
            console.log(`    Avg Time: ${result.avgTimeMs.toFixed(4)} ms`);
            console.log(`    Min Time: ${result.minTimeMs.toFixed(4)} ms`);
            console.log(`    Max Time: ${result.maxTimeMs.toFixed(4)} ms`);
            console.log(`    Ops/sec:  ${result.opsPerSecond.toFixed(2)}`);
            console.log(`    Subscriber calls: ${result.subscriberCallCount}`);
            console.log(
                `    Avg Subscriber latency: ${result.avgSubscriberLatencyMs.toFixed(4)} ms`,
            );
            console.log(
                `    State validation: ${result.stateValidationPassed ? "✅ PASSED" : "❌ FAILED"}`,
            );
        });

        // Find winner
        if (libs.length >= 2) {
            const fastest = libs.reduce((prev, curr) =>
                curr.avgTimeMs < prev.avgTimeMs ? curr : prev,
            );
            const slowest = libs.reduce((prev, curr) =>
                curr.avgTimeMs > prev.avgTimeMs ? curr : prev,
            );
            const speedup = (slowest.avgTimeMs / fastest.avgTimeMs).toFixed(2);
            console.log(
                `\n  🏆 Winner: ${fastest.name} is ${speedup}x faster than ${slowest.name}`,
            );
        }

        console.log("");
    });

    console.log("=".repeat(80) + "\n");

    // Summary table
    console.log("📈 Summary Table:\n");
    console.log(
        "Operation".padEnd(40) +
            " | Statemanjs | Effector | MobX | Redux | Winner",
    );
    console.log("-".repeat(130));

    groupedResults.forEach((libs, operation) => {
        if (libs.length >= 2) {
            const statemanjs = libs.find((r) => r.name === "Statemanjs");
            const effector = libs.find((r) => r.name === "Effector");
            const mobx = libs.find((r) => r.name === "MobX");
            const redux = libs.find((r) => r.name === "Redux");

            const fastest = libs.reduce((prev, curr) =>
                curr.avgTimeMs < prev.avgTimeMs ? curr : prev,
            );
            const slowest = libs.reduce((prev, curr) =>
                curr.avgTimeMs > prev.avgTimeMs ? curr : prev,
            );
            const speedup = (slowest.avgTimeMs / fastest.avgTimeMs).toFixed(2);

            console.log(
                operation.padEnd(40) +
                    " | " +
                    (statemanjs
                        ? statemanjs.avgTimeMs.toFixed(4).padStart(10)
                        : "N/A".padStart(10)) +
                    " | " +
                    (effector
                        ? effector.avgTimeMs.toFixed(4).padStart(8)
                        : "N/A".padStart(8)) +
                    " | " +
                    (mobx
                        ? mobx.avgTimeMs.toFixed(4).padStart(4)
                        : "N/A".padStart(4)) +
                    " | " +
                    (redux
                        ? redux.avgTimeMs.toFixed(4).padStart(5)
                        : "N/A".padStart(5)) +
                    " | " +
                    `${fastest.name} (${speedup}x)`,
            );
        }
    });

    console.log("\n" + "=".repeat(100) + "\n");

    // Save to JSON file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `todo-benchmark-results-${timestamp}.json`;

    try {
        const fs = require("node:fs");
        fs.writeFileSync(
            filename,
            JSON.stringify(
                {
                    timestamp: new Date().toISOString(),
                    config: {
                        warmupIterations: WARMUP_ITERATIONS,
                        benchmarkIterations: BENCHMARK_ITERATIONS,
                        todosToAdd: TODOS_TO_ADD,
                    },
                    results,
                    grouped: Array.from(groupedResults.entries()).map(
                        ([operation, libs]) => ({
                            operation,
                            libraries: libs,
                        }),
                    ),
                },
                null,
                2,
            ),
        );
        console.log(`✅ Results saved to ${filename}\n`);
    } catch (error) {
        console.error(`❌ Failed to save results: ${error}`);
    }
}

async function run(): Promise<void> {
    console.log(
        "🚀 Starting TODO benchmarks for Statemanjs vs Effector vs MobX vs Redux...\n",
    );

    await benchmarkAddTodo();
    await benchmarkAddTodoEffector();
    await benchmarkAddTodoMobX();
    await benchmarkAddTodoRedux();

    await benchmarkAddMultipleTodos();
    await benchmarkAddMultipleTodosEffector();
    await benchmarkAddMultipleTodosMobX();
    await benchmarkAddMultipleTodosRedux();

    await benchmarkCompleteTodo();
    await benchmarkCompleteTodoEffector();
    await benchmarkCompleteTodoMobX();
    await benchmarkCompleteTodoRedux();

    await benchmarkToggleTodo();
    await benchmarkToggleTodoEffector();
    await benchmarkToggleTodoMobX();
    await benchmarkToggleTodoRedux();

    await benchmarkDeleteTodo();
    await benchmarkDeleteTodoEffector();
    await benchmarkDeleteTodoMobX();
    await benchmarkDeleteTodoRedux();

    await benchmarkFilterTodos();
    await benchmarkFilterTodosEffector();
    await benchmarkFilterTodosMobX();
    await benchmarkFilterTodosRedux();

    await benchmarkBatchOperations();
    await benchmarkBatchOperationsEffector();
    await benchmarkBatchOperationsMobX();
    await benchmarkBatchOperationsRedux();

    await benchmarkMultipleSubscribers();
    await benchmarkMultipleSubscribersEffector();
    await benchmarkMultipleSubscribersMobX();
    await benchmarkMultipleSubscribersRedux();

    await benchmarkDeepStateAccess();
    await benchmarkDeepStateAccessEffector();
    await benchmarkDeepStateAccessMobX();
    await benchmarkDeepStateAccessRedux();

    printResults();
}

run().catch((err) => {
    console.error("Benchmark run failed:", err);
});
