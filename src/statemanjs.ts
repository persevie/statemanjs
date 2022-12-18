import {
    StatemanjsAPI,
    StatemanjsBaseAPI,
    StateWrapper,
    SubscriptionCb,
    UnsubscribeCb,
    UpdateCb,
    Subscriber,
    SubscriptionOptions,
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
    }

    /** All active subscribers. */
    activeSubscribers: Subscriber[] = [];

    /** Array of active subscriber IDs  */
    activeSubscriberIds: string[] = [];

    /** Ensures that the state will be changed only using the built-in methods. */
    isAccessToStateAllowed = false;

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
    checkAccessKind(target: any, prop: any): any {
        if (typeof target[prop] === "function") {
            // Check danger methods
            if (this.dangerMethods.includes(prop)) {
                if (this.getIsAccessToStateAllowed()) {
                    this.setWasChangedToTrue();
                    return new Proxy(
                        this.saveSlots(target, prop),
                        this.handler(this),
                    );
                } else {
                    throw new Error(
                        "Access is denied. Use 'update' method to do this.",
                    );
                }
            } else {
                return new Proxy(
                    this.saveSlots(target, prop),
                    this.handler(this),
                );
            }
        } else if (this.isObject(target[prop]) && target[prop] !== null) {
            return new Proxy(this.saveSlots(target, prop), this.handler(this));
        } else {
            return this.saveSlots(target, prop);
        }
    }

    /** Proxy handler. Intercepts all state actions and checks access status. */
    handler(context: StatemanjsBaseAPI<T>): ProxyHandler<T> {
        return {
            get(target: any, prop: any) {
                return context.checkAccessKind(target, prop);
            },
            set(target: any, prop: any, val: any): boolean {
                if (context.getIsAccessToStateAllowed()) {
                    if (target[prop] != val) {
                        context.setWasChangedToTrue();
                        target[prop] = val;
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
        return this.handler(this);
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

    /** Remove all subscribers */
    unsubscribeAll(): void {
        this.activeSubscriberIds = [];
    }

    /** Checks if the element is an object */
    isObject(entity: unknown): boolean {
        return typeof entity === "object";
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
            this.#baseApi.allowAccessToState();
            this.#proxiedState.__STATEMANJS_STATE__ = newState;
            this.#baseApi.denyAccessToState();

            if (!this.#baseApi.getWasChanged()) {
                return false;
            }

            this.#baseApi.setWasChangedToFalse();
            this.#baseApi.runActiveSubscribersCb();
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
     * as well as specify the condition under which the subscriber will be notified.
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

        this.#baseApi.addSubscriber({
            subId: subscriberId,
            subCb: () => subscriptionCb(this.get()),
            notifyCondition:
                notifyConditionCb !== undefined
                    ? () => notifyConditionCb(this.get())
                    : undefined,
        });

        return (): void => this.#baseApi.unsubscribeById(subscriberId);
    }

    /** Remove all subscribers */
    unsubscribeAll(): void {
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
            this.#baseApi.allowAccessToState();
            updateCb(this.get());
            this.#baseApi.denyAccessToState();

            if (!this.#baseApi.getWasChanged()) {
                return false;
            }

            this.#baseApi.setWasChangedToFalse();
            this.#baseApi.runActiveSubscribersCb();
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
        const _unwrap = (obj: any): Record<string, any> => {
            if (!obj || !this.#baseApi.isObject(obj)) {
                return obj;
            }

            if (Object.prototype.toString.call(obj) === "[object Proxy]") {
                return _unwrap(obj.target);
            }

            const result: Record<string, any> = {};
            for (const key in obj) {
                result[key] = _unwrap(obj[key]);
            }
            return result;
        };

        return (_unwrap(this.#proxiedState) as StateWrapper<E>)
            .__STATEMANJS_STATE__;
    }
}

function createState<T>(element: T): StatemanjsAPI<T> {
    return new _Statemanjs(element);
}

export default createState;
