<p align="center">
<img height="60" alt="Statemanjs logo" src="./assets/stateman-js-logo-full.png">
</p>

[![codecov](https://codecov.io/gh/persevie/statemanjs/branch/main/graph/badge.svg?token=5NICXEETTY)](https://codecov.io/gh/persevie/statemanjs)

```ts
import { createState, createComputedState } from "@persevie/statemanjs";

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

-   [Introduction](#introduction)
-   [API](#api)
-   [Any data type as a state](#any-data-type-as-a-state)
-   [Installation](#installation)
-   [Usage](#usage)
    -   [Subscribe to changes](#subscribe-to-changes)
    -   [State change](#state-change)
    -   [Unwrap](#unwrap)
    -   [Computed state](#computed-state)
    -   [Selectors](#selectors)
    -   [Async actions](#async-actions)
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
-   Small size: Statemanjs has a tiny size of only less than 100KB, making it easy to include in your project without being too big.

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
update(updateCb: UpdateCb<T>, currentState?: T): void;

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
createSelector<E>(selectorFn: (state: T) => E): StatemanjsComputedAPI<E>;
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

````js
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
        console.log(`Hobbies have been changed: ${state.info.hobbies.join(", ")}`);
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
````

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

# Performance test

> The examples of storage implementations for each state-manager (except statemanjs) were taken from the official documentation of these libraries.

### Fill case.

One by one adds `n` elements to the array `x` times. Where `n` is a number from the array of numbers [1, 10, 100, 1000, 10000, 100000, 1000000, 2000000, 5000000, 10000000,
50000000] ([countOfElements](https://github.com/persevie/statemanjs/blob/main/benchmarks/cases/shared.mjs)), and `x` is the number of iterations (1 by default). If `n = 5; x = 2`, that means to add `5` elements `2` times. The `element` is an object `{foo: "bar", baz: "qux"}`. Between iterations the storage is reset (empty array).
The average value for iterations is calculated and written as the result.

Think of this case as a TODO list with a simple structure, e.g. `{title: string, notes: string}`.

The benchmark was run on a MacBook Pro m1 16gb.

You can run the benchmarks on your computer. You can also add new benchmarks or modify existing ones.
Read more about it [here](https://github.com/persevie/statemanjs/blob/main/benchmarks/README.md).

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

Statemanjs is framework agnostic and can be used without additional packages. But for convenience, there are packages for the most popular frameworks - [react](https://github.com/persevie/statemanjs/blob/main/src/statemanjs-react/README.md), [vue](https://github.com/persevie/statemanjs/blob/main/src/statemanjs-vue/README.md), [solid](https://github.com/persevie/statemanjs/blob/main/src/statemanjs-solid/README.md). Statemanjs supports svelte out of the box and doesn't need any additional packages.
To work with additional packages, the main statemanjs package is required.

# For contributors

See [CONTRIBUTING.md](https://github.com/persevie/statemanjs/blob/main/CONTRIBUTING.md).
