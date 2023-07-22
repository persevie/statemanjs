import {
    StatemanjsAPI,
    StatemanjsBaseAPI,
    StateWrapper,
    SubscriptionCb,
    UnsubscribeCb,
    UpdateCb,
    Subscriber,
    StatemanjsComputedAPI,
    SubscriptionOptions,
    ActionKind,
} from "./entities";
import { formatError, getErrorMessage } from "./helpers";

class _StatemanjsBase<T extends object> implements StatemanjsBaseAPI<T> {
    constructor() {
        // Bindings
        this.handler = this.handler.bind(this);
        this.createProxyHandler = this.createProxyHandler.bind(this);
        this.addSubscriber = this.addSubscriber.bind(this);
        this.generateId = this.generateId.bind(this);
        this.generateSubscriberId = this.generateSubscriberId.bind(this);
        this.isSubscriberActive = this.isSubscriberActive.bind(this);
        this.unsubscribeById = this.unsubscribeById.bind(this);
        this.unsubscribeByIds = this.unsubscribeByIds.bind(this);
        this.allowAccessToState = this.allowAccessToState.bind(this);
        this.denyAccessToState = this.denyAccessToState.bind(this);
        this.getIsAccessToStateAllowed =
            this.getIsAccessToStateAllowed.bind(this);
        this.runActiveSubscribersCb = this.runActiveSubscribersCb.bind(this);
        this.getActiveSubscribersCount =
            this.getActiveSubscribersCount.bind(this);
        this.unsubscribeAll = this.unsubscribeAll.bind(this);
        this.setWasChangedToTrue = this.setWasChangedToTrue.bind(this);
        this.setWasChangedToFalse = this.setWasChangedToFalse.bind(this);
        this.getWasChanged = this.getWasChanged.bind(this);
        this.saveSlots = this.saveSlots.bind(this);
        this.checkAccessKind = this.checkAccessKind.bind(this);
        this.isObject = this.isObject.bind(this);
        this.allowUnwrap = this.allowUnwrap.bind(this);
        this.denyUnwrap = this.denyUnwrap.bind(this);
        this.getIsUnwrapAllowed = this.getIsUnwrapAllowed.bind(this);
        this.addPathToChangedProperty =
            this.addPathToChangedProperty.bind(this);
        this.getPathToChangedProperty =
            this.getPathToChangedProperty.bind(this);
        this.resetPathToChangedProperty =
            this.resetPathToChangedProperty.bind(this);
        this.setAcionKindToSet = this.setAcionKindToSet.bind(this);
        this.setAcionKindToUpdate = this.setAcionKindToUpdate.bind(this);
        this.setAcionKindToNone = this.setAcionKindToNone.bind(this);
    }

    isNeedToCheckProperties = false;

    acionKind: ActionKind = "none";

    /** All active subscribers. */
    activeSubscribers: Subscriber[] = [];

    /** Array of active subscriber IDs  */
    activeSubscriberIds: string[] = [];

    /** Ensures that the state will be changed only using the built-in methods. */
    isAccessToStateAllowed = false;

    /**
     * Is state can be unwrapped.
     * @default false
     * */
    isUnwrapAllowed = false;

    /**
     * Whether the state was changed after calling the state change methods.
     * The state will change only if the new value and the previous value are not equal.
     */
    wasChanged = false;

    /**
     * The use of methods from this list is allowed only inside the update method @see {StatemanjsAPI.update}.
     */
    dangerMethods = [
        "clear", // (Map; Set)
        "delete", // (Map; WeakSet; Set)
        "set", // (Map)
        "add", // (WeakSet; Set)
        "fill", // (Array; TypedArray)
        "reverse", // (Array; TypedArray)
        "sort", // (Array; TypedArray)
        "unscopables", // (Symbol)
        "pop", // (Array)
        "push", // (Array)
        "shift", // (Array)
        "unshift", // (Array)
        "splice", // (Array)
    ];

    pathToChangedProperty: string[] = [];

    addPathToChangedProperty(path: string): void {
        this.pathToChangedProperty.push(path);
    }

    getPathToChangedProperty(): string[] {
        return this.pathToChangedProperty;
    }

    resetPathToChangedProperty(): void {
        this.pathToChangedProperty = [];
    }

    /** The state has been changed. */
    setWasChangedToTrue(): void {
        this.wasChanged = true;
    }

    /** The state hasn't been changed. */
    setWasChangedToFalse(): void {
        this.wasChanged = false;
    }

    /** Getter for @see {StatemanjsBaseAPI.wasChanged} */
    getWasChanged(): boolean {
        return this.wasChanged;
    }

    /**
     * Check passed prop and bind context for using internal slots.
     *
     * Example: Map.set(), Array.push() and etc.
     */
    saveSlots(target: any, prop: any): any {
        return typeof target[prop] == "function"
            ? target[prop].bind(target)
            : target[prop];
    }

    /**
     * Defines the element type and the property type for the element,
     * and also determines the further behavior of the handler.
     * Returns an error if a forbidden method was used
     * or the state element was accessed directly otherwise returns element of state.
     */
    checkAccessKind(target: any, prop: any, path: string[]): any {
        if (typeof target[prop] === "function") {
            // Check danger methods
            if (this.dangerMethods.includes(prop)) {
                if (this.getIsAccessToStateAllowed()) {
                    this.setWasChangedToTrue();
                    const newPath = path.concat(prop);
                    return new Proxy(
                        this.saveSlots(target, prop),
                        this.handler(this, newPath),
                    );
                } else {
                    throw new Error(
                        "Access is denied. Use 'update' method to do this.",
                    );
                }
            } else {
                if (this.getIsUnwrapAllowed()) {
                    return this.saveSlots(target, prop);
                }
                const newPath = path.concat(prop);

                return new Proxy(
                    this.saveSlots(target, prop),
                    this.handler(this, newPath),
                );
            }
        } else if (this.isObject(target[prop]) && target[prop] !== null) {
            if (this.getIsUnwrapAllowed()) {
                return this.saveSlots(target, prop);
            }

            const newPath = path.concat(prop);

            return new Proxy(
                this.saveSlots(target, prop),
                this.handler(this, newPath),
            );
        } else {
            return this.saveSlots(target, prop);
        }
    }

    /** Proxy handler. Intercepts all state actions and checks access status. */
    handler(context: StatemanjsBaseAPI<T>, path: string[]): ProxyHandler<T> {
        return {
            get(target: any, prop: any) {
                return context.checkAccessKind(target, prop, path);
            },
            set(target: any, prop: any, val: any): boolean {
                if (context.getIsAccessToStateAllowed()) {
                    if (target[prop] !== val) {
                        context.setWasChangedToTrue();
                        target[prop] = val;

                        if (
                            context.isNeedToCheckProperties &&
                            context.acionKind === "update"
                        ) {
                            const newPath = path
                                .concat(prop)
                                .filter((i) => i !== "__STATEMANJS_STATE__");
                            const pathString = newPath.join(".");

                            if (pathString.length) {
                                context.addPathToChangedProperty(pathString);
                            }
                        }
                    }

                    return true;
                } else {
                    throw new Error("Access is denied.");
                }
            },
            defineProperty(): boolean {
                throw new Error("Access is denied.");
            },
            deleteProperty(): boolean {
                throw new Error("Access is denied.");
            },
        };
    }

    /**
     * Creates a proxy handler @see {StatemanjsBaseAPI.handler} with needed context.
     * @returns Proxy handler.
     */
    createProxyHandler(): ProxyHandler<T> {
        return this.handler(this, []);
    }

    /**
     * Create the new subscriber active.
     * @param subscriber New subscriber.
     */
    addSubscriber(subscriber: Subscriber): void {
        this.activeSubscribers.push(subscriber);
    }

    /**
     * Generate an ID-string and check it in existing IDs.
     * @param exist array with  existing IDs.
     * @param length generated ID length.
     * @returns generated ID
     */
    generateId(exist: string[], length = 14): string {
        const id = Math.random().toString(36).substring(2, length);
        if (!exist.includes(id)) {
            return id;
        }

        return this.generateId(exist);
    }

    /** Generate an ID-string and check it in active IDs */
    generateSubscriberId(): string {
        const id = this.generateId(this.activeSubscriberIds);
        this.activeSubscriberIds.push(id);

        return id;
    }

    /**
     * Find active subscriber by the passed ID.
     * @param subscriberId ID for search.
     * @returns Exist or no.
     */
    isSubscriberActive(subscriberId: string): boolean {
        return this.activeSubscriberIds.includes(subscriberId);
    }

    /**
     * Unsubscribe active subscriber by ID.
     * @param subscriberId
     */
    unsubscribeById(subscriberId: string): void {
        if (this.isSubscriberActive(subscriberId)) {
            this.activeSubscribers = this.activeSubscribers.filter(
                (i) => i.subId != subscriberId,
            );
            this.activeSubscriberIds = this.activeSubscriberIds.filter(
                (i) => i != subscriberId,
            );
        }
    }

    /**
     * Unsubscribe active subscribers by ID.
     * @param subscriberIds
     */
    unsubscribeByIds(subscriberIds: string[]): void {
        this.activeSubscribers = this.activeSubscribers.filter(
            (i) => !subscriberIds.includes(i.subId),
        );
        this.activeSubscriberIds = this.activeSubscriberIds.filter(
            (i) => !subscriberIds.includes(i),
        );
    }

    /** Allows access to the state. Called while using the built-in @see {StatemanjsAPI} methods. */
    allowAccessToState(): void {
        this.isAccessToStateAllowed = true;
    }

    /** Deny access to the state. Called after using the built-in @see {StatemanjsAPI} methods. */
    denyAccessToState(): void {
        this.isAccessToStateAllowed = false;
    }

    /** Getter for @see {StatemanjsBaseAPI.isAccessToStateAllowed} */
    getIsAccessToStateAllowed(): boolean {
        return this.isAccessToStateAllowed;
    }

    /** Allows unwrap state. Called while using the built-in @see {StatemanjsAPI.unwrap} method. */
    allowUnwrap(): void {
        this.isUnwrapAllowed = true;
    }

    /** Deny unwrap state. Called while using the built-in @see {StatemanjsAPI.unwrap} method. */
    denyUnwrap(): void {
        this.isUnwrapAllowed = false;
    }

    /** Getter for @see {StatemanjsBaseAPI.isUnwrapAllowed} */
    getIsUnwrapAllowed(): boolean {
        return this.isUnwrapAllowed;
    }

    /** Run active subscriber callbacks. */
    runActiveSubscribersCb(): void {
        if (this.activeSubscribers.length > 0) {
            const inactiveSubscribersId: string[] = [];

            this.activeSubscribers.forEach((s) => {
                try {
                    if (s.notifyCondition === undefined) {
                        s.subCb();
                    } else {
                        if (s.notifyCondition()) {
                            s.subCb();
                        }
                    }
                } catch (error) {
                    inactiveSubscribersId.push(s.subId);

                    console.info(
                        `One of you subscriber marked as inactive and was removed. Error message - ${getErrorMessage(
                            error,
                        )}`,
                    );
                }
            });

            if (inactiveSubscribersId.length > 0) {
                this.unsubscribeByIds(inactiveSubscribersId);
            }
        }
    }

    /**
     * Returns count of all active subscribers.
     * @returns count of subscribers.
     */
    getActiveSubscribersCount(): number {
        return this.activeSubscriberIds.length;
    }

    /** Remove all unprotected subscribers */
    unsubscribeAll(): void {
        this.activeSubscribers = this.activeSubscribers.filter(
            (i) => i.isProtected,
        );
        this.activeSubscriberIds = this.activeSubscribers.map((i) => i.subId);
    }

    /** Checks if the element is an object */
    isObject(entity: unknown): boolean {
        return typeof entity === "object";
    }

    setAcionKindToSet(): void {
        this.acionKind = "set";
    }

    setAcionKindToUpdate(): void {
        this.acionKind = "update";
    }

    setAcionKindToNone(): void {
        this.acionKind = "none";
    }

    isAnyPropertyPartOfAnyPath(properties: string[], paths: string[]): boolean {
        for (let i = 0; i < properties.length; i++) {
            for (let j = 0; j < paths.length; j++) {
                if (paths[j].startsWith(properties[i])) {
                    return true;
                }
            }
        }
        return false;
    }
}

function _createStatemanjsBase<T extends object>(): StatemanjsBaseAPI<T> {
    return new _StatemanjsBase<T>();
}

class _Statemanjs<E> implements StatemanjsAPI<E> {
    constructor(element: E) {
        // Bindings
        this.set = this.set.bind(this);
        this.get = this.get.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.unsubscribeAll = this.unsubscribeAll.bind(this);
        this.getActiveSubscribersCount =
            this.getActiveSubscribersCount.bind(this);
        this.update = this.update.bind(this);
        this.unwrap = this.unwrap.bind(this);

        // Composition (using factory func for exclude StatePackBase interface from declaration) for access to common API.
        this.#baseApi = _createStatemanjsBase<StateWrapper<E>>();

        // Wrap and proxy the state
        this.#proxiedState = new Proxy<StateWrapper<E>>(
            { __STATEMANJS_STATE__: element },
            this.#baseApi.createProxyHandler(),
        );
    }

    #baseApi: StatemanjsBaseAPI<StateWrapper<E>>;

    /**
     * The state is in a special wrapper
     * for the possibility of using with a proxy.
     */
    #proxiedState: StateWrapper<E>;

    /**
     * Accepts a new state and compares it with the current one.
     * Nothing will happen if the passed value is equal to the current one.
     * @param newState New state.
     * @returns Status of operation.
     */
    set(newState: E): boolean {
        try {
            this.#baseApi.setAcionKindToSet();
            this.#baseApi.allowAccessToState();
            this.#proxiedState.__STATEMANJS_STATE__ = newState;
            this.#baseApi.denyAccessToState();

            if (!this.#baseApi.getWasChanged()) {
                return false;
            }

            this.#baseApi.setWasChangedToFalse();
            this.#baseApi.runActiveSubscribersCb();
            this.#baseApi.resetPathToChangedProperty();
            this.#baseApi.setAcionKindToNone();

            return true;
        } catch (error) {
            throw new Error(
                formatError(
                    "An error occurred while setting the new state",
                    error,
                ),
            );
        }
    }

    /** Get current state */
    get(): E {
        return this.#proxiedState.__STATEMANJS_STATE__;
    }

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
        subscriptionCb: SubscriptionCb<E>,
        subscriptionOptions: SubscriptionOptions<E> = {},
    ): UnsubscribeCb {
        const subscriberId = this.#baseApi.generateSubscriberId();

        const notifyConditionCb = subscriptionOptions.notifyCondition;

        if (
            subscriptionOptions.properties &&
            subscriptionOptions.properties.length > 0
        ) {
            this.#baseApi.isNeedToCheckProperties = true;
        }

        this.#baseApi.addSubscriber({
            subId: subscriberId,
            subCb: () => subscriptionCb(this.get()),
            notifyCondition: (): boolean => {
                if (subscriptionOptions.properties) {
                    if (!this.#baseApi.isObject(this.unwrap())) {
                        throw new Error(
                            "You can't add properties to track if your state is not an object",
                        );
                    }

                    try {
                        return this.#baseApi.isAnyPropertyPartOfAnyPath(
                            subscriptionOptions.properties as string[],
                            this.#baseApi.getPathToChangedProperty(),
                        );
                    } catch (error) {
                        throw new Error(
                            formatError(
                                "An error occurred when accessing a property from the subscriptionOptions list",
                                error,
                            ),
                        );
                    }
                }

                return (
                    notifyConditionCb === undefined ||
                    notifyConditionCb(this.get())
                );
            },
            isProtected: subscriptionOptions.protect ?? false,
        });

        return (): void => {
            if (
                !subscriptionOptions.properties ||
                subscriptionOptions.properties.length === 0
            ) {
                this.#baseApi.isNeedToCheckProperties = false;
            }

            this.#baseApi.unsubscribeById(subscriberId);
        };
    }

    /** Remove all unprotected subscribers */
    unsubscribeAll(): void {
        this.#baseApi.isNeedToCheckProperties = false;
        this.#baseApi.unsubscribeAll();
    }

    /**
     * Returns count of all active subscribers.
     * @returns number.
     */
    getActiveSubscribersCount(): number {
        return this.#baseApi.getActiveSubscribersCount();
    }

    /**
     * Flexible state update.
     * @param updateCb Callback for state updates.
     */
    update(updateCb: UpdateCb<E>): boolean {
        try {
            this.#baseApi.setAcionKindToUpdate();
            this.#baseApi.allowAccessToState();
            updateCb(this.get());
            this.#baseApi.denyAccessToState();

            if (!this.#baseApi.getWasChanged()) {
                return false;
            }

            this.#baseApi.setWasChangedToFalse();
            this.#baseApi.runActiveSubscribersCb();
            this.#baseApi.resetPathToChangedProperty();
            this.#baseApi.setAcionKindToNone();

            return true;
        } catch (error) {
            throw new Error(
                formatError("An error occurred while update the state", error),
            );
        }
    }

    /**
     * Unwrap a proxy object to a regular JavaScript object
     * @returns unwrapped state
     */
    unwrap(): E {
        this.#baseApi.allowUnwrap();
        const unwrapped = this.get();
        this.#baseApi.denyUnwrap();

        return unwrapped;
    }

    /**
     * Dispatch an async action
     * @param action An async action. It accepts a stateManager object,
     * which is used to access the current state.
     * @returns Promise.
     */
    async asyncAction(
        action: (stateManager: StatemanjsAPI<E>) => Promise<void>,
    ): Promise<void> {
        try {
            await action(this);
        } catch (error) {
            throw new Error(
                `An error occurred while dispatching the async action: ${
                    (error as Error).message
                }`,
            );
        }
    }

    /**
     * Create a computed state for a state property.
     * @param selectorFn A function that returns a value of a state property.
     * @returns A computed state.
     */
    createSelector<T>(selectorFn: (state: E) => T): StatemanjsComputedAPI<T> {
        const selector = (): T => selectorFn(this.get());
        return createComputedState<T>(selector, [this]);
    }
}

class _StatemanjsComputed<T> implements StatemanjsComputedAPI<T> {
    constructor(
        callback: () => T,
        deps: (StatemanjsAPI<any> | StatemanjsComputedAPI<any>)[],
    ) {
        if (!deps.length) {
            throw new Error("");
        }

        this.#statemanjs = new _Statemanjs<T>(callback());

        for (const d of deps) {
            d.subscribe(
                (): void => {
                    this.#statemanjs.set(callback());
                },
                { protect: true },
            );
        }

        // Bindings
        this.get = this.get.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.unsubscribeAll = this.unsubscribeAll.bind(this);
        this.getActiveSubscribersCount =
            this.getActiveSubscribersCount.bind(this);
        this.unwrap = this.unwrap.bind(this);
    }

    #statemanjs: StatemanjsAPI<T>;

    /** Get current state */
    get(): T {
        return this.#statemanjs.get();
    }

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
        subscriptionOptions?: SubscriptionOptions<T> | undefined,
    ): UnsubscribeCb {
        return this.#statemanjs.subscribe(subscriptionCb, subscriptionOptions);
    }

    /** Remove all unprotected subscribers */
    unsubscribeAll(): void {
        this.#statemanjs.unsubscribeAll();
    }

    /**
     * Returns count of all active subscribers.
     * @returns number.
     */
    getActiveSubscribersCount(): number {
        return this.#statemanjs.getActiveSubscribersCount();
    }

    /**
     * Unwrap a proxy object to a regular JavaScript object
     * @returns unwrapped state
     */
    unwrap(): T {
        return this.#statemanjs.unwrap();
    }
}

export function createState<T>(element: T): StatemanjsAPI<T> {
    return new _Statemanjs(element);
}

export function createComputedState<T>(
    callback: () => T,
    deps: StatemanjsAPI<any>[],
): StatemanjsComputedAPI<T> {
    return new _StatemanjsComputed<T>(callback, deps);
}