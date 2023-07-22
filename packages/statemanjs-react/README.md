Integration for React (functional components style) of statemanjs.

# Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

  - [**API**](#api)
- [**Usage**](#usage)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## **API**

Here is a detailed view of the API:

```ts
/**
 * Make the react component observe the statemanjs.
 * In the options, you can specify information about the observer,
 * as well as specify the condition under which the observer will be notified.
 *
 * @param statemanjs Statemanjs to observe.
 * @param subscriptionOptions Additional information and notification condition.
 * @returns Reactive state.
 */
function useStatemanjs<T>(
  statemanjs: StatemanjsAPI<T>,
  subscriptionOptions?: SubscriptionOptions<T>
): T;
```

# **Usage**

```bash
npm i statemanjs statemanjs-react
```

```jsx
import { createState } from "statemanjs";
import { useStatemanjs } from "statemanjs-react";

const counterState = createState(0);

function Component() {
  const counter = useStatemanjs(counterState);

  const onClick = () => {
    counterState.set(counter + 1);
  };

  return (
    <div>
      <button onClick={onClick}>Click me</button>
      <p>Count of clicks {counter}</p>
    </div>
  );
}
```

---

Thank you and good hacking 🤗
