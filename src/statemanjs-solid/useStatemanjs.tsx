import { createSignal, onCleanup, onMount, Accessor } from "solid-js";
import type {
    StatemanjsAPI,
    StatemanjsComputedAPI,
    SubscriptionOptions,
} from "../statemanjs/index";

/**
 * Make the solid component observe the statemanjs.
 * In the options, you can specify information about the observer,
 * as well as specify the condition under which the observer will be notified.
 *
 * @param statemanjs Statemanjs to observe.
 * @param subscriptionOptions Additional information and notification condition.
 * @returns Reactive state.
 */
function useStatemanjs<T>(
    statemanjs: StatemanjsAPI<T> | StatemanjsComputedAPI<T>,
    subscriptionOptions: SubscriptionOptions<T> = {},
): Accessor<T> {
    const [solidedState, setSolidedState] = createSignal(statemanjs.get(), {
        equals: false,
    });

    let unsubscriber: () => void;

    onMount(() => {
        unsubscriber = statemanjs.subscribe((s) => {
            setSolidedState(() => s);
        }, subscriptionOptions);
    });

    onCleanup(() => unsubscriber());

    return solidedState;
}

export { useStatemanjs };
