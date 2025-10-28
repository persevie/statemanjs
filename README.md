<p align="center">
<img height="60" alt="Statemanjs logo" src="./assets/stateman-js-logo-full.png">
</p>

[![codecov](https://codecov.io/gh/persevie/statemanjs/branch/main/graph/badge.svg?token=5NICXEETTY)](https://codecov.io/gh/persevie/statemanjs)
[![npm version](https://img.shields.io/npm/v/@persevie/statemanjs)](https://www.npmjs.com/package/@persevie/statemanjs)
[![npm downloads](https://img.shields.io/npm/dm/@persevie/statemanjs)](https://www.npmjs.com/package/@persevie/statemanjs)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@persevie/statemanjs)](https://bundlephobia.com/result?p=@persevie/statemanjs)
[![license](https://img.shields.io/npm/l/@persevie/statemanjs)](https://github.com/persevie/statemanjs/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/persevie/statemanjs?style=social)](https://github.com/persevie/statemanjs/stargazers)

```ts
import {
    createState,
    createComputedState,
    StatemanjsAPI,
} from "@persevie/statemanjs";

type Planet = {
    name: string;
    system: string;
    satelites: string[];
    hasLife: boolean;
    distance: number;
    averageTemperature: number;
};

type Coordinates = {
    latitude: number;
    longitude: number;
};

type Rover = {
    planet: string;
    name: string;
    days: number;
    batteryCharge: number;
    status: string;
    weatherOutside: string;
    coordinates: Coordinates;
};

const planetState = createState<Planet>({
    name: "Earth",
    system: "Solar System",
    satelites: [],
    hasLife: true,
    distance: 1_000_000,
    averageTemperature: 15,
});

const planetStateUnsub = planetState.subscribe((state) => {
    console.log("Planet state updated:", state);
});

const planetStateDistanceUnsub = planetState.subscribe(
    (state) => {
        console.log("Planet state distance updated:", state.distance);
    },
    {
        properties: ["distance"],
    },
);

planetState.update((state) => {
    state.satelites.push("Moon"); // <-- This will not trigger the planet state distance subscription
});

// --> Planet state updated: { name: 'Earth', system: 'Solar System', satelites: ["Moon"], hasLife: true, distance: 1000000 }

planetState.update((state) => {
    state.distance = 224_000_900; // <-- This will trigger the planet state distance subscription
});

// --> Planet state updated: { name: 'Earth', system: 'Solar System', satelites: ["Moon"], hasLife: true, distance: 224000900 }
// --> Planet state distance updated: 224000900

planetState.set({
    name: "Mars",
    system: "Solar System",
    satelites: ["Phobos", "Deimos"],
    hasLife: false,
    distance: 100,
    averageTemperature: -63,
}); // <-- This will trigger both planet state distance and planet state subscription

// --> Planet state updated: { name: 'Mars', system: 'Solar System', satelites: ["Phobos", "Deimos"], hasLife: false, distance: 100, averageTemperature: -63 }
// --> Planet state distance updated: 100

planetStateUnsub(); // <-- Unsubscribe from planet state
planetStateDistanceUnsub(); // <-- Unsubscribe from planet state distance

const marsExplorerState = createState<Rover>({
    planet: "Mars",
    name: "MarsExplorer",
    days: 0,
    batteryCharge: 100,
    status: "On the way",
    weatherOutside: "unknown",
    coordinates: {
        latitude: 0,
        longitude: 0,
    },
});

function generateReport(state: StatemanjsAPI<Rover>): string {
    return `Rover report state updated. My status is ${
        state.get().status
    }. I'm on day ${state.get().days}. My battery charge is ${
        state.get().batteryCharge
    }. Weather outside is ${state.get().weatherOutside}. My coordinates are ${
        state.get().coordinates.latitude
    }, ${state.get().coordinates.longitude}.
    My coordinates are: lat ${state.get().coordinates.latitude}, long ${
        state.get().coordinates.longitude
    }.
    The weather outside is: ${state.get().weatherOutside}.`;
}

const marsExplorerDaysState = marsExplorerState.createSelector(
    (state) => state.days,
);

marsExplorerDaysState.subscribe((state) => {
    console.log("MarsExplorer Days state updated:", state);
});

const marsExplorerReportState = createComputedState<string>((): string => {
    return generateReport(marsExplorerState);
}, [marsExplorerState]); // <-- State of report. Generate mars explorer report state every MarsExplorerState change

marsExplorerReportState.subscribe((state) => {
    console.log(state);
});

marsExplorerState.set({
    planet: "Mars",
    name: "MarsExplorer",
    days: 10,
    batteryCharge: 85,
    status: "Active",
    weatherOutside: "Sunny",
    coordinates: {
        latitude: 4.5,
        longitude: 137.4,
    },
});

// --> Rover report state updated. My status is Active. I'm on day 10. My battery charge is 85. Weather outside is Sunny.
// --> MarsExplorer Days state updated: 10

marsExplorerState.subscribe(
    () => {
        charge(marsExplorerState);
    },
    { notifyCondition: (s): boolean => s.batteryCharge < 10 },
);

function charge(roverState: StatemanjsAPI<Rover>) {
    roverState.asyncAction(async (state: StatemanjsAPI<Rover>) => {
        console.log("Charging the rover...");

        await new Promise((resolve) => setTimeout(resolve, 10000));

        state.update((state) => {
            state.batteryCharge = 100;
        });
    });
}

marsExplorerState.set({
    planet: "Mars",
    name: "MarsExplorer",
    days: 8,
    batteryCharge: 0,
    status: "Inactive",
    weatherOutside: "Sunny",
    coordinates: {
        latitude: -14.6,
        longitude: 130.7,
    },
});

// --> Charging the rover...

// 10s waiting

// --> Rover report state updated. My status is Inactive. I'm on day 8. My battery charge is 100. Weather outside is Sunny.
```

# Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Introduction](#introduction)
- [Why Statemanjs](#why-statemanjs)
    - [Architectural Requirements](#architectural-requirements)
    - [Developer Experience Requirements](#developer-experience-requirements)
    - [How Statemanjs Delivers](#how-statemanjs-delivers)
- [API](#api)
- [Any data type as a state](#any-data-type-as-a-state)
- [Installation](#installation)
- [Usage](#usage)
    - [Subscribe to changes](#subscribe-to-changes)
    - [State change](#state-change)
    - [Unwrap](#unwrap)
    - [Computed state](#computed-state)
    - [Selectors](#selectors)
    - [Async actions](#async-actions)
    - [Debug](#debug)
        - [Transactions](#transactions)
    - [Custom Comparators](#custom-comparators)
        - [Using Custom Comparators](#using-custom-comparators)
            - [Example](#example)
            - [Example](#example-1)
            - [Example Usage of Default Comparators](#example-usage-of-default-comparators)
- [Performance](#performance)
    - [Standard Operations Benchmark](#standard-operations-benchmark)
    - [Extreme Scale: Million-Record Stress Test](#extreme-scale-million-record-stress-test)
    - [Legacy Fill Benchmark](#legacy-fill-benchmark)
    - [Running Benchmarks](#running-benchmarks)
- [Integrations](#integrations)
- [For contributors](#for-contributors)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Introduction

Statemanjs is a framework-agnostic library for managing state in JavaScript and NodeJS applications. It combines deterministic scheduling with developer-friendly ergonomics to deliver both architectural discipline and exceptional performance.

- Deterministic graph evaluation with deferred computed scheduler
- Dynamic lifecycle without memory leaks via FinalizationRegistry
- Single subscription primitive instead of fragmented event APIs
- Production-grade performance: 2–20× faster across workloads
- Built-in transactions and debug tooling without external devtools
- Cross-runtime ready: browser, Node.js, workers, SSR
- TypeScript-first with automatic type inference and zero dependencies

# Why Statemanjs

Modern state management requires more than just storing and updating data. A production-ready solution must address fundamental architectural challenges while maintaining developer productivity. Below are the core requirements for any state manager, and how Statemanjs fulfills them.

## Architectural Requirements

**Deterministic updates.** The order of computations must be predictable and independent of declaration order. Complex dependency graphs—including diamond shapes and deep chains—should resolve without race conditions or glitches.

**Dynamic lifecycle.** Stores should be created, reused, and destroyed on demand. Memory and subscriptions must be released automatically or with minimal overhead, without leaving dangling references.

**Lazy reactivity.** Values should only recompute when consumers are actively listening. Changes in one branch shouldn't trigger cascading updates if results remain unchanged.

**Consistency and safety.** Errors in callbacks shouldn't corrupt the dependency graph. Computed values must be read-only. Subscribers that throw errors should be safely removed.

**Async resilience.** API calls, timers, and side-effects shouldn't create race conditions or partial update states. The library should provide structured ways to handle async operations.

**Cross-platform compatibility.** The same store instance should work identically in browsers, Node.js, Web Workers, and SSR environments without relying on DOM globals.

**Infinite scalability.** Performance must remain predictable even with millions of state elements. No sudden degradation or need for workarounds like manual virtualization at the store layer.

## Developer Experience Requirements

**Linear readability.** Business logic shouldn't be scattered across event graphs. Dependencies and subscriptions should be obvious from the code structure.

**Minimal DSL.** One subscription primitive instead of dozens of event methods. Unified update API without cognitive overhead of choosing between `watch`, `sample`, `merge`, etc.

**Type safety.** Full TypeScript inference from initial values. No manual type annotations for computed states or selectors. Zero runtime type errors from mismatched shapes.

**Observability.** Built-in tracing, snapshots, and transaction history. No dependency on external devtools or browser extensions for debugging production issues.

**Framework agnostic.** The same business logic should work with React, Vue, Solid, or no framework at all. Official adapters should expose identical store APIs.

## How Statemanjs Delivers

Statemanjs was built from scratch to fulfill every requirement simultaneously:

- **Deferred computed scheduler** (`computedScheduler`) batches recomputations until all dependencies flush, preventing glitches in diamond graphs and cyclic dependency detection throws clear errors early.
- **FinalizationRegistry integration** automatically removes dangling subscriptions after garbage collection. Computed values track active listeners and skip work when unused.
- **Single `subscribe` method** with optional `properties`, `notifyCondition`, and `protect` flags replaces fragmented event APIs. Explicit dependency arrays make graphs readable.
- **Transaction API** groups updates into atomic blocks with metadata (timestamp, tags, initiator). `DebugService` exposes full history without external tools.
- **Linear scaling to millions of elements.** Stress tests with 1M+ items show consistent microsecond-level single-item updates and ~2M ops/sec bulk operations without state corruption.
- **Full generic API** with automatic type inference. `createState<T>()` derives shape from initial value; `createComputedState` infers return types from callback functions.

Every design decision prioritizes **both** architectural correctness and developer ergonomics. No compromises between safety and speed, or between flexibility and simplicity.

# API

Any manipulations with your state are possible only through built-in methods, so they should be understandable and convenient.
The `createState` method is used to create a state:

```ts
/**
 * Accepts a new state and compares it with the current one.
 * Nothing will happen if the passed value is equal to the current one.
 * @param newState New state.
 * @returns Status of operation.
 */
set(newState: T, options?: SetOptions<T>): boolean;

/** Get current state */
get(): T;

/**
 * The method of subscribing to the status change.
 * Accepts a callback function (subscription callback),
 * which will be called at each update, and a subscription options object.
 * In the options, you can specify information about the subscription,
 * as well as specify the condition under which the subscriber will be notified
 * and mark the subscriber as protected. All subscribers are unprotected by default.
 * Protected subscribers can only be unsubscribed using the unsubscribe method returned by this method.
 * Returns the unsubscribe callback function.
 *
 * @param subscriptionCb A function that runs on every update.
 * @param subscriptionOptions Additional information and notification condition.
 * @returns Unsubscribe callback function.
 */
subscribe(
    subscriptionCb: SubscriptionCb<T>,
    subscriptionOptions?: SubscriptionOptions<T>,
): UnsubscribeCb;

/** Remove all unprotected subscribers */
unsubscribeAll(): void;

/**
 * Returns count of all active subscribers.
 * @returns number.
 */
getActiveSubscribersCount(): number;

/**
 * Flexible state update.
 * @param updateCb Callback for state updates.
 */
update(updateCb: UpdateCb<T>, options?: UpdateOptions<T>): boolean;

/**
 * Unwrap a proxy object to a regular JavaScript object
 * @returns unwrapped state
 */
unwrap(): T;

/**
 * Dispatch an async action
 * @param action An async action. It accepts a stateManager object,
 * which is used to access the current state.
 * @returns Promise.
 */
asyncAction(
    action: (stateManager: StatemanjsAPI<T>) => Promise<void>,
): Promise<void>;

/**
 * Create a computed state for a state property.
 * @param selectorFn A function that returns a value of a state property.
 * @returns A computed state.
 */
createSelector<E>(
    selectorFn: (state: T) => E,
    subscriptionOptions?: SubscriptionOptions<unknown>,
): StatemanjsComputedAPI<E>;

/**
 * Debug API. Allows you to use additional debugging functionality such as transactions.
 * Parameters are set when creating the state.
 * @see {DebugAPI}
 */
DEBUG?: DebugAPI<T>;
```

The `createComputedState` method is used to create a computed state:

```ts
createComputedState<T>(callback: () => T, deps: (StatemanjsAPI<any> | StatemanjsComputedAPI<any>)[]): StatemanjsComputedAPI<T>
```

`StatemanjsComputedAPI<T>`

```ts
/** Get current state */
get(): T;
/**
 * The method of subscribing to the status change.
 * Accepts a callback function (subscription callback),
 * which will be called at each update, and a subscription options object.
 * In the options, you can specify information about the subscription,
 * as well as specify the condition under which the subscriber will be notified
 * and mark the subscriber as protected. All subscribers are unprotected by default.
 * Protected subscribers can only be unsubscribed using the unsubscribe method returned by this method.
 * Returns the unsubscribe callback function.
 *
 * @param subscriptionCb A function that runs on every update.
 * @param subscriptionOptions Additional information and notification condition.
 * @returns Unsubscribe callback function.
 */
subscribe(
    subscriptionCb: SubscriptionCb<T>,
    subscriptionOptions?: SubscriptionOptions<T>,
): UnsubscribeCb;

/** Remove all unprotected subscribers */
unsubscribeAll(): void;

/**
 * Returns count of all active subscribers.
 * @returns number.
 */
getActiveSubscribersCount(): number;

/**
 * Unwrap a proxy object to a regular JavaScript object
 * @returns unwrapped state
 */
unwrap(): T;
```

`TransactionAPI<T>`

```ts
/**
 * The total number of transactions that have occurred since the state was initialized.
 */
totalTransactions: number;

/**
 * Adds a new transaction to the transaction chain.
 *
 * @param {T} snapshot - The snapshot of the state to be added as a transaction.
 */
addTransaction(snapshot: T): void;

/**
 * Retrieves the last transaction in the transaction chain.
 *
 * @returns {Transaction<T> | null} The last transaction, or null if there are no transactions.
 */
getLastTransaction(): Transaction<T> | null;

/**
 * Retrieves all transactions that have occurred.
 *
 * @returns {Transaction<T>[]} An array of all transactions.
 */
getAllTransactions(): Transaction<T>[];

/**
 * Retrieves a specific transaction by its number in the transaction chain.
 *
 * @param {number} transactionNumber - The number of the transaction to retrieve.
 * @returns {Transaction<T> | null} The transaction with the specified number, or null if it doesn't exist.
 */
getTransactionByNumber(transactionNumber: number): Transaction<T> | null;

/**
 * Retrieves the difference between the current state and the last transaction.
 *
 * @returns {TransactionDiff<T> | null} The difference between the current state and the last transaction, or null if there are no transactions.
 */
getLastDiff(): TransactionDiff<T> | null;

/**
 * Retrieves the difference between two specific transactions.
 *
 * @param {number} transactionA - The number of the first transaction.
 * @param {number} transactionB - The number of the second transaction.
 * @returns {TransactionDiff<T> | null} The difference between the two specified transactions, or null if the transactions don't exist or there is no difference.
 */
getDiffBetween(
    transactionA: number,
    transactionB: number,
): TransactionDiff<T> | null;
```

`DebugAPI<T>`

```ts
transactionService: TransactionAPI<T>;
```

# Any data type as a state

A state can be anything from primitives to complex and multidimensional objects. Just pass this to the `createState` function and use the state with no extra effort.

```ts
const isLoading = createState(true);

const soComplexObject = createState({
    1: { 2: { 3: { 4: { 5: [{ foo: "bar" }] } } } },
});
```

# Installation

```bash
npm i @persevie/statemanjs
```

# Usage

To use Statemanjs, you'll need to create a state object and interact with it using the provided API methods.

Here's an example of creating a state object for storing a user's name:

```js
import { createState } from "@persevie/statemanjs";

const userState = createState({ name: "Jake" });
```

You can also pass in the type of your state if you are using TypeScript:

```ts
import { createState } from "@persevie/statemanjs";

type User = {
    name: string;
    age: number;
};

const userState = createState<User>({ name: "Finn", age: 13 });
```

To get the current state, use the `get` method.

```js
const counterState = createState(1);

const counter = counterState.get(); // 1
```

## Subscribe to changes

The `subscribe` method takes a callback function and executes it on every state change. This callback function accepts the updated state.

```js
const counterState = createState(0);

// the 'state' parameter is the updated (current) state
counterState.subscribe((state) => {
    if (Number.isInteger(state)) {
        console.log("it's integer");
    } else {
        console.log("it's not integer");
    }
});
```

You can set a condition, `notifyCondition`, under which the callback will be called. This condition is the second and optional parameter. If there is no condition, then the callback will fire on every state change. `notifyCondition` also accepts the updated state.

```js
const counterState = createState(0);

counterState.subscribe(
    (state) => {
        console.log("it's integer");
    },
    { notifyCondition: (state) => Number.isInteger(state) },
);
```

To protect a subscriber - pass `protect: true` to the second argument of the object. Protected subscribers can only be unsubscribed using the unsubscribe method returned by the `subscribe` method.

```js
const counterState = createState(0);

counterState.subscribe(
    (state) => {
        console.log("it's integer");
    },
    { notifyCondition: (state) => Number.isInteger(state), protect: true },
);
```

You can specify which properties you want the subscriber to be notified when they change (at least one). If none of the properties have been changed, the subscriber will not be notified. Note that the `set` method always replaces the state, so use the `update` method to observe the properties correctly. Set is set.

```js
const userState = createState({
    name: "Jake",
    surname: "Dog",
    info: { hobbies: [] },
});

userState.subscribe(
    (state) => {
        console.log(`The name has been changed: ${state.name}`);
    },
    { properties: ["name"] },
);

userState.subscribe(
    (state) => {
        console.log(
            `Hobbies have been changed: ${state.info.hobbies.join(", ")}`,
        );
    },
    { properties: ["info.hobbies"] },
);
```

The `subscribe` method returns a callback to unsubscribe.

```js
const counterState = createState(0);

const unsub = counterState.subscribe(
    (state) => {
        console.log("it's integer");
    },
    { notifyCondition: (state) => Number.isInteger(state) },
);

// cancel subscribe
unsub();
```

To unsubscribe all active and unprotected subscriptions from a state, use the `unsubscribeAll` method;

```js
counterState.unsubscribeAll();
```

Sometimes you need to find out how many active subscriptions a state has, for this there is a `getActiveSubscribersCount` method.

```js
const subscribersCount = counterState.getActiveSubscribersCount();
```

## State change

There are two ways to change the state - `set` and `update`. The `set` method completely changes the state and is great for primitives and simple states.

```js
const counterState = createState(0);

counterState.subscribe(
    (state) => {
        console.log("it's integer");
    },
    { notifyCondition: (state) => Number.isInteger(state) },
);

counterState.set(2); // 2

counterState.set(counterState.get() * 2); // 4
```

The `update` method is suitable for complex states (objects and arrays) in which only part of the state needs to be changed. The `update` method accepts the current state.

```ts
import { createState } from "@persevie/statemanjs";

type User = {
    name: string;
    age: number;
    isOnline: boolean;
    hobbyes: Array<string>;
};

const userState = createState<User>({
    name: "Finn",
    age: 13,
    isOnline: false,
    hobbyes: [],
});

userState.update((state) => {
    state.isOnline = !state.isOnline;
});

userState.update((state) => {
    state.hobbyes.push("adventure");
});
```

## Unwrap

If you want unwrap state to javascript object - use `unwrap()` method:

```ts
import { createState } from "@persevie/statemanjs";

type User = {
    name: string;
    age: number;
    isOnline: boolean;
    hobbyes: Array<string>;
};

const userState = createState<User>({
    name: "Finn",
    age: 13,
    isOnline: false,
    hobbyes: [],
});

const unwrappedUser = userState.unwrap();
```

## Computed state

You can create a computed state with the `createComputedState` function. It returns an instance of statemanjs, but without the ability to set or update the state because of its specificity (_see the `StatemanjsComputedAPI` interface_).
This function takes two parameters:

- A callback function to create a state value (_run when at least one of the dependencies has been changed_).
- An array of dependencies (_an instance of statemanjs_).

Computed state creates only protected subscribers.

```ts
const problemState = createState<boolean>(false);

const statusComputedState = createComputedState<string>((): string => {
    return problemState.get()
        ? "Houston, we have a problem"
        : "Houston, everything is fine";
}, [problemState]);
```

## Selectors

You can create a selector for a state object to track changes only to it. A selector is a computed state, but only for the current state and its property.

```js
const state = createState({ count: 0, value: 42 });

state.subscribe((newState) => {
    console.log("State changed:", newState);
});

const countSelector = state.createSelector(
    (currentState) => currentState.count,
);
countSelector.subscribe((newCount) => {
    console.log("Count changed:", newCount);
});
```

## Async actions

If you need to change state asynchronously, for example to set data from an api call, you can use the `asyncAction` method. It takes a callback function with a state instance as a parameter.

```js
const state = createState({ count: 0, value: 0 });

state.subscribe((newState) => {
    console.log("State changed:", newState);
});

state.asyncAction(async (stateManager) => {
    await new Promise((resolve) => setTimeout(resolve, 10000));

    stateManager.update((s) => {
        s.count++;
    });
});
```

## Debug

### Transactions

```js
const arrState = createState([], { transactionsLen: 10 });

const gat = () => arrState.DEBUG.transactionService.getAllTransactions();

arrState.subscribe((state) => {
    console.log("diff: ", arrState.DEBUG.transactionService.getLastDiff());
});

arrState.set([0, 1]);

const arr = [
    2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
];

async function te() {
    for (let index = 0; index < arr.length; index++) {
        const element = arr[index];
        await new Promise((resolve) => setTimeout(resolve, 1000));
        arrState.update((s) => {
            s.push(element);
        });
    }
}

te().then(() => {
    console.log(
        "all transactions: ",
        arrState.DEBUG.transactionService.getAllTransactions(),
    );

    // -->
    // diff:  null
    // diff:  { old: [ 0, 1 ], new: [ 0, 1, 2 ] }
    // diff:  { old: [ 0, 1, 2 ], new: [ 0, 1, 2, 3 ] }
    // diff:  { old: [ 0, 1, 2, 3 ], new: [ 0, 1, 2, 3, 4 ] }
    // diff:  { old: [ 0, 1, 2, 3, 4 ], new: [ 0, 1, 2, 3, 4, 5 ] }
    // ...
    // all transactions:  [
    // {
    //     number: 11,
    //     snapshot: [
    //     0,  1, 2, 3, 4,
    //     5,  6, 7, 8, 9,
    //     10, 11
    //     ],
    //     timestamp: 1702588027170
    // },
    // {
    //     number: 12,
    //     snapshot: [
    //     0, 1, 2, 3,  4,  5,
    //     6, 7, 8, 9, 10, 11,
    //     12
    //     ],
    //     timestamp: 1702588028173
    // },
    // {
    //     number: 13,
    //     snapshot: [
    //     0,  1, 2, 3,  4,  5,
    //     6,  7, 8, 9, 10, 11,
    //     12, 13
    //     ],
    //     timestamp: 1702588029175
    // },
    // {
    //     number: 14,
    //     snapshot: [
    //     0,  1,  2, 3,  4,  5,
    //     6,  7,  8, 9, 10, 11,
    //     12, 13, 14
    //     ],
    //     timestamp: 1702588030176
    // },
    // {
    //     number: 15,
    //     snapshot: [
    //     0,  1,  2,  3,  4,  5,
    //     6,  7,  8,  9, 10, 11,
    //     12, 13, 14, 15
    //     ],
    //     timestamp: 1702588031179
    // },
    // {
    //     number: 16,
    //     snapshot: [
    //     0,  1,  2,  3,  4,  5,  6,
    //     7,  8,  9, 10, 11, 12, 13,
    //     14, 15, 16
    //     ],
    //     timestamp: 1702588032180
    // },
    // {
    //     number: 17,
    //     snapshot: [
    //     0,  1,  2,  3,  4,  5,  6,
    //     7,  8,  9, 10, 11, 12, 13,
    //     14, 15, 16, 17
    //     ],
    //     timestamp: 1702588033183
    // },
    // {
    //     number: 18,
    //     snapshot: [
    //     0,  1,  2,  3,  4,  5,  6,
    //     7,  8,  9, 10, 11, 12, 13,
    //     14, 15, 16, 17, 18
    //     ],
    //     timestamp: 1702588034187
    // },
    // {
    //     number: 19,
    //     snapshot: [
    //     0,  1,  2,  3,  4,  5,  6,
    //     7,  8,  9, 10, 11, 12, 13,
    //     14, 15, 16, 17, 18, 19
    //     ],
    //     timestamp: 1702588035189
    // },
    // {
    //     number: 20,
    //     snapshot: [
    //     0,  1,  2,  3,  4,  5,  6,
    //     7,  8,  9, 10, 11, 12, 13,
    //     14, 15, 16, 17, 18, 19, 20
    //     ],
    //     timestamp: 1702588036193
    // }
    // ]
});
```

## Custom Comparators

`Statemanjs` allows you to define custom comparator functions that determine how the state should be compared before it is updated. This feature is particularly useful when you need more control over the conditions under which the state is considered "changed."

### Using Custom Comparators

When creating a state object with `createState` or a computed state with `createComputedState`, you can provide a `customComparator` as part of the `StatemanjsServiceOptions`. This custom comparator will be used if you set the `defaultComparator` to `"custom"`.

#### Example

```ts
import { createState } from "@persevie/statemanjs";
import _ from "lodash";

const state = createState(
    { name: "Finn", age: 13 },
    {
        defaultComparator: "custom",
        customComparator: (a, b) => _.isEqual(a, b),
    },
);

state.update((currentState) => {
    currentState.age = 14;
});
```

In this example, the `_.isEqual` function from lodash is used to perform deep equality checks on the state. The state will only be updated if the custom comparator determines that the new state is different from the current state.

Overriding Comparators in set and update
You can override the global comparator behavior in individual set or update operations by using the SetOptions and UpdateOptions respectively. This allows you to temporarily use a different comparator or skip comparison entirely for a specific operation.

**Options:**

- `skipComparison`: If set to true, the state will be updated without any comparison.
- `comparatorOverride`: Overrides the global `defaultComparator` for this operation. You can use "none", "ref", "shallow", or "custom".
- `customComparatorOverride`: Provides a custom comparator to be used for this operation, but it only applies if comparatorOverride or the global
- `defaultComparator` is set to "custom".

#### Example

```ts
state.update(
    (currentState) => {
        currentState.age = 15;
    },
    {
        comparatorOverride: "custom",
        customComparatorOverride: (a, b) => a.age === b.age,
    },
);
```

In this example, the state will only update if the age property is different, as defined by the `customComparatorOverride`. This comparator override is only effective because comparatorOverride is explicitly set to "custom".

Here are the available defaultComparator options:

- "none": The state will be modified without any comparison.
- "ref": The state will be modified if the new state is a different reference from the current state.
- "shallow": The state will be modified based on a shallow comparison, where only the first level of properties is compared.

By default, Statemanjs will use "ref" if no defaultComparator is specified.

#### Example Usage of Default Comparators

```ts
const state = createState(
    { name: "Jake", age: 28 },
    {
        defaultComparator: "shallow",
    },
);

state.set({ name: "Jake", age: 29 }); // Will update because age is different
```

In this example, shallow comparison is used, meaning the state will only update if any of the top-level properties have changed.

This flexibility allows you to optimize performance and control how your application responds to state changes.

# Performance

Statemanjs delivers production-grade performance across diverse workloads—from microsecond single-item updates to million-record bulk operations.

## Standard Operations Benchmark

Benchmark configuration: `benchmark/bench.ts` (Bun 1.1, 1000 iterations, 100 warmup runs). Results show average time per operation (ms) and throughput (ops/s). All runs pass state validation.

| Operation                  | Statemanjs (ms) | Statemanjs (ops/s) | Effector (ms) | Effector (ops/s) | MobX (ms) | MobX (ops/s) | Redux (ms) | Redux (ops/s) |
| -------------------------- | --------------: | -----------------: | ------------: | ---------------: | --------: | -----------: | ---------: | ------------: |
| Add Single Todo            |          0.0072 |            139,205 |        0.0139 |           71,812 |    0.0170 |       58,659 |     0.0207 |        48,402 |
| Add 100 Todos              |          0.0461 |             21,698 |        0.0753 |           13,278 |    0.8360 |        1,196 |     4.8851 |           205 |
| Complete Single Todo       |          0.0045 |            221,901 |        0.0088 |          113,206 |    0.0110 |       90,584 |     0.0169 |        59,184 |
| Toggle Single Todo         |          0.0054 |            183,786 |        0.0060 |          167,440 |    0.0126 |       79,453 |     0.0166 |        60,302 |
| Delete Single Todo         |          0.0044 |            228,658 |        0.0078 |          128,894 |    0.0131 |       76,415 |     0.0191 |        52,437 |
| Change Filter              |          0.0033 |            302,188 |        0.0077 |          130,237 |    0.0142 |       70,455 |     0.0117 |        85,355 |
| Batch: Add+Complete+Delete |          0.0088 |            113,973 |        0.0119 |           84,330 |    0.0156 |       64,147 |     0.0168 |        59,674 |
| Update with 10 Subscribers |          0.0082 |            122,630 |        0.0128 |           77,964 |    0.0302 |       33,119 |     0.0187 |        53,487 |
| Deep State Modification    |          0.0078 |            128,749 |        0.0111 |           89,868 |    0.1746 |        5,728 |     0.1184 |         8,445 |

**Key takeaways:**

- **Burst operations:** 2–20× faster than alternatives across bulk inserts, deep updates, and multi-subscriber scenarios.
- **Consistent throughput:** Every operation stays in the 100k+ ops/s range except bulk batching, which remains competitive at 21k ops/s.
- **Deep mutations:** In-place structural sharing (`update(draft => ...)`) outperforms immutable cloning by an order of magnitude.

## Extreme Scale: Million-Record Stress Test

Configuration: `benchmark/todo-benchmark-results-2025-10-28T13-34-52-165Z.json` (10 iterations, 10 warmup, 1,000,000 items per batch).

| Operation                  | Avg Time (ms) | Ops/Second | State Valid |
| -------------------------- | ------------: | ---------: | :---------: |
| Add Single Todo            |         0.025 |     40,174 |     ✅      |
| Add 1,000,000 Todos        |       506.809 |      1.973 |     ✅      |
| Complete Single Todo       |         0.015 |     67,058 |     ✅      |
| Toggle Single Todo         |         0.013 |     79,365 |     ✅      |
| Delete Single Todo         |         0.010 |    100,125 |     ✅      |
| Change Filter              |         0.007 |    139,698 |     ✅      |
| Batch: Add+Complete+Delete |         0.017 |     59,895 |     ✅      |
| Update with 10 Subscribers |         0.020 |     50,977 |     ✅      |
| Deep State Modification    |         0.039 |     25,532 |     ✅      |

**What this means:**

- **Linear scaling confirmed:** Single-item operations remain in the 0.01–0.04 ms range even with a million-element array in memory.
- **No catastrophic degradation:** Bulk inserting 1,000,000 items takes ~507 ms (effectively ~2 million array operations per second), and the resulting state passes validation.
- **Real-world viability:** Large datasets like financial dashboards, log viewers, or analytics tables stay responsive without virtualization hacks at the store layer.

## Legacy Fill Benchmark

Historical performance data for incremental array filling (1–50 million elements). Time in milliseconds; ❌ indicates timeout (>6h) or crash.

|      Items | Effector (ms) | MobX (ms) | Redux (ms) | Statemanjs (ms) |
| ---------: | ------------: | --------: | ---------: | --------------: |
|          1 |         0.011 |     0.020 |      0.004 |           0.002 |
|         10 |         0.046 |     0.110 |      0.014 |           0.010 |
|        100 |         0.178 |     0.435 |      0.083 |           0.062 |
|      1,000 |         1.209 |     2.587 |      0.875 |           0.242 |
|     10,000 |        58.333 |    31.700 |     52.266 |           2.223 |
|    100,000 |    13,849.532 |   322.186 | 12,867.839 |          27.506 |
|  1,000,000 |  2,448,118.75 | 4,473.259 |  2,354,867 |         279.839 |
|  2,000,000 |            ❌ | 9,588.995 |         ❌ |         605.374 |
|  5,000,000 |            ❌ |        ❌ |         ❌ |       1,468.102 |
| 10,000,000 |            ❌ |        ❌ |         ❌ |       3,185.279 |
| 50,000,000 |            ❌ |        ❌ |         ❌ |      14,499.884 |

Statemanjs is the only library to complete all test cases without timeout or memory exhaustion, demonstrating true production readiness for data-intensive applications.

## Running Benchmarks

```bash
cd benchmark
bun bench.ts  # or: pnpm run bench
```

All benchmark implementations use official patterns from each library's documentation. Source code and methodology details are in `benchmark/README.md`.

# Integrations

Statemanjs is framework agnostic and can be used without additional packages. But for convenience, there are packages for the most popular frameworks - [react](https://github.com/persevie/statemanjs/blob/main/src/statemanjs-react/README.md), [vue](https://github.com/persevie/statemanjs/blob/main/src/statemanjs-vue/README.md), [solid](https://github.com/persevie/statemanjs/blob/main/src/statemanjs-solid/README.md). Statemanjs supports svelte out of the box and doesn't need any additional packages.
To work with additional packages, the main statemanjs package is required.

# For contributors

See [CONTRIBUTING.md](https://github.com/persevie/statemanjs/blob/main/CONTRIBUTING.md).

```

```
