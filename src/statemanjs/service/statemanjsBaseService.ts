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
} from "../shared/entities";
import { deepClone, formatError, getErrorMessage } from "../shared/utility";
import { flushScheduledComputed } from "../shared/computedScheduler";
import { UpdateGeneration } from "../shared/updateGeneration";

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
     * FinalizationRegistry for automatic cleanup of garbage-collected subscribers.
     * When a subscriber callback is garbage collected, this automatically removes it.
     */
    #subscriberRegistry?: FinalizationRegistry<symbol>;

    /**
     * Map of subscriber IDs to their callback functions for FinalizationRegistry.
     */
    #subscriberCallbacks: Map<symbol, Function> = new Map();

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
     * Uses WeakMap for automatic garbage collection when objects are no longer referenced.
     */
    #proxyCache: WeakMap<object, any>;

    /**
     * Flag indicating if the state is a primitive type (fast-path optimization).
     */
    #isPrimitiveState = false;

    /**
     * Direct storage for primitive values (bypasses Proxy).
     */
    #primitiveValue?: T;

    /**
     * Precompiled comparator function (avoids switch in hot path).
     */
    #compareFn: (a: any, b: any) => boolean;

    /**
     * Flag indicating if batching is enabled for subscriber notifications.
     */
    #batchingEnabled = false;

    /**
     * Flag indicating if a notification is pending in the microtask queue.
     */
    #pendingNotification = false;

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

    /**
     * Set of array methods that return elements which need to be proxied.
     * These are non-mutating methods that access array elements.
     */
    readonly #arrayAccessorMethods: Set<string> = new Set([
        "find", // Returns single element
        "filter", // Returns array of elements
        "map", // Returns array of transformed elements
        "flatMap", // Returns flattened array
        "slice", // Returns array slice
        "concat", // Returns concatenated array
        "reduce", // Can return elements during iteration
        "reduceRight", // Can return elements during iteration
        "at", // Returns single element by index
    ]);

    readonly customComparator: CustomComparator<T> | undefined;

    readonly defaultComparator: DefaultComparator;

    constructor(
        element: T,
        options: {
            customComparator?: CustomComparator<T>;
            defaultComparator?: DefaultComparator;
            batch?: boolean;
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

        // Initialize batching mode
        this.#batchingEnabled = options.batch || false;

        // Initialize FinalizationRegistry for automatic subscriber cleanup
        if (typeof FinalizationRegistry !== "undefined") {
            this.#subscriberRegistry = new FinalizationRegistry(
                (subscriberId: symbol) => {
                    // Automatically remove subscriber when callback is garbage collected
                    if (this.#activeSubscribers[subscriberId]) {
                        delete this.#activeSubscribers[subscriberId];
                    }
                },
            );
        }

        // Precompile comparator function (avoid switch in hot path)
        switch (this.defaultComparator) {
            case "ref":
                this.#compareFn = (a: any, b: any) => a !== b;
                break;
            case "shallow":
                this.#compareFn = (a: any, b: any) =>
                    !this.#isEqualShallow(a, b);
                break;
            case "custom":
                if (!this.customComparator) {
                    throw new Error("Custom comparator is not provided.");
                }
                this.#compareFn = (a: any, b: any) =>
                    !this.customComparator!(a, b);
                break;
            case "none":
            default:
                this.#compareFn = () => true;
                break;
        }

        // Check if state is primitive (fast-path optimization)
        if (this.#isPrimitive(element)) {
            this.#isPrimitiveState = true;
            this.#primitiveValue = element;
            // Skip Proxy creation for primitives
            this.#proxyCache = new WeakMap();
            this.#proxiedState = {} as any; // Dummy value, never accessed
            return;
        }

        // Initialize cache for proxies (WeakMap for automatic GC)
        this.#proxyCache = new WeakMap();

        // Wrap and proxy the state (start with empty path string)
        this.#proxiedState = new Proxy<StatemanjsStateWrapper<T>>(
            { __STATEMANJS_STATE__: element } as StatemanjsStateWrapper<T>,
            this.#createHandler(""),
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
     * Converts a property key to string, handling symbols correctly.
     *
     * @param {string | symbol} prop - The property key.
     * @returns {string} The stringified property.
     */
    #propToString(prop: string | symbol): string {
        return typeof prop === "symbol" ? prop.toString() : String(prop);
    }

    /**
     * Checks the access kind (function, object, etc.) and returns appropriate proxies or values.
     * Optimized with fast-path for primitives (single typeof check).
     * Uses string path representation - faster than arrays!
     * Skips "__STATEMANJS_STATE__" wrapper in path for zero-overhead tracking!
     *
     * @param {any} target - The target object.
     * @param {any} prop - The property to access.
     * @param {string} path - The dot-separated path to the property.
     * @returns {any} The accessed value or a proxy of it.
     */
    #checkAccessKind(target: any, prop: any, path: string): any {
        const targetProp = target[prop];
        const propType = typeof targetProp;

        // FAST-PATH: Primitives (99% cases on flat objects) - only ONE typeof check!
        if (propType !== "object" && propType !== "function") {
            return targetProp;
        }

        // null is typeof "object", so check it separately
        if (targetProp === null) {
            return targetProp;
        }

        const isFunc = propType === "function";

        // Skip wrapper property in path to avoid prefix removal overhead!
        // This way paths are clean from the start: "a.b.c" instead of "__STATEMANJS_STATE__.a.b.c"
        const propStr = this.#propToString(prop);
        const newPath =
            propStr === "__STATEMANJS_STATE__"
                ? path // Don't change path for wrapper property
                : path
                  ? `${path}.${propStr}`
                  : propStr; // Normal concatenation for real properties

        if (isFunc) {
            if (
                this.#dangerMethods.has(prop) &&
                !this.#isAccessToStateAllowed
            ) {
                throw new Error(
                    "Access is denied. Use 'update' method to do this.",
                );
            }

            if (this.#dangerMethods.has(prop)) {
                this.#wasChanged = true;
            }

            // Handle array accessor methods (find, filter, map, etc.)
            // These methods return elements that need to be proxied
            if (Array.isArray(target) && this.#arrayAccessorMethods.has(prop)) {
                const originalMethod = targetProp.bind(target);
                return (...args: any[]) => {
                    const result = originalMethod(...args);

                    // Wrap result(s) in proxy if needed
                    if (result === null || result === undefined) {
                        return result;
                    }

                    // For methods that return arrays (filter, map, slice, etc.)
                    if (Array.isArray(result)) {
                        return result.map((item: any) => {
                            if (
                                item &&
                                typeof item === "object" &&
                                !this.#isPrimitive(item)
                            ) {
                                // Check if this item is from our proxied array
                                if (!this.#proxyCache.has(item)) {
                                    const itemProxy = new Proxy(
                                        item,
                                        this.#createHandler(newPath),
                                    );
                                    this.#proxyCache.set(item, itemProxy);
                                }
                                return this.#proxyCache.get(item);
                            }
                            return item;
                        });
                    }

                    // For methods that return single element (find, at, reduce)
                    if (
                        result &&
                        typeof result === "object" &&
                        !this.#isPrimitive(result)
                    ) {
                        if (!this.#proxyCache.has(result)) {
                            const resultProxy = new Proxy(
                                result,
                                this.#createHandler(newPath),
                            );
                            this.#proxyCache.set(result, resultProxy);
                        }
                        return this.#proxyCache.get(result);
                    }

                    return result;
                };
            }

            // Bind function directly without extra #saveSlots call
            const boundFunc = targetProp.bind(target);
            return new Proxy(boundFunc, this.#createHandler(newPath));
        }

        // Here we know it's an object (not null, not primitive, not function)
        if (!this.#isUnwrapAllowed) {
            // Use the object itself as WeakMap key (automatic GC)
            if (!this.#proxyCache.has(targetProp)) {
                const newProxy = new Proxy(
                    targetProp,
                    this.#createHandler(newPath),
                );
                this.#proxyCache.set(targetProp, newProxy);
            }

            return this.#proxyCache.get(targetProp);
        }

        // For objects in unwrap mode, return directly
        return targetProp;
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
     * No prefix removal needed! Path is already clean thanks to #checkAccessKind.
     *
     * @param {any} target - The target object.
     * @param {any} prop - The property to update.
     * @param {any} val - The new value to set.
     * @param {string} newPath - The dot-separated path to the property being updated.
     */
    #updateProperty(target: any, prop: any, val: any, newPath: string): void {
        target[prop] = val;
        this.#wasChanged = true;

        if (this.#isNeedToCheckProperties && this.#actionKind === "update") {
            // Path is already clean (e.g., "a", "a.b.c") - no prefix removal needed!
            if (newPath.length > 0) {
                this.#addPathToChangedProperty(newPath);
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
        return this.#compareFn(target[prop], val);
    }

    #createHandler(path: string): ProxyHandler<StatemanjsStateWrapper<T>> {
        return {
            get: (target: any, prop: any): any => {
                return this.#checkAccessKind(target, prop, path);
            },
            set: (target: any, prop: any, val: any): boolean => {
                if (!this.#isAccessToStateAllowed) {
                    throw new Error("Access is denied.");
                }

                // Skip wrapper property in path (same logic as #checkAccessKind)
                const propStr = this.#propToString(prop);
                const newPath =
                    propStr === "__STATEMANJS_STATE__"
                        ? path // Don't change path for wrapper property
                        : path
                          ? `${path}.${propStr}`
                          : propStr;

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

                // Skip wrapper property in path (same logic as #checkAccessKind)
                const propStr = this.#propToString(prop);
                const newPath =
                    propStr === "__STATEMANJS_STATE__"
                        ? path // Don't change path for wrapper property
                        : path
                          ? `${path}.${propStr}`
                          : propStr;
                delete target[prop as string];
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

    #runActiveSubscribersCb(skipGenerationIncrement = false): void {
        // Increment update generation before notifying subscribers
        // This allows computed states to track if they've already processed this update
        // Skip increment if requested (e.g., from computed states to avoid generation interference)
        if (!skipGenerationIncrement) {
            UpdateGeneration.increment();
        }

        if (!this.#batchingEnabled) {
            // Synchronous notification (default behavior)
            this.#notifySubscribersSync();
            return;
        }

        // Batched notification via microtask queue
        if (this.#pendingNotification) {
            // Already scheduled, skip
            return;
        }

        this.#pendingNotification = true;
        queueMicrotask(() => {
            this.#notifySubscribersSync();
            this.#pendingNotification = false;
        });
    }

    #notifySubscribersSync(): void {
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

        flushScheduledComputed();
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
        if (this.#isPrimitiveState) {
            return this.#primitiveValue!;
        }
        return this.#proxiedState.__STATEMANJS_STATE__;
    }

    public set(newState: T, options: BaseSetOptions<T>): boolean {
        // ULTRA-FAST path for primitives
        if (this.#isPrimitiveState) {
            // Inline comparison (avoid function call)
            if (!options.skipComparison && this.#primitiveValue === newState) {
                return false; // No change
            }
            this.#primitiveValue = newState;

            // Inline afterUpdate check (avoid optional chaining overhead)
            if (options.afterUpdate) {
                options.afterUpdate();
            }

            // Inline subscriber notification (skip intermediate method calls)
            // For primitives: no batching, no property tracking, no error handling
            if (!options.skipGenerationIncrement) {
                UpdateGeneration.increment();
            }

            const subscribers = this.#activeSubscribers;
            const keys = Object.getOwnPropertySymbols(subscribers);

            // HOT PATH: No try-catch, no condition checks for simple counters/flags
            for (const id of keys) {
                const s = subscribers[id];
                // Most primitives don't have notifyCondition (simple counter/flag)
                if (!s.notifyCondition || s.notifyCondition()) {
                    s.subCb();
                }
            }

            flushScheduledComputed();

            return true;
        }

        // Standard path for objects (with error handling)
        try {
            // Standard path for objects
            const wasChanged = this.#performSafeModification((): void => {
                this.#skipComparison = options.skipComparison || false;

                this.#proxiedState.__STATEMANJS_STATE__ = newState;
            }, "set");

            if (!wasChanged) {
                return false;
            }

            options.afterUpdate();

            this.#wasChanged = false;
            this.#runActiveSubscribersCb(options.skipGenerationIncrement);
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
            // Fast-path for primitives (bypass Proxy)
            if (this.#isPrimitiveState) {
                throw new Error(
                    "Cannot use 'update' method on primitive state. Use 'set' instead.",
                );
            }

            // Standard path for objects
            const wasChanged = this.#performSafeModification((): void => {
                this.#skipComparison = options.skipComparison || false;

                updateCb(this.get());
            }, "update");

            if (!wasChanged) {
                return false;
            }

            options.afterUpdate();

            this.#wasChanged = false;
            this.#runActiveSubscribersCb(options.skipGenerationIncrement);
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

        // Register callback in FinalizationRegistry for automatic cleanup
        if (this.#subscriberRegistry) {
            this.#subscriberCallbacks.set(subscriberId, subscriptionCb);
            this.#subscriberRegistry.register(
                subscriptionCb,
                subscriberId,
                subscriptionCb,
            );
        }

        return (): void => {
            if (!hasProperties) {
                this.#isNeedToCheckProperties = false;
            }

            this.unsubscribeById(subscriberId);
        };
    }

    public unsubscribeById(subscriberId: symbol): void {
        // Unregister from FinalizationRegistry if exists
        if (
            this.#subscriberRegistry &&
            this.#subscriberCallbacks.has(subscriberId)
        ) {
            const callback = this.#subscriberCallbacks.get(subscriberId);
            this.#subscriberRegistry.unregister(callback!);
            this.#subscriberCallbacks.delete(subscriberId);
        }

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
        if (this.#isPrimitiveState) {
            return this.#primitiveValue!;
        }

        this.#isUnwrapAllowed = true;
        const unwrapped = this.get();
        this.#isUnwrapAllowed = false;

        return deepClone(unwrapped);
    }

    public getPathToChangedProperty(): string[] {
        return Array.from(this.#pathToChangedProperty.values());
    }
}
