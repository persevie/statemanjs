/* eslint-disable @typescript-eslint/no-explicit-any */
import { DebugAPI } from "../api/debugAPI";
import { StatemanjsAPI } from "../api/statemanjsApi";
import { StatemanjsBaseAPI } from "../api/statemanjsBaseAPI";
import { StatemanjsComputedAPI } from "../api/statemanjsComputedAPI";
import {
    SetOptions,
    StatemanjsComputedServiceOptions,
    StatemanjsServiceOptions,
    SubscriptionCb,
    SubscriptionOptions,
    UnsubscribeCb,
    UpdateCb,
    UpdateOptions,
} from "../shared/entities";
import { StatemanjsBaseService } from "./statemanjsBaseService";
import { scheduleComputedRecompute } from "../shared/computedScheduler";
import { formatError } from "../shared/utility";

export class StatemanjsService<E> implements StatemanjsAPI<E> {
    #statemanjsBaseService: StatemanjsBaseAPI<E>;

    readonly DEBUG: DebugAPI<E> | undefined;

    constructor(element: E, options: StatemanjsServiceOptions<E>) {
        // Bindings
        this.set = this.set.bind(this);
        this.get = this.get.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.unsubscribeAll = this.unsubscribeAll.bind(this);
        this.getActiveSubscribersCount =
            this.getActiveSubscribersCount.bind(this);
        this.update = this.update.bind(this);
        this.unwrap = this.unwrap.bind(this);

        this.#statemanjsBaseService = new StatemanjsBaseService(element, {
            customComparator: options.customComparator,
            defaultComparator: options.defaultComparator,
            batch: options.batch,
        });
        this.DEBUG = options.debugService;
    }

    /**
     * Accepts a new state and compares it with the current one.
     * Nothing will happen if the passed value is equal to the current one.
     * @param newState New state.
     * @returns Status of operation.
     */
    set(newState: E, options: SetOptions<E> = {}): boolean {
        try {
            const wasChanged = this.#statemanjsBaseService.set(newState, {
                afterUpdate: (): void => {
                    if (this.DEBUG !== undefined) {
                        this.DEBUG.transactionService.addTransaction(
                            this.unwrap(),
                        );
                    }
                },
                ...options,
            });

            return wasChanged;
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
        return this.#statemanjsBaseService.get();
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
        return this.#statemanjsBaseService.subscribe(
            subscriptionCb,
            subscriptionOptions,
        );
    }

    /** Remove all unprotected subscribers */
    unsubscribeAll(): void {
        this.#statemanjsBaseService.unsubscribeAll();
    }

    /**
     * Returns count of all active subscribers.
     * @returns number.
     */
    getActiveSubscribersCount(): number {
        return this.#statemanjsBaseService.getActiveSubscribersCount();
    }

    /**
     * Flexible state update.
     * @param updateCb Callback for state updates.
     */
    update(updateCb: UpdateCb<E>, options: UpdateOptions<E> = {}): boolean {
        try {
            const wasChanged = this.#statemanjsBaseService.update(updateCb, {
                afterUpdate: (): void => {
                    if (this.DEBUG !== undefined) {
                        this.DEBUG.transactionService.addTransaction(
                            this.unwrap(),
                        );
                    }
                },
                ...options,
            });

            return wasChanged;
        } catch (error) {
            throw new Error(
                formatError(
                    "An error occurred while updating the state",
                    error,
                ),
            );
        }
    }

    /**
     * Unwrap a proxy object to a regular JavaScript object
     * @returns unwrapped state
     */
    unwrap(): E {
        return this.#statemanjsBaseService.unwrap();
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
    createSelector<T>(
        selectorFn: (state: E) => T,
        subscriptionOptions: SubscriptionOptions<any> = {},
    ): StatemanjsComputedAPI<T> {
        const selector = (): T => selectorFn(this.get());
        return new StatemanjsComputedService<T>(selector, [this], {
            debugService: this.DEBUG,
            customComparator: this.#statemanjsBaseService.customComparator,
            defaultComparator: this.#statemanjsBaseService.defaultComparator,
            ...subscriptionOptions,
        });
    }
}

export class StatemanjsComputedService<T> implements StatemanjsComputedAPI<T> {
    #statemanjs: StatemanjsAPI<T>;
    #callback: () => T;
    #isDirty = true; // Initially dirty (needs first computation)
    #isComputing = false; // Cycle detection flag
    #cachedValue?: T;
    #hasSubscribers = false; // Track if there are real subscribers
    #isScheduled = false; // Track whether recomputation is queued
    readonly #flushCallback: () => void;

    constructor(
        callback: () => T,
        deps: (StatemanjsAPI<any> | StatemanjsComputedAPI<any>)[],
        options: StatemanjsComputedServiceOptions<any>,
    ) {
        if (!deps.length) {
            throw new Error("No dependencies provided");
        }

        this.#callback = callback;
        this.#flushCallback = () => {
            this.#isScheduled = false;
            this.#flushIfNeeded();
        };

        // Bindings
        this.get = this.get.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.unsubscribeAll = this.unsubscribeAll.bind(this);
        this.getActiveSubscribersCount =
            this.getActiveSubscribersCount.bind(this);
        this.unwrap = this.unwrap.bind(this);

        // Initialize with dummy value (will be computed lazily on first get())
        this.#statemanjs = new StatemanjsService<T>(undefined as any, {
            debugService: options.debugService,
            customComparator: options.customComparator,
            defaultComparator: options.defaultComparator,
            batch: options.batch,
        });

        // Subscribe to dependencies - mark as dirty instead of recomputing immediately
        for (const d of deps) {
            d.subscribe(
                (): void => {
                    this.#markDirty();
                },
                {
                    notifyCondition: options.notifyCondition,
                    protect:
                        options.protect === undefined ? true : options.protect,
                    properties: options.properties,
                },
            );
        }
    }

    /** Mark computed state as dirty (needs recomputation) */
    #markDirty(): void {
        this.#isDirty = true;

        if (!this.#hasSubscribers) {
            return;
        }

        if (this.#isScheduled) {
            return;
        }

        this.#isScheduled = true;
        scheduleComputedRecompute(this.#flushCallback);
    }

    #flushIfNeeded(): void {
        if (!this.#hasSubscribers) {
            return;
        }

        if (!this.#isDirty) {
            return;
        }

        // Avoid re-entrancy while computing
        if (this.#isComputing) {
            // Leave as dirty; another flush will run after current computation
            this.#isScheduled = true;
            scheduleComputedRecompute(this.#flushCallback);
            return;
        }

        const oldValue = this.#cachedValue;
        const newValue = this.#computeIfNeeded();

        if (oldValue !== newValue) {
            this.#statemanjs.set(newValue, {
                skipGenerationIncrement: true,
            });
        }
    }

    /** Compute value if dirty, otherwise return cached value */
    #computeIfNeeded(): T {
        if (!this.#isDirty && this.#cachedValue !== undefined) {
            return this.#cachedValue;
        }

        // Cycle detection
        if (this.#isComputing) {
            throw new Error(
                "Circular dependency detected in computed state. " +
                    "A computed state cannot depend on itself directly or indirectly.",
            );
        }

        this.#isComputing = true;
        try {
            this.#cachedValue = this.#callback();
            this.#isDirty = false;
            return this.#cachedValue;
        } finally {
            this.#isComputing = false;
        }
    }

    /** Get current state */
    get(): T {
        // Lazy evaluation: compute only when accessed and if dirty
        if (this.#isDirty) {
            const oldValue = this.#cachedValue;
            const newValue = this.#computeIfNeeded();

            this.#isScheduled = false;

            // Notify subscribers if value changed
            if (oldValue !== newValue) {
                // Skip generation increment - not from a base state change
                this.#statemanjs.set(newValue, {
                    skipGenerationIncrement: true,
                });
            }

            return newValue;
        }

        return this.#cachedValue!;
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
        if (!this.#hasSubscribers) {
            this.#hasSubscribers = true;

            if (this.#isDirty && !this.#isScheduled) {
                this.#isScheduled = true;
                scheduleComputedRecompute(this.#flushCallback);
            }
        }

        const unsubscribe = this.#statemanjs.subscribe(
            subscriptionCb,
            subscriptionOptions,
        );

        // Wrap unsubscribe to update flag
        return () => {
            unsubscribe();
            // Update flag if no more subscribers
            this.#hasSubscribers =
                this.#statemanjs.getActiveSubscribersCount() > 0;
        };
    }

    /** Remove all unprotected subscribers */
    unsubscribeAll(): void {
        this.#statemanjs.unsubscribeAll();
        this.#hasSubscribers = this.#statemanjs.getActiveSubscribersCount() > 0;
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
