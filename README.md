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
    -   [**Reliability**](#reliability)
    -   [**Clear API**](#clear-api)
    -   [**Everything can be a state**](#everything-can-be-a-state)
-   [**Usage**](#usage)
    -   [**Installation and initialization the state**](#installation-and-initialization-the-state)
    -   [**Subscribe to changes**](#subscribe-to-changes)
    -   [**State change**](#state-change)
-   [**Benchmark**](#benchmark)
-   [**Integrations**](#integrations)
-   [**For contributors**](#for-contributors)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# **Review**

Statemanjs is a framework agnostic library for creating and managing the state of your JavaScript and NodeJS applications. Statemanjs is written in TypeScript so it has excellent support out of the box. statemanjs has integrations (delivered as npm packages) for front-end frameworks (react, vue, solid, etc.) that just make it easier to use. You can do without them if you wish.
Statemanjs has the highest performance and reliability, and adheres to a clear and strict API without a boilerplate. Statemanjs is highly scalable and suitable for both small and large projects.

Here are the basic principles of statemanjs:

-   Performance
-   Reliability
-   Clear API
-   Everything can be a state

Each of these principles will be discussed below.

## **Performance**

Statemanjs was developed for JavaScript with all the features of this language in mind. Special attention is paid to single-threading and mutability.
Most state managers for JS take an immutable approach. This means that when the state changes, a copy of it is always created. It can be imagined like this - a new value of the object has come → the state is cloned → the state is updated → the updated state is returned. Now it does not look so scary, but let's add single-threading to this. Your application is forced to wait for the state update to complete before doing something else. It would be more logical to follow this approach - a new value of the object has come → the state is updated → the updated state is returned. The number of stages has been reduced, and therefore productivity has increased. “But you only threw out cloning, does it affect performance so much?” - Yes. In JavaScript, immutability is a very expensive operation. This means that the cloning step will take time, which can be spent, for example, updating the UI or performing another task. Add to this a huge amount of logic in your application, and the performance difference becomes more and more significant.
Statemanjs - takes a data mutability approach.

## **Reliability**

The immutable approach ensures that your state is not accidentally changed, which is not the case with the mutable approach. For example, the state of Mobx can be changed anywhere and any way. You can bind the current state to a variable, and when the variable changes, the state will also change. Agree, it does not look very reliable. Statemanjs is arranged differently here as well. You can only change/create state through built-in methods. It is this API that guarantees the reliability of your state.

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

# **Benchmark**

The benchmark was run on a MacBook Pro, m1, 16gb.
You can run [it](https://github.com/persevie/statemanjs-benchmarks) on your device.

Below is a comparison table with other popular state managers.
This table is the result of the benchmark, which adds elements to the array (state), in the amount of 100, 500, 1000, 5000, 10000, 20000, 40000, 80000, 160000, 320000, 640000, 1280000, 2560000.
Each case was run 10 times (for all state managers) and the average value was recorded in a table.

\*❌ - means error during benchmark.

\*\*Results in seconds

<table>
<thead>
  <tr>
    <th>Name</th>
    <th>100</th>
    <th>500</th>
    <th>1000</th>
    <th>5000</th>
    <th>10000</th>
    <th>20000</th>
    <th>40000</th>
    <th>80000</th>
    <th>160000</th>
    <th>320000</th>
    <th>640000</th>
    <th>1280000</th>
    <th>2560000</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td>statemanjs</td>
    <td>0.1256750002503395</td>
    <td>0.41603749953210356</td>
    <td>0.6447918005287647</td>
    <td>1.5476418003439902</td>
    <td>2.6794791001826526</td>
    <td>5.217970700562001</td>
    <td>9.459733299911022</td>
    <td>16.601908500120043</td>
    <td>33.24702489995398</td>
    <td>59.56564570013434</td>
    <td>125.51550420001149</td>
    <td>270.7810873998329</td>
    <td>532.6712166998535</td>
  </tr>
  <tr>
    <td>redux</td>
    <td>0.12983310036361217</td>
    <td>1.3561332002282143</td>
    <td>4.40060419999063</td>
    <td>266.9328539993614</td>
    <td>1009.34137509875</td>
    <td>4177.273962600157</td>
    <td>19662.740120899678</td>
    <td>105281.26535429992</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <td>mobx</td>
    <td>0.7277332998812198</td>
    <td>2.706258299946785</td>
    <td>4.108445800095796</td>
    <td>13.18133749999106</td>
    <td>24.971716599538922</td>
    <td>47.74443760029972</td>
    <td>99.50159570015967</td>
    <td>200.66793330013752</td>
    <td>452.0446125999093</td>
    <td>1100.9856083998457</td>
    <td>❌</td>
    <td>❌</td>
    <td>❌</td>
  </tr>
  <tr>
    <td>xstate</td>
    <td>1.5114331997931003</td>
    <td>5.076700000837445</td>
    <td>9.003429099917412</td>
    <td>26.321991700306533</td>
    <td>47.318245799839495</td>
    <td>92.908674999699</td>
    <td>184.9398877006024</td>
    <td>353.5915873996913</td>
    <td>739.1568584999535</td>
    <td>1552.7339956998826</td>
    <td>3419.594879200682</td>
    <td>8327.197879200055</td>
    <td>22651.708679099753</td>
  </tr>
  <tr>
    <td>effector</td>
    <td>0.45675409957766533</td>
    <td>1.2237749002873897</td>
    <td>1.6501832995563745</td>
    <td>3.2516458999365567</td>
    <td>4.759345900639891</td>
    <td>8.276599999889731</td>
    <td>13.910462499782444</td>
    <td>23.23244180008769</td>
    <td>46.63204999999143</td>
    <td>81.9146542005241</td>
    <td>174.61498729977757</td>
    <td>378.94245009999725</td>
    <td>745.4281083000824</td>
  </tr>
</tbody>
</table>

As you can see from the table, statemanjs shows the best results. Pay close attention to the performance difference between statemanjs and mobx. Both state managers rely on state mutability, but the difference in the implementation of this approach sets them apart. In other words, variability is their only similarity.
When looking at this table, keep in mind that the performance of most state managers will be slower on real projects. For example, Redux currently has only one body, in reality there will be more reducers. On the other hand, Statemanjs scales well in both depth (state size) and width (number of states).
Don't forget that the benchmark was run in the NodeJS environment, everything will be slower in the browser. Also, user devices can be different, which also affects performance.

# **Integrations**

Statemanjs is framework agnostic and can be used without additional packages. But for convenience, there are packages for the most popular frameworks - [react](https://github.com/persevie/statemanjs-react/README.md), [vue](https://github.com/persevie/statemanjs-vue/README.md), [solid](https://github.com/persevie/statemanjs-solid/README.md). Statemanjs supports svelte out of the box and doesn't need any additional packages.
To work with additional packages, the main statemanjs package is required.

# **For contributors**

See [CONTRIBUTING.md](./CONTRIBUTING.md).
