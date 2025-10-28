import { createState, createComputedState } from "../src/statemanjs/index";

/**
 * Simple runtime check that StatemanJS avoids the classic "diamond" recomputation problem
 * (the bottom computed value must be emitted exactly once per base update).
 */
function assert(condition: unknown, message: string): void {
    if (!condition) {
        console.error(`❌ ${message}`);
        process.exit(1);
    }
}

const base = createState({ value: 0 });

let midLeftComputeCount = 0;
const midLeft = createComputedState(() => {
    midLeftComputeCount += 1;
    return base.get().value + 1;
}, [base]);

let midRightComputeCount = 0;
const midRight = createComputedState(() => {
    midRightComputeCount += 1;
    return base.get().value * 2;
}, [base]);

let bottomComputeCount = 0;
const bottom = createComputedState(() => {
    bottomComputeCount += 1;
    return midLeft.get() + midRight.get();
}, [midLeft, midRight]);

// Trigger initial lazy computation before subscribing.
const initialValue = bottom.get();
assert(initialValue === 1, "Initial computed value mismatch");
assert(
    midLeftComputeCount === 1,
    "midLeft should compute exactly once during initial read",
);
assert(
    midRightComputeCount === 1,
    "midRight should compute exactly once during initial read",
);
assert(
    bottomComputeCount === 1,
    "bottom should compute exactly once during initial read",
);

let bottomSubscriptionCalls = 0;
let lastSubscriptionValue: number | undefined;
const unsubscribe = bottom.subscribe((nextValue) => {
    bottomSubscriptionCalls += 1;
    lastSubscriptionValue = nextValue;
});

const baselineLeft = midLeftComputeCount;
const baselineRight = midRightComputeCount;
const baselineBottom = bottomComputeCount;

const updated = base.update((draft) => {
    draft.value += 1;
});
assert(updated, "Base state should report an update");

assert(
    lastSubscriptionValue === 4,
    `Subscription observed ${lastSubscriptionValue}, expected 4`,
);
assert(
    midLeftComputeCount === baselineLeft + 1,
    `midLeft recomputed ${midLeftComputeCount} times, expected ${baselineLeft + 1}`,
);
assert(
    midRightComputeCount === baselineRight + 1,
    `midRight recomputed ${midRightComputeCount} times, expected ${baselineRight + 1}`,
);
assert(
    bottomComputeCount === baselineBottom + 1,
    `bottom recomputed ${bottomComputeCount} times, expected ${baselineBottom + 1}`,
);
assert(
    bottomSubscriptionCalls === 1,
    `bottom subscription called ${bottomSubscriptionCalls} times, expected 1`,
);

const expectedBottomValue = bottom.get();
assert(expectedBottomValue === 4, "Computed value after update mismatch");
assert(
    bottomComputeCount === baselineBottom + 1,
    "Additional get() should not trigger recomputation",
);

unsubscribe();

console.log(
    "✅ Diamond dependency test passed: no redundant recomputations detected.",
);
