import {
    SubscriptionCb,
    SubscriptionOptions,
    UnsubscribeCb,
} from "../entities";

export interface StatemanjsComputedAPI<T> {
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
     * Unwrap a proxy object to a regular JavaScript object
     * @returns unwrapped state
     */
    unwrap(): T;
}
