import {
    CustomComparator,
    DefaultComparator,
    BaseSetOptions,
    SubscriptionCb,
    SubscriptionOptions,
    UnsubscribeCb,
    UpdateCb,
    BaseUpdateOptions,
} from "../entities";

/**
 * Private, base API for statemanjs.
 * In addition to the methods, it stores the entities necessary for the 'statemanjs' to work.
 */
export interface StatemanjsBaseAPI<T> {
    /**
     * A custom comparator function to compare states.
     * If defined, it will be used instead of the default comparator.
     */
    customComparator: CustomComparator<T> | undefined;

    /**
     * The default comparator function used to compare states if no custom comparator is provided.
     */
    defaultComparator: DefaultComparator;

    /**
     * Retrieves the current state.
     *
     * @returns {T} The current state.
     */
    get(): T;

    /**
     * Sets a new state and optionally triggers updates to subscribers.
     *
     * @param {T} newState - The new state to set.
     * @param {BaseSetOptions<T>} options - Options for setting the state.
     * @returns {boolean} Returns true if the state was updated, false otherwise.
     */
    set(newState: T, options: BaseSetOptions<T>): boolean;

    /**
     * Updates the current state using a callback function and optionally triggers updates to subscribers.
     *
     * @param {UpdateCb<T>} updateCb - A callback function that receives the current state and returns the updated state.
     * @param {BaseUpdateOptions<T>} options - Options for updating the state.
     * @returns {boolean} Returns true if the state was updated, false otherwise.
     */
    update(updateCb: UpdateCb<T>, options: BaseUpdateOptions<T>): boolean;

    /**
     * Subscribes to state changes with a callback function.
     *
     * @param {SubscriptionCb<T>} subscriptionCb - The callback function to invoke on state changes.
     * @param {SubscriptionOptions<T>} subscriptionOptions - Options for the subscription.
     * @returns {UnsubscribeCb} A function that can be called to unsubscribe from state changes.
     */
    subscribe(
        subscriptionCb: SubscriptionCb<T>,
        subscriptionOptions: SubscriptionOptions<T>,
    ): UnsubscribeCb;

    /**
     * Unsubscribes a subscriber using its unique identifier.
     *
     * @param {symbol} subscriberId - The unique identifier of the subscriber to unsubscribe.
     */
    unsubscribeById(subscriberId: symbol): void;

    /**
     * Unsubscribes multiple subscribers using their unique identifiers.
     *
     * @param {symbol[]} subscriberIds - An array of unique identifiers of subscribers to unsubscribe.
     */
    unsubscribeByIds(subscriberIds: symbol[]): void;

    /**
     * Gets the count of currently active subscribers.
     *
     * @returns {number} The number of active subscribers.
     */
    getActiveSubscribersCount(): number;

    /**
     * Unsubscribes all subscribers.
     */
    unsubscribeAll(): void;

    /**
     * Unwraps and retrieves the current state.
     *
     * @returns {T} The unwrapped current state.
     */
    unwrap(): T;

    /**
     * Gets the path to the property that changed during the last state update.
     *
     * @returns {string[]} An array representing the path to the changed property.
     */
    getPathToChangedProperty(): string[];
}
