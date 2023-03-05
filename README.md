<p align="center">
<img height="60" alt="Statemanjs logo" src="./assets/stateman-js-logo-full.png">
</p>

```ts
import { createState } from "@persevie/statemanjs";

type TransferElement = {
    speed: number;
    info: string;
    error?: string;
};

// Create a new state with initial value { speed: 0, info: "" }
const transferState = createState<TransferElement>({ speed: 0, info: "" });

// Subscribe to state changes and log the updated state
const unsubscribe = transferState.subscribe((state) => {
  console.log("State updated:", state);
});

// Update the state to { speed: 50, info: "Transfer in progress" }
transferState.update((state) => {
  state.speed = 50;
  state.info = "Transfer in progress";
});

// Get the current state
const currentState = transferState.get();
console.log("Current state:", currentState);

// Unsubscribe from state updates
unsubscribe();

// Subscribe to state changes, but only log the updated state if the error
transferState.subscribe(
  (state) => {
    console.log("An error occurred:", state.error);
  },
  {
    notifyCondition: (state) => {
      state.error !== undefined;
    },
  },
);

// Set (create new object and replace old) the state to { speed: 0, info: "Ooops...", error: "Internet connection" }
transferState.set({
  speed: 0;
  info: "Ooops...",
  error: Internet connection,
});

// Get the active subscribers count
console.log("Active subscribers count:", transferState.getActiveSubscribersCount());

// Remove all subscribers
transferState.unsubscribeAll();

// Get the active subscribers count after unsubscribe
console.log("Active subscribers count after unsubscribe:", transferState.getActiveSubscribersCount());

// Output:
// "State updated: { speed: 50, info: "Transfer in progress" }"
// "Current state: { speed: 50, info: "Transfer in progress" }"
// "An error occurred: "Internet connection""
// "Active subscribers count: 1"
// "Active subscribers count after unsubscribe: 0"
```

# Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

-   [Introduction](#introduction)
-   [API](#api)
-   [Any data type as a state](#any-data-type-as-a-state)
-   [Installation](#installation)
-   [Usage](#usage)
    -   [Subscribe to changes](#subscribe-to-changes)
    -   [State change](#state-change)
    -   [Unwrap](#unwrap)
    -   [Computed state](#computed-state)
-   [Performance test](#performance-test)
    -   [Fill case.](#fill-case)
-   [Integrations](#integrations)
-   [For contributors](#for-contributors)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Introduction

Statemanjs is a framework-agnostic library for creating and managing the state of your JavaScript and NodeJS applications.

Key features:

-   High performance: Statemanjs is designed to be fast and efficient, especially in large or complex applications.
-   Reliability: The library's strict API, read-only state links and reliance on mutability ensure that state changes are reliable and secure.
-   Clear API: Statemanjs has a clear and easy-to-use API, with methods for creating, updating, and subscribing to state changes.
-   Support for any data type as a state: Statemanjs can handle any data type as a state, including primitives, complex objects, and multidimensional arrays.
-   Framework-agnostic: Statemanjs can be used on its own without any additional packages, but it also has additional packages available for popular front-end frameworks such as React, Vue and Svelte.
-   TypeScript support: Statemanjs is written in TypeScript, which means it has excellent support for type checking and type inference.
-   Small size: Statemanjs has a tiny size of just 80.4 KB, making it easy to include in your project without adding unnecessary bloat.

# API

Any manipulations with your state are possible only through built-in methods, so they should be understandable and convenient.
The `createState` method is used to create a state:

```ts
createState<T>(element: T): StatemanjsAPI<T>;
```

`StatemanjsAPI<T>`

```ts
/**
 * Accepts a new state and compares it with the current one.
 * Nothing will happen if the passed value is equal to the current one.
 * @param newState New state.
 * @returns Status of operation.
 */
set(newState: T): boolean;

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
update(updateCb: UpdateCb<T>): void;

/**
 * Unwrap a proxy object to a regular JavaScript object
 * @returns unwrapped state
 */
unwrap(): T;
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
 * State change subscription method.
 * Accepts the callback function (subscription callback),
 * which will be called on each update, and the subscription parameter object.
 * In the options, you can specify information about the subscription,
 * as well as specify the condition under which the subscriber will be notified.
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

/** Remove all subscribers */
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

-   A callback function to create a state value (_run when at least one of the dependencies has been changed_).
-   An array of dependencies (_an instance of statemanjs_).

Computed state creates only protected subscribers.

```ts
const problemState = createState<boolean>(false);

const statusComputedState = createComputedState<string>((): string => {
    return problemState.get()
        ? "Houston, we have a problem"
        : "Houston, everything is fine";
}, [problemState]);
```

# Performance test

> The examples of storage implementations for each state-manager (except statemanjs) were taken from the official documentation of these libraries.

### Fill case.

One by one adds `n` elements to the array `x` times. Where `n` is a number from the array of numbers [1, 10, 100, 1000, 10000, 100000, 1000000, 2000000, 5000000, 10000000,
50000000] ([countOfElements](https://github.com/dmtrshat/statemanjs-benchmarks/blob/main/cases/shared.mjs)), and `x` is the number of iterations (1 by default). If `n = 5; x = 2`, that means to add `5` elements `2` times. The `element` is an object `{foo: "bar", baz: "qux"}`. Between iterations the storage is reset (empty array).
The average value for iterations is calculated and written as the result.

Think of this case as a TODO list with a simple structure, e.g. `{title: string, notes: string}`.

The benchmark was run on a MacBook Pro m1 16gb.

You can run the benchmarks on your computer. You can also add new benchmarks or modify existing ones.
Read more about it [here](https://github.com/dmtrshat/statemanjs-benchmarks/blob/main/README.md).

Below is a table with the results of the **fill** benchmark.

> time in `ms`

> ❌ - means an error during execution or too long execution time (>6h).

<table>
<thead>
  <tr>
    <th style="background-color: dimgray;">Items</th>
    <th style="background-color: dimgray;">effector</th>
    <th style="background-color: dimgray;">mobx</th>
    <th style="background-color: dimgray;">redux</th>
    <th style="background-color: dimgray;">statemanjs</th>
  </tr>
</thead>
<tbody>
    <tr>
        <td style="background-color: dimgray; font-weight: bold">1</td>
        <td style="color:tomato">0.010970029979944229</td>
        <td style="color:red">0.01990541983395815</td>
        <td style="color:darkseagreen">0.0040803998708724976</td>
        <td style="color:green; font-weight: bold">0.0020753702148795126</td>
    </tr>
    <tr>
        <td style="background-color: dimgray; font-weight: bold">10</td>
        <td style="color:tomato">0.04626586981117725</td>
        <td style="color:red">0.11000874035060405</td>
        <td style="color:darkseagreen">0.014035369530320167</td>
        <td style="color:green; font-weight: bold">0.010449579730629922</td>
    </tr>
    <tr>
        <td style="background-color: dimgray; font-weight: bold">100</td>
        <td style="color:tomato">0.17841962995938956</td>
        <td style="color:red">0.4354520997777581</td>
        <td style="color:darkseagreen">0.08275457009673119</td>
        <td style="color:green; font-weight: bold">0.06232665043324232</td>
    </tr>
    <tr>
        <td style="background-color: dimgray; font-weight: bold">1000</td>
        <td style="color:tomato">1.208628780017607</td>
        <td style="color:red">2.586632479839027</td>
        <td style="color:darkseagreen">0.8747471100464463</td>
        <td style="color:green; font-weight: bold">0.2421091901510954</td>
    </tr>
    <tr>
        <td style="background-color: dimgray; font-weight: bold">10000</td>
        <td style="color:red">58.332799129989</td>
        <td style="color:darkseagreen">31.700192469991745</td>
        <td style="color:tomato">52.266411220021546</td>
        <td style="color:green; font-weight: bold">2.2227349602803588</td>
    </tr>
    <tr>
        <td style="background-color: dimgray; font-weight: bold">100000</td>
        <td style="color:red">13849.532463340052</td>
        <td style="color:darkseagreen">322.1863979200646</td>
        <td style="color:tomato">12867.839250005782</td>
        <td style="color:green; font-weight: bold">27.505533350259064</td>
    </tr>
    <tr>
        <td style="background-color: dimgray; font-weight: bold">1000000</td>
        <td style="color:red">2448118.7541659996</td>
        <td style="color:darkseagreen">4473.258667119965</td>
        <td style="color:tomato">2354867.223542001</td>
        <td style="color:green; font-weight: bold">279.83934087000785</td>
    </tr>
    <tr>
        <td style="background-color: dimgray; font-weight: bold">2000000</td>
        <td>❌</td>
        <td style="color:red">9588.994868720061</td>
        <td>❌</td>
        <td style="color:green; font-weight: bold">605.3742875201627</td>
    </tr>
    <tr>
        <td style="background-color: dimgray; font-weight: bold">5000000</td>
        <td>❌</td>
        <td>❌</td>
        <td>❌</td>
        <td style="color:green; font-weight: bold">1468.102162090242</td>
    </tr>
    <tr>
        <td style="background-color: dimgray; font-weight: bold">10000000</td>
        <td>❌</td>
        <td>❌</td>
        <td>❌</td>
        <td style="color:green; font-weight: bold">3185.2785096402094</td>
    </tr>
    <tr>
        <td style="background-color: dimgray; font-weight: bold">50000000</td>
        <td>❌</td>
        <td>❌</td>
        <td>❌</td>
        <td style="color:green; font-weight: bold">14499.883542001247</td>
    </tr>
</tbody>
</table>

Statemanjs has significantly better performance than others.
This suggests that Statemanjs may be a good choice for state management in JavaScript applications that need to perform many updates on large data sets in a short period of time. It may also be a good choice for applications that need to perform updates on complex data structures, as Statemanjs is able to handle these updates more efficiently.

# Integrations

Statemanjs is framework agnostic and can be used without additional packages. But for convenience, there are packages for the most popular frameworks - [react](https://github.com/persevie/statemanjs-react), [vue](https://github.com/persevie/statemanjs-vue), [solid](https://github.com/persevie/statemanjs-solid). Statemanjs supports svelte out of the box and doesn't need any additional packages.
To work with additional packages, the main statemanjs package is required.

# For contributors

See [CONTRIBUTING.md](./CONTRIBUTING.md).
