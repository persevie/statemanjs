/* eslint-disable @typescript-eslint/no-explicit-any */
import { ActionKind, Subscriber, StateWrapper } from "../entities";

/**
 * Private, base API for statemanjs.
 * In addition to the methods, it stores the entities necessary for the 'statemanjs' to work.
 */
export interface StatemanjsBaseAPI<T> {
    /**
     * Automatically updated;
     * if at least one subscriber has a property to watch - true, otherwise - false.
     */
    isNeedToCheckProperties: boolean;

    actionKind: ActionKind;

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

    /**
     * The state is in a special wrapper
     * for the possibility of using with a proxy.
     */
    proxiedState: StateWrapper<T>;

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
    handler(
        context: StatemanjsBaseAPI<T>,
        path: string[],
    ): ProxyHandler<StateWrapper<T>>;

    /**
     * Creates a proxy handler @see {StatemanjsBaseAPI.handler} with needed context.
     * @returns Proxy handler.
     */
    createProxyHandler(): ProxyHandler<StateWrapper<T>>;

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
