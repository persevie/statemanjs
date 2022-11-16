<p align="center">
<img height="60" alt="Statemanjs logo" src="./assets/stateman-js-logo-full.png">
</p>

```tsx
import { createState } from "@persevie/statemanjs";
import { useStatemanjs } from "@persevie/statemanjs-react";

const counterState = createState(0);

function App() {
    const count = useStatemanjs(counterState);

    return <p>Count {count}</p>;
}
```

```tsx
import { createState } from "@persevie/statemanjs";
import { useStatemanjs } from "@persevie/statemanjs-react";

const counterState = createState(0);

function App(): JSX.Element {
    const evenCount = useStatemanjs(countState, {
        notifyCondition: (state) => state == 0 || state % 2 == 0,
    });

    const onClick = (): void => {
        countState.set(countState.get() + 1);
    };

    return (
        <>
            <p>Count {evenCount}</p>
            <button onClick={onClick}>Inc</button>
        </>
    );
}
```

# Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [**Installing**](#installing)
- [**For contributors**](#for-contributors)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# **Installing**

This integration for React requires you to install **statemanjs**.

```bash
npm i @persevie/statemanjs @persevie/statemanjs-react
```

Detailed information about **statemanjs** can be found [here](https://github.com/persevie/statemanjs#readme).

# **For contributors**

See [CONTRIBUTING.md](./CONTRIBUTING.md).
