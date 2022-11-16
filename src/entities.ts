/** Wrapper for the ability to save entities other than an object or array. */
export type StateWrapper<T> = { __STATEMANJS_STATE__: T };

/**
 * Subscriber object for internal use.
 */
export type Subscriber = {
    subId: string;
    subCb: () => void;
    /**
     * To determine whether subscribers need to be notified of a status change.
     * For internal use.
     */
    notifyCondition?: () => unknown;
};

/**
 * A callback function that will be called every time the state changes.
 * Can take the updated state as an argument.
 */
export type SubscriptionCb<T> = (newState: T) => void;

/**
 * A callback function for unsubscribing.
 */
export type UnsubscribeCb = () => void;

/** Callback for state updates. */
export type UpdateCb<T> = (state: T) => void;

/**
 * It may contain additional information about the subscriber,
 * as well as a condition for notification.
 */
export type SubscriptionOptions<T> = {
    notifyCondition?: (state: T) => unknown;
};

/**
 * Private, base API for statemanjs.
 * In addition to the methods, it stores the entities necessary for the 'statemanjs' to work.
 */
export interface StatemanjsBaseAPI<T extends object> {
    /** All active subscribers. */
    activeSubscribers: Subscriber[];

    /** Array of active subscriber IDs  */
    activeSubscriberIds: string[];

    /** Ensures that the state will be changed only using the built-in methods. */
    isAccessToStateAllowed: boolean;

    /**
     * Whether the state was changed after calling the state change methods.
     * The state will change only if the new value and the previous value are not equal.
     */
    wasChanged: boolean;

    /**
     * The use of methods from this list is allowed only inside the update method @see {StatemanjsAPI.update}.
     */
    dangerMethods: string[];

    /** The state has been changed. */
    setWasChangedToTrue(): void;

    /** The state hasn't been changed. */
    setWasChangedToFalse(): void;

    /** Getter for @see {StatemanjsBaseAPI.wasChanged} */
    getWasChanged(): boolean;

    /**
     * Check passed prop and bind context for using internal slots.
     *
     * Example: Map.set(), Array.push() and etc.
     */
    saveSlots(target: any, prop: any): any;

    /**
     * Defines the element type and the property type for the element,
     * and also determines the further behavior of the handler.
     * Returns an error if a forbidden method was used
     * or the state element was accessed directly otherwise returns element of state.
     */
    checkAccessKind(target: any, prop: any): any;

    /** Proxy handler. Intercepts all state actions and checks access status. */
    handler(context: StatemanjsBaseAPI<T>): ProxyHandler<T>;

    /**
     * Creates a proxy handler @see {StatemanjsBaseAPI.handler} with needed context.
     * @returns Proxy handler.
     */
    createProxyHandler(): ProxyHandler<T>;

    /**
     * Create the new subscriber active.
     * @param subscriber New subscriber.
     */
    addSubscriber(subscriber: Subscriber): void;

    /**
     * Generate an ID-string and check it in existing IDs.
     * @param exist array with  existing IDs.
     * @param length generated ID length.
     * @returns generated ID
     */
    generateId(exist: string[], length: number): string;

    /** Generate an ID-string and check it in active IDs */
    generateSubscriberId(): string;

    /**
     * Find active subscriber by the passed ID.
     * @param subscriberId ID for search.
     * @returns Exist or no.
     */
    isSubscriberActive(subscriberId: string): boolean;

    /**
     * Unsubscribe active subscriber by ID.
     * @param subscriberId
     */
    unsubscribeById(subscriberId: string): void;

    /**
     * Unsubscribe active subscribers by ID.
     * @param subscriberIds
     */
    unsubscribeByIds(subscriberIds: string[]): void;

    /** Allows access to the state. Called while using the built-in @see {StatemanjsAPI} methods. */
    allowAccessToState(): void;

    /** Deny access to the state. Called after using the built-in @see {StatemanjsAPI} methods. */
    denyAccessToState(): void;

    /** Getter for @see {StatemanjsBaseAPI.isAccessToStateAllowed} */
    getIsAccessToStateAllowed(): boolean;

    /** Run active subscriber callbacks. */
    runActiveSubscribersCb(): void;

    /**
     * Returns count of all active subscribers.
     * @returns count of subscribers.
     */
    getActiveSubscribersCount(): number;

    /** Remove all subscribers */
    unsubscribeAll(): void;
}

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
    set(newState: T): boolean;

    /** Get current state */
    get(): T;

    /**
     * State change subscription method.
     * Accepts the callback function (subscription callback),
     * which will be called on each update, and the subscription parameter object.
     * In the options, you can specify information about the subscription,
     * as well as specify the condition under which the subscriber will be notified.
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

    /** Remove all subscribers */
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
    update(updateCb: UpdateCb<T>): void;
}
