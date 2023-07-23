import { useState, useEffect } from "react";
import type {
    StatemanjsAPI,
    SubscriptionOptions,
    StatemanjsComputedAPI,
} from "../statemanjs/index";

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
    statemanjs: StatemanjsAPI<T> | StatemanjsComputedAPI<T>,
    subscriptionOptions: SubscriptionOptions<T> = {},
): T {
    const [_, forceRender] = useState({});

    useEffect(() => {
        return statemanjs.subscribe(() => {
            forceRender({});
        }, subscriptionOptions);
    }, [statemanjs, subscriptionOptions]);

    return statemanjs.get();
}

export { useStatemanjs };
