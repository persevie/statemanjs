/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatemanjsBaseAPI } from "../api/statemanjsBaseAPI";
import {
    StatemanjsStateWrapper,
    ActionKind,
    Subscriber,
    UpdateCb,
    SubscriptionCb,
    SubscriptionOptions,
    UnsubscribeCb,
    CustomComparator,
    DefaultComparator,
    BaseSetOptions,
} from "../entities";
import { formatError, getErrorMessage } from "../utility";

export class StatemanjsBaseService<T> implements StatemanjsBaseAPI<T> {
    /**
     * The proxied state object, wrapped to intercept access and modifications.
     * This is the core state being managed by Statemanjs.
     */
    #proxiedState: StatemanjsStateWrapper<T>;

    /**
     * A map of active subscribers identified by a unique symbol.
     */
    #activeSubscribers: Record<symbol, Subscriber> = {};

    /**
     * Indicates if properties should be checked for changes.
     */
    #isNeedToCheckProperties = false;

    /**
     * The kind of action currently being performed (e.g., 'set' or 'update').
     */
    #actionKind: ActionKind = "none";

    /**
     * Controls whether access to the state is allowed. Prevents unauthorized access.
     */
    #isAccessToStateAllowed = false;

    /**
     * Controls whether the state can be unwrapped, which might bypass proxies.
     */
    #isUnwrapAllowed = false;

    /**
     * Flag indicating whether any part of the state was changed during the last operation.
     */
    #wasChanged = false;

    /**
     * Stores the path to the property that was changed in the state.
     */
    #pathToChangedProperty: Set<string> = new Set();

    /**
     * If set to true, skips state comparison during updates.
     */
    #skipComparison = false;

    /**
     * Cache for storing previously created proxies for properties in the state.
     */
    #proxyCache: Map<string, any>;

    /**
     * Set of method names considered dangerous, which should be guarded during state modifications.
     */
    readonly #dangerMethods: Set<string> = new Set([
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
    ]);

    readonly customComparator: CustomComparator<T> | undefined;

    readonly defaultComparator: DefaultComparator;

    constructor(
        element: T,
        options: {
            customComparator?: CustomComparator<T>;
            defaultComparator?: DefaultComparator;
        },
    ) {
        // Bindings
        this.get = this.get.bind(this);
        this.set = this.set.bind(this);
        this.update = this.update.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.unsubscribeById = this.unsubscribeById.bind(this);
        this.unsubscribeByIds = this.unsubscribeByIds.bind(this);
        this.getActiveSubscribersCount =
            this.getActiveSubscribersCount.bind(this);
        this.unsubscribeAll = this.unsubscribeAll.bind(this);
        this.unwrap = this.unwrap.bind(this);
        this.getPathToChangedProperty =
            this.getPathToChangedProperty.bind(this);

        // Initialize custom comparator
        this.customComparator = options.customComparator;

        // Initialize default comparator
        this.defaultComparator = options.defaultComparator || "ref";

        // Initialize cache for proxies
        this.#proxyCache = new Map();

        // Wrap and proxy the state
        this.#proxiedState = new Proxy<StatemanjsStateWrapper<T>>(
            { __STATEMANJS_STATE__: element } as StatemanjsStateWrapper<T>,
            this.#createHandler([]),
        );
    }

    #isPrimitive(value: unknown): boolean {
        return (
            value === null ||
            typeof value === "undefined" ||
            typeof value === "boolean" ||
            typeof value === "number" ||
            typeof value === "string" ||
            typeof value === "symbol" ||
            typeof value === "bigint"
        );
    }

    #addPathToChangedProperty(path: string): void {
        this.#pathToChangedProperty.add(path);
    }

    #resetPathToChangedProperty(): void {
        this.#pathToChangedProperty = new Set();
    }

    /**
     * Saves the slot of a target property, binding functions if necessary.
     *
     * @param {any} target - The target object.
     * @param {any} prop - The property to be accessed.
     * @returns {any} The value of the target's property, bound if it's a function.
     */
    #saveSlots(target: any, prop: any): any {
        return target && typeof target[prop] == "function"
            ? target[prop].bind(target)
            : target[prop];
    }

    /**
     * Converts a property path array to a dot-separated string.
     *
     * @param {(string | symbol)[]} path - The array of path segments.
     * @returns {string} The stringified path.
     */
    #stringifyPath(path: (string | symbol)[]): string {
        let result = "";

        for (let i = 0; i < path.length; i++) {
            const p = path[i];
            result += typeof p === "symbol" ? p.toString() : p;
            if (i < path.length - 1) {
                result += ".";
            }
        }

        return result;
    }

    /**
     * Checks the access kind (function, object, etc.) and returns appropriate proxies or values.
     *
     * @param {any} target - The target object.
     * @param {any} prop - The property to access.
     * @param {(string | symbol)[]} path - The path to the property.
     * @returns {any} The accessed value or a proxy of it.
     */
    #checkAccessKind(target: any, prop: any, path: (string | symbol)[]): any {
        const targetProp = target[prop];
        const isFunc = typeof targetProp === "function";
        const isObj = this.#isObject(targetProp) && targetProp !== null;

        if (isFunc) {
            if (
                this.#dangerMethods.has(prop) &&
                !this.#isAccessToStateAllowed
            ) {
                throw new Error(
                    "Access is denied. Use 'update' method to do this.",
                );
            }

            const newPath = path.concat(prop);

            if (this.#dangerMethods.has(prop)) {
                this.#wasChanged = true;
                this.#clearProxyCache(path);
            }

            return new Proxy(
                this.#saveSlots(target, prop),
                this.#createHandler(newPath),
            );
        }

        if (isObj && !this.#isUnwrapAllowed) {
            const newPath = path.concat(prop);
            const stringifiedPath = this.#stringifyPath(newPath);

            if (!this.#proxyCache.has(stringifiedPath)) {
                const newProxy = new Proxy(
                    this.#saveSlots(target, prop),
                    this.#createHandler(newPath),
                );
                this.#proxyCache.set(stringifiedPath, newProxy);
            }

            return this.#proxyCache.get(stringifiedPath);
        }

        return this.#saveSlots(target, prop);
    }

    #clearProxyCache(path: (string | symbol)[]): void {
        const pathString = this.#stringifyPath(path);
        for (const key of this.#proxyCache.keys()) {
            if (key.startsWith(pathString)) {
                this.#proxyCache.delete(key);
            }
        }
    }

    #isEqualShallow(a: any, b: any): boolean {
        if (this.#isPrimitive(a) || this.#isPrimitive(b)) {
            return a === b;
        }

        if (Object.keys(a).length !== Object.keys(b).length) {
            return false;
        }

        for (const key in a) {
            if (a[key] !== b[key]) {
                return false;
            }
        }

        return true;
    }

    /**
     * Updates a property in the state and marks the state as changed.
     *
     * @param {any} target - The target object.
     * @param {any} prop - The property to update.
     * @param {any} val - The new value to set.
     * @param {any} newPath - The path to the property being updated.
     */
    #updateProperty(target: any, prop: any, val: any, newPath: any): void {
        target[prop] = val;
        this.#wasChanged = true;
        this.#clearProxyCache(newPath);

        if (this.#isNeedToCheckProperties && this.#actionKind === "update") {
            const filteredPath = newPath.slice(1);
            const pathString = this.#stringifyPath(filteredPath);

            if (pathString.length) {
                this.#addPathToChangedProperty(pathString);
            }
        }
    }

    /**
     * Determines whether a property should be updated based on the comparator.
     *
     * @param {any} target - The target object.
     * @param {any} prop - The property to check.
     * @param {any} val - The new value to set.
     * @returns {boolean} True if the property should be updated, otherwise false.
     */
    #isUpdateNeeded(target: any, prop: any, val: any): boolean {
        switch (this.defaultComparator) {
            case "ref":
                return target[prop] !== val;
            case "shallow":
                return !this.#isEqualShallow(target[prop], val);
            case "custom":
                if (!this.customComparator) {
                    throw new Error("Custom comparator is not provided.");
                }
                return !this.customComparator(target[prop], val);
            case "none":
            default:
                return true;
        }
    }

    #createHandler(
        path: (string | symbol)[],
    ): ProxyHandler<StatemanjsStateWrapper<T>> {
        return {
            get: (target: any, prop: any): any => {
                return this.#checkAccessKind(target, prop, path);
            },
            set: (target: any, prop: any, val: any): boolean => {
                if (!this.#isAccessToStateAllowed) {
                    throw new Error("Access is denied.");
                }

                const newPath = path.concat(prop);

                if (
                    this.#skipComparison ||
                    this.#isUpdateNeeded(target, prop, val)
                ) {
                    this.#updateProperty(target, prop, val, newPath);
                }

                return true;
            },
            defineProperty: (): boolean => {
                throw new Error("Cannot define property.");
            },
            deleteProperty: (target: any, prop: string | symbol): boolean => {
                if (!this.#isAccessToStateAllowed) {
                    throw new Error(
                        'Cannot delete property directly. Use "update" instead.',
                    );
                }

                if (!(prop in target)) {
                    console.warn(`property not found: ${String(prop)}`);
                    return false;
                }

                const newPath = path.concat(prop);
                delete target[prop as string];
                this.#clearProxyCache(newPath);
                return true;
            },
        };
    }

    #addSubscriber(subscriber: Subscriber): void {
        this.#activeSubscribers[subscriber.subId] = subscriber;
    }

    #generateSubscriberId(): symbol {
        const id = Symbol();

        return id;
    }

    #runActiveSubscribersCb(): void {
        const activeSubscribers = this.#activeSubscribers;
        const inactiveSubscribersId: symbol[] = [];

        const keys = Object.getOwnPropertySymbols(activeSubscribers);

        for (const id of keys) {
            const s = activeSubscribers[id];
            try {
                if (!s.notifyCondition || s.notifyCondition()) {
                    s.subCb();
                }
            } catch (error) {
                inactiveSubscribersId.push(id);
                console.info(
                    `One of your subscribers marked as inactive and was removed. Error message - ${getErrorMessage(
                        error,
                    )}`,
                );
            }
        }

        if (inactiveSubscribersId.length > 0) {
            this.unsubscribeByIds(inactiveSubscribersId);
        }
    }

    #isObject(entity: unknown): boolean {
        return entity !== null && typeof entity === "object";
    }

    /**
     * Determines if any of the specified properties are part of any path in the state.
     *
     * @param {string[]} properties - The properties to check.
     * @param {string[]} paths - The paths to compare against.
     * @returns {boolean} True if any property is part of any path, otherwise false.
     */
    #isPropertyInPath(properties: string[], paths: string[]): boolean {
        const propertiesMap = new Map(
            properties.map((prop) => [prop, prop.length]),
        );

        // the root has been changed
        if (paths.length === 0) {
            return true;
        }

        return paths.some((path) => {
            for (const [prop, length] of propertiesMap) {
                if (path.slice(0, length) === prop) {
                    return true;
                }
            }
            return false;
        });
    }

    /**
     * Safely modifies the state within a controlled environment, ensuring access permissions.
     *
     * @param {() => void} modifier - The function that modifies the state.
     * @param {ActionKind} actionKind - The kind of action being performed.
     * @returns {boolean} True if the state was modified, otherwise false.
     */
    #performSafeModification(
        modifier: () => void,
        actionKind: ActionKind,
    ): boolean {
        this.#isAccessToStateAllowed = true;
        this.#actionKind = actionKind;
        modifier();
        this.#actionKind = "none";
        this.#isAccessToStateAllowed = false;

        return this.#wasChanged;
    }

    public get(): T {
        return this.#proxiedState.__STATEMANJS_STATE__;
    }

    public set(newState: T, options: BaseSetOptions<T>): boolean {
        try {
            const wasChanged = this.#performSafeModification((): void => {
                this.#skipComparison = options.skipComparison || false;

                this.#proxiedState.__STATEMANJS_STATE__ = newState;
            }, "set");

            if (!wasChanged) {
                return false;
            }

            options.afterUpdate();

            this.#wasChanged = false;
            this.#runActiveSubscribersCb();
            this.#resetPathToChangedProperty();
            this.#actionKind = "none";

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

    public update(updateCb: UpdateCb<T>, options: BaseSetOptions<T>): boolean {
        try {
            const wasChanged = this.#performSafeModification((): void => {
                this.#skipComparison = options.skipComparison || false;

                updateCb(this.get());
            }, "update");

            if (!wasChanged) {
                return false;
            }

            options.afterUpdate();

            this.#wasChanged = false;
            this.#runActiveSubscribersCb();
            this.#resetPathToChangedProperty();
            this.#actionKind = "none";

            return true;
        } catch (error) {
            throw new Error(
                formatError(
                    "An error occurred while updating the state",
                    error,
                ),
            );
        }
    }

    public subscribe(
        subscriptionCb: SubscriptionCb<T>,
        subscriptionOptions: SubscriptionOptions<T> = {},
    ): UnsubscribeCb {
        const subscriberId = this.#generateSubscriberId();

        const notifyConditionCb = subscriptionOptions.notifyCondition;
        const hasProperties =
            subscriptionOptions.properties &&
            subscriptionOptions.properties.length > 0;

        if (hasProperties) {
            this.#isNeedToCheckProperties = true;
        }

        this.#addSubscriber({
            subId: subscriberId,
            subCb: () => subscriptionCb(this.get()),
            notifyCondition: (): boolean => {
                if (hasProperties) {
                    if (!this.#isObject(this.unwrap())) {
                        throw new Error(
                            "You can't add properties to track if your state is not an object",
                        );
                    }

                    try {
                        return this.#isPropertyInPath(
                            subscriptionOptions.properties as string[],
                            this.getPathToChangedProperty(),
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
            if (!hasProperties) {
                this.#isNeedToCheckProperties = false;
            }

            this.unsubscribeById(subscriberId);
        };
    }

    public unsubscribeById(subscriberId: symbol): void {
        delete this.#activeSubscribers[subscriberId];
    }

    public unsubscribeByIds(subscriberIds: symbol[]): void {
        subscriberIds.forEach((id) => {
            this.unsubscribeById(id);
        });
    }

    public getActiveSubscribersCount(): number {
        return Object.getOwnPropertySymbols(this.#activeSubscribers).length;
    }

    public unsubscribeAll(): void {
        this.#isNeedToCheckProperties = false;

        const protectedSubscribers: Record<symbol, Subscriber> = {};

        for (const id of Object.getOwnPropertySymbols(
            this.#activeSubscribers,
        )) {
            const subscriber = this.#activeSubscribers[id];
            if (subscriber.isProtected) {
                protectedSubscribers[id] = subscriber;
            }
        }

        this.#activeSubscribers = protectedSubscribers;
    }

    public unwrap(): T {
        this.#isUnwrapAllowed = true;
        const unwrapped = this.get();
        this.#isUnwrapAllowed = false;

        return unwrapped;
    }

    public getPathToChangedProperty(): string[] {
        return Array.from(this.#pathToChangedProperty.values());
    }
}
