<p align="center">
<img height="60" alt="Statemanjs logo" src="../../assets/stateman-js-logo-full.png">
</p>

Integration of [statemanjs](https://github.com/persevie/statemanjs#readme) for SolidJS.

```tsx
import { createState } from "@persevie/statemanjs";
import { useStatemanjs } from "@persevie/statemanjs-solid";

const counterState = createState(0);

function App() {
    const count = useStatemanjs(counterState);

    return <p>Count {count}</p>;
}
```

```tsx
import { createState } from "@persevie/statemanjs";
import { useStatemanjs } from "@persevie/statemanjs-solid";

const counterState = createState(0);

function App() {
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

- [**Installation**](#installation)
- [**For contributors**](#for-contributors)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# **Installation**

This integration for Solidjs requires you to install **statemanjs**.

```bash
npm i @persevie/statemanjs @persevie/statemanjs-solid
```

Detailed information about **statemanjs** can be found [here](https://github.com/persevie/statemanjs#readme).

# **For contributors**

See [CONTRIBUTING.md](https://github.com/persevie/statemanjs/blob/main/CONTRIBUTING.md).
