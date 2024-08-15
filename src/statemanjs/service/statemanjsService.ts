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
} from "../entities";
import { formatError } from "../utility";
import { StatemanjsBaseService } from "./statemanjsBaseService";

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

    constructor(
        callback: () => T,
        deps: (StatemanjsAPI<any> | StatemanjsComputedAPI<any>)[],
        options: StatemanjsComputedServiceOptions<any>,
    ) {
        if (!deps.length) {
            throw new Error("No dependencies provided");
        }

        // Bindings
        this.get = this.get.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.unsubscribeAll = this.unsubscribeAll.bind(this);
        this.getActiveSubscribersCount =
            this.getActiveSubscribersCount.bind(this);
        this.unwrap = this.unwrap.bind(this);

        this.#statemanjs = new StatemanjsService<T>(callback(), {
            debugService: options.debugService,
            customComparator: options.customComparator,
            defaultComparator: options.defaultComparator,
        });

        for (const d of deps) {
            d.subscribe(
                (): void => {
                    this.#statemanjs.set(callback());
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
