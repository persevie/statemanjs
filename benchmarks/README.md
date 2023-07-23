# Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [**Structure and usage**](#structure-and-usage)
- [**Cases review**](#cases-review)
  - [**Fill**](#fill)
- [**Contribute**](#contribute)
- [Contributing](#contributing)
  - [For new case](#for-new-case)
  - [For new candidates](#for-new-candidates)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# **Structure and usage**

A short guide on how it all works will help you not only run benchmark but also add your own case.

The `candidates` folder contains the store (state) implementation of the tested state managers, which will be used in all benchmarks.

The `cases` folder contains test variants.

The `scripts` folder contains the scripts for running the cases. Note that `candidates` and `cases` should be independent and used only in the launch script. For convenience, next to the `mjs` script is the `sh` script. It is needed to run a particular case for all candidates.
`<case_name>.mjs` is a cli-like that processes the passed parameters and, depending on them, runs the case for any of the candidates.

The results of the case execution are written to `results/<CASE_NAME>.json`.

# **Cases review**

## **Fill**

One by one adds `n` elements to the array `x` times. Where `n` is a number from the array of numbers [1, 10, 100, 1000, 10000, 100000, 1000000, 2000000, 5000000, 10000000,
50000000] ([countOfElements](./cases/shared.mjs)), and `x` is the number of iterations (1 by default). If `n = 5; x = 2`, that means to add `5` elements `2` times. The `element` is an object `{foo: "bar", baz: "qux"}`. Between iterations the storage is reset (empty array).
The average value for iterations is calculated and written as the result.

Think of this case as a TODO list with a simple structure, e.g. `{title: string, notes: string}`.

# **Contribute**

# Contributing

In additional to [main rules](https://github.com/persevie/statemanjs/blob/main/CONTRIBUTING.md), there are a few things you need to know.

## For new case

-   Keep layers isolated (`candidates`, `cases`)
-   Add a `sh` script next to `mjs` script
-   Adapt the new case for all existing candidates or leave a message in the PR as to why you don't.

## For new candidates

-   Test the new candidate in all cases
