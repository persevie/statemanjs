import {
    SubscriptionCb,
    SubscriptionOptions,
    UnsubscribeCb,
    UpdateCb,
    UpdateOptions,
    SetOptions,
} from "../shared/entities";
import { DebugAPI } from "./debugAPI";
import { StatemanjsComputedAPI } from "./statemanjsComputedAPI";

/**
 * Public API.
 * Interacts with the @see {StatemanjsBaseAPI}.
 */
export interface StatemanjsAPI<T> {
    /**
     * Accepts a new state and compares it with the current one.
     * Nothing will happen if the passed value is equal to the current one.
     * @param newState New state.
     * @returns Status of operation.
     */
    set(newState: T, options?: SetOptions<T>): boolean;

    /** Get current state */
    get(): T;

    /**
     * The method of subscribing to the status change.
     * Accepts a callback function (subscription callback),
     * which will be called at each update, and a subscription options object.
     * In the options, you can specify information about the subscription,
     * as well as specify the condition under which the subscriber will be notified
     * and mark the subscriber as protected. All subscribers are unprotected by default.
     * Protected subscribers can only be unsubscribed using the unsubscribe method returned by this method.
     * Returns the unsubscribe callback function.
     *
     * @param subscriptionCb A function that runs on every update.
     * @param subscriptionOptions Additional information and notification condition.
     * @returns Unsubscribe callback function.
     */
    subscribe(
        subscriptionCb: SubscriptionCb<T>,
        subscriptionOptions?: SubscriptionOptions<T>,
    ): UnsubscribeCb;

    /** Remove all unprotected subscribers */
    unsubscribeAll(): void;

    /**
     * Returns count of all active subscribers.
     * @returns number.
     */
    getActiveSubscribersCount(): number;

    /**
     * Flexible state update.
     * @param updateCb Callback for state updates.
     */
    update(updateCb: UpdateCb<T>, options?: UpdateOptions<T>): boolean;

    /**
     * Unwrap a proxy object to a regular JavaScript object
     * @returns unwrapped state
     */
    unwrap(): T;

    /**
     * Dispatch an async action
     * @param action An async action. It accepts a stateManager object,
     * which is used to access the current state.
     * @returns Promise.
     */
    asyncAction(
        action: (stateManager: StatemanjsAPI<T>) => Promise<void>,
    ): Promise<void>;

    /**
     * Create a computed state for a state property.
     * @param selectorFn A function that returns a value of a state property.
     * @returns A computed state.
     */
    createSelector<E>(
        selectorFn: (state: T) => E,
        subscriptionOptions?: SubscriptionOptions<unknown>,
    ): StatemanjsComputedAPI<E>;

    /**
     * Debug API. Allows you to use additional debugging functionality such as transactions.
     * Parameters are set when creating the state.
     * @see {DebugAPI}
     */
    DEBUG?: DebugAPI<T>;
}
