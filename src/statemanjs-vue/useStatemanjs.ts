/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCurrentScope, onScopeDispose, ShallowRef, shallowRef } from "vue";
import type {
    StatemanjsAPI,
    StatemanjsComputedAPI,
    SubscriptionOptions,
} from "../statemanjs/index";

/**
 * Make the vue component observe the statemanjs.
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
): ShallowRef<T> {
    const state = shallowRef();
    state.value = statemanjs.get();

    if (getCurrentScope()) {
        const unsubscribe = statemanjs.subscribe((value) => {
            state.value = value;
        }, subscriptionOptions as any);

        onScopeDispose(unsubscribe);
    }

    return state;
}

export { useStatemanjs };
