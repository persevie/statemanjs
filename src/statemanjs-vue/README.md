<p align="center">
<img height="60" alt="Statemanjs logo" src="../../assets/stateman-js-logo-full.png">
</p>

Integration of [statemanjs](https://github.com/persevie/statemanjs#readme) for Vue.

```html
<script>
    import { createState } from "@persevie/statemanjs";
    import { useStatemanjs } from "@persevie/statemanjs-vue";

    const counterState = createState(0);

    export default {
        setup() {
            const count = useStatemanjs(counterState);

            return {
                count,
            };
        },
        methods: {
            increment() {
                counterState.set(counterState.get() + 1);
            },
        },
    };
</script>

<template>
    <button v-on:click="increment">Click me</button>
    <p>Count {{ counter }}</p>
</template>
```

```html
<script>
    import { createState } from "@persevie/statemanjs";
    import { useStatemanjs } from "@persevie/statemanjs-vue";

    const counterState = createState(0);

    export default {
        setup() {
            const count = useStatemanjs(counterState, {
                notifyCondition: (state) => state == 0 || state % 2 == 0,
            });

            return {
                count,
            };
        },
        methods: {
            increment() {
                counterState.set(counterState.get() + 1);
            },
        },
    };
</script>

<template>
    <button v-on:click="increment">Click me</button>
    <p>Count {{ counter }}</p>
</template>
```

# Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

-   [**Installation**](#installation)
-   [**For contributors**](#for-contributors)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# **Installation**

This integration for Vue requires you to install **statemanjs**.

```bash
npm i @persevie/statemanjs @persevie/statemanjs-vue
```

Detailed information about **statemanjs** can be found [here](https://github.com/persevie/statemanjs#readme).

# **For contributors**

See [CONTRIBUTING.md](https://github.com/persevie/statemanjs/blob/main/CONTRIBUTING.md).
