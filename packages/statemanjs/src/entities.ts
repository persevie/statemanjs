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
    notifyCondition?: () => boolean;
    isProtected: boolean;
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
 * as well as a condition for notification, a mark that the subscriber is protected and properties to watch.
 */
export type SubscriptionOptions<T> = {
    notifyCondition?: (state: T) => boolean;
    protect?: boolean;
    properties?: Array<string>;
};

export type ActionKind = "update" | "set" | "none";

/**
 * Private, base API for statemanjs.
 * In addition to the methods, it stores the entities necessary for the 'statemanjs' to work.
 */
export interface StatemanjsBaseAPI<T extends object> {
    /**
     * Automatically updated;
     * if at least one subscriber has a property to watch - true, otherwise - false.
     */
    isNeedToCheckProperties: boolean;

    acionKind: ActionKind;

    /** All active subscribers. */
    activeSubscribers: Subscriber[];

    /** Array of active subscriber IDs  */
    activeSubscriberIds: string[];

    /** Ensures that the state will be changed only using the built-in methods. */
    isAccessToStateAllowed: boolean;

    /**
     * Is state can be unwrapped.
     * @default false
     * */
    isUnwrapAllowed: boolean;

    /**
     * Whether the state was changed after calling the state change methods.
     * The state will change only if the new value and the previous value are not equal.
     */
    wasChanged: boolean;

    /**
     * The use of methods from this list is allowed only inside the update method @see {StatemanjsAPI.update}.
     */
    dangerMethods: string[];

    pathToChangedProperty: string[];

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
    checkAccessKind(target: any, prop: any, path: string[]): any;

    /** Proxy handler. Intercepts all state actions and checks access status. */
    handler(context: StatemanjsBaseAPI<T>, path: string[]): ProxyHandler<T>;

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

    /** Allows unwrap state. Called while using the built-in @see {StatemanjsAPI.unwrap} method. */
    allowUnwrap(): void;

    /** Deny unwrap state. Called while using the built-in @see {StatemanjsAPI.unwrap} method. */
    denyUnwrap(): void;

    /** Getter for @see {StatemanjsBaseAPI.isUnwrapAllowed} */
    getIsUnwrapAllowed(): boolean;

    /** Run active subscriber callbacks. */
    runActiveSubscribersCb(): void;

    /**
     * Returns count of all active subscribers.
     * @returns count of subscribers.
     */
    getActiveSubscribersCount(): number;

    /** Remove all unprotected subscribers */
    unsubscribeAll(): void;

    /** Checks if the element is an object */
    isObject(entity: unknown): boolean;

    /** Adds a path to the changed property. */
    addPathToChangedProperty(path: string): void;

    getPathToChangedProperty(): string[];

    /** Removes all paths from the changed property.  */
    resetPathToChangedProperty(): void;

    setAcionKindToSet(): void;

    setAcionKindToUpdate(): void;

    setAcionKindToNone(): void;

    /** Checks if the passed properties are part of any path. */
    isAnyPropertyPartOfAnyPath(properties: string[], paths: string[]): boolean;
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
    update(updateCb: UpdateCb<T>, currentState?: T): void;

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
    createSelector<E>(selectorFn: (state: T) => E): StatemanjsComputedAPI<E>;
}

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
