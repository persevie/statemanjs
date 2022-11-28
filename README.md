<p align="center">
<img height="60" alt="Statemanjs logo" src="./assets/stateman-js-logo-full.png">
</p>

```ts
import { createState } from "@persevie/statemanjs";

const counterState = createState(0);

counterState.subscribe((state) => {
    if (Number.isInteger(state)) {
        console.log("it's integer");
    } else {
        console.log("it's not integer");
    }
});

function increaseCount() {
    counterState.set(counterState.get() + 1);
}
```

```ts
type TransferElement = {
    speed: number;
    info: string;
    error?: string;
};

const transferState = createState<TransferElement>({
    speed: 0,
    info: "start",
});

transferState.subscribe(
    // called only if the error property has been updated
    (state) => {
        console.log("Oops, something seems to be broken");
    },
    {
        notifyCondition: (state) => {
            state.error !== undefined;
        },
    },
);
```

# Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

-   [**Review**](#review)
    -   [**Performance**](#performance)
    -   [**Security and reliability**](#security-and-reliability)
    -   [**Clear API**](#clear-api)
    -   [**Everything can be a state**](#everything-can-be-a-state)
-   [**Usage**](#usage)
    -   [**Installation and initialization the state**](#installation-and-initialization-the-state)
    -   [**Subscribe to changes**](#subscribe-to-changes)
    -   [**State change**](#state-change)
-   [**Benchmarks**](#benchmarks)
    -   [Fill case.](#fill-case)
-   [**Integrations**](#integrations)
-   [**Statemanjs is:**](#statemanjs-is)
-   [**For contributors**](#for-contributors)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# **Review**

Statemanjs is a framework agnostic library for creating and managing the state of your JavaScript and NodeJS applications. Statemanjs is written in TypeScript so it has excellent support out of the box. statemanjs has integrations (delivered as npm packages) for front-end frameworks (react, vue, solid, etc.) that just make it easier to use. You can do without them if you wish.
Statemanjs has the highest performance and reliability, and adheres to a clear and strict API without a boilerplate. Statemanjs is highly scalable and suitable for both small and large projects.

Here are the basic principles of statemanjs:

-   Performance
-   Security and reliability
-   Clear API
-   Everything can be a state

Each of these principles will be discussed below.

## **Performance**

Statemanjs was developed for JavaScript with all the features of this language in mind. Special attention is paid to single-threading and mutability.
Most state managers for JS take an immutable approach. This means that when the state changes, a copy of it is always created. It can be imagined like this - a new value of the object has come → the state is cloned → the state is updated → the updated state is returned. Now it does not look so scary, but let's add single-threading to this. Your application is forced to wait for the state update to complete before doing something else. It would be more logical to follow this approach - a new value of the object has come → the state is updated → the updated state is returned. The number of stages has been reduced, and therefore productivity has increased. “But you only threw out cloning, does it affect performance so much?” - Yes. In JavaScript, immutability is a very expensive operation. This means that the cloning step will take time, which can be spent, for example, updating the UI or performing another task. Add to this a huge amount of logic in your application, and the performance difference becomes more and more significant.
Statemanjs - takes a data mutability approach.

Imagine the situation - you send 100 big files to the server and the UI should show the progress, speed, ETA, file name and path for each of the files. In addition to changing the sending information - other information that is not displayed in the UI, in the file structure - the number of bytes sent, how many bytes left, etc. is also changed. The user has to interact with the application. The immutable approach will not work. The application will freeze with every status update, and if you take into account that every file is sent in parallel, the application can freeze completely. Statemanjs can easily do it.

## **Security and reliability**

The immutable approach ensures that your state is not accidentally changed, which is not the case with the mutable approach. For example, the state of Mobx can be changed anywhere and any way. You can bind the current state to a variable, and when the variable changes, the state will also change. Agree, it does not look very reliable.

Statemanjs is arranged differently here as well. You can only change/create state through built-in methods. **It's as if you put a state in a box and can only get a link to that state with a read-only restriction**.

It is this API that guarantees the security and reliability of your state.

## **Clear API**

As it was written above, any manipulations with your state are possible only through built-in methods, so they should be understandable and convenient.
The `createState` method is used to create a state:

```ts
createState<T>(element: T): StatemanjsAPI<T>;
```

There are 6 methods for interacting with the state - `set`, `get`, `subscribe`,
`unsubscribeAll`,
`getActiveSubscribersCount`,
`update`.

Here is a detailed view of the API:

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
 * The method of subscribing to the state change.
 * Accepts a callback function (subscription callback),
 * which will be called at each update, and a subscription options object.
 * In the options, you can specify information about the subscription,
 * as well as specify the condition under which the subscriber will be notified.
 * Returns the unsubscribe callback function.
 *
 * @param subscriptionCb A function that runs on every update.
 * @param subscriptionOptions Additional information and notification condition.
 * @returns Unsubscribe callback function.
 */
subscribe(subscriptionCb: SubscriptionCb<T>, subscriptionOptions?: SubscriptionOptions<T>): UnsubscribeCb;

/** Remove all subscribers */
unsubscribeAll(): void;

/**
 * Returns counter of all active subscribers.
 * @returns number.
 */
getActiveSubscribersCount(): number;

/**
 * Flexible state update.
 * @param updateCb Callback for state updates.
 */
update(updateCb: UpdateCb<T>): void;
```

## **Everything can be a state**

A state can be anything from primitives to complex and multidimensional objects. Just pass this to the `createState` function and use the state with no extra effort.

```ts
const isLoading = createState(true);

const soComplexObject = createState({
    1: { 2: { 3: { 4: { 5: [{ foo: "bar" }] } } } },
});
```

# **Usage**

## **Installation and initialization the state**

```bash
npm i @persevie/statemanjs
```

```js
import { createState } from "@persevie/statemanjs";

const counterState = createState(0);
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

## **Subscribe to changes**

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

To unsubscribe all active subscriptions from a state, use the `unsubscribeAll` method;

```js
counterState.unsubscribeAll();
```

Sometimes you need to find out how many active subscriptions a state has, for this there is a `getActiveSubscribersCount` method.

```js
const subscribersCount = counterState.getActiveSubscribersCount();
```

## **State change**

There are two ways to change the state - `set` and `update`. The `set` method completely changes the state and is great for primitives and simple states.

```js
const counterState = createState(0);

counterState.subscribe(
    (state) => {
        console.log("it's integer");
    },
    { notifyCondition: (state) => Number.isInteger(state) },
);

counterState.set(2); // --> 2

counterState.set(counterState.get() * 2); // --> 4
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

# **Benchmarks**

> The examples of storage implementations (code) for each state-manager (except statemanjs) were taken from the official documentation of these libraries.

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

Statemanjs showed the best results in all tests. Some will argue that this case is biased, because adding an element to an array entails cloning in immutable state managers. But look at the test with adding a single element to an empty array - even in this case statemanjs is faster than the opponents. All state operations on this statemanager are faster. Redux performed quite well compared to effector and mobx, but it's worth noting that it's a very simple repository with few redirectors. In real projects its speed will be much slower. Mobx has shown that it is scalable, although the performance at the beginning leaves a lot to be desired. Effector is the outsider in this comparison, but in real projects its performance will be better than redux. Originally, the plan was to test zustand and xstate instead of effector, but the test results were unsatisfactory.

# **Integrations**

Statemanjs is framework agnostic and can be used without additional packages. But for convenience, there are packages for the most popular frameworks - [react](https://github.com/persevie/statemanjs-react), [vue](https://github.com/persevie/statemanjs-vue), [solid](https://github.com/persevie/statemanjs-solid). Statemanjs supports svelte out of the box and doesn't need any additional packages.
To work with additional packages, the main statemanjs package is required.

# **Statemanjs is:**

-   very fast
-   secure
-   scales perfectly
-   has a concise API
-   framework-independent
-   is small in size
-   has no dependencies

# **For contributors**

See [CONTRIBUTING.md](./CONTRIBUTING.md).
