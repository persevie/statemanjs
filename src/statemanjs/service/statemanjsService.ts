/* eslint-disable @typescript-eslint/no-explicit-any */
import { DebugAPI } from "../api/debugAPI";
import { StatemanjsAPI } from "../api/statemanjsApi";
import { StatemanjsBaseAPI } from "../api/statemanjsBaseAPI";
import { StatemanjsComputedAPI } from "../api/statemanjsComputedAPI";
import {
    SubscriptionCb,
    SubscriptionOptions,
    UnsubscribeCb,
    UpdateCb,
} from "../entities";
import { formatError } from "../utility";
import { StatemanjsBaseService } from "./statemanjsBaseService";

export class StatemanjsService<E> implements StatemanjsAPI<E> {
    constructor(element: E, debugService?: DebugAPI<E>) {
        // Bindings
        this.set = this.set.bind(this);
        this.get = this.get.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.unsubscribeAll = this.unsubscribeAll.bind(this);
        this.getActiveSubscribersCount =
            this.getActiveSubscribersCount.bind(this);
        this.update = this.update.bind(this);
        this.unwrap = this.unwrap.bind(this);

        this.#statemanjsBaseService = new StatemanjsBaseService(element);
        this.DEBUG = debugService;
    }

    #statemanjsBaseService: StatemanjsBaseAPI<E>;

    DEBUG: DebugAPI<E> | undefined;

    /**
     * Accepts a new state and compares it with the current one.
     * Nothing will happen if the passed value is equal to the current one.
     * @param newState New state.
     * @returns Status of operation.
     */
    set(newState: E): boolean {
        try {
            this.#statemanjsBaseService.setAcionKindToSet();
            this.#statemanjsBaseService.allowAccessToState();
            this.#statemanjsBaseService.proxiedState.__STATEMANJS_STATE__ =
                newState;
            this.#statemanjsBaseService.denyAccessToState();

            if (!this.#statemanjsBaseService.getWasChanged()) {
                return false;
            }

            if (this.DEBUG !== undefined) {
                this.DEBUG.transactionService.addTransaction(this.unwrap());
            }

            this.#statemanjsBaseService.setWasChangedToFalse();
            this.#statemanjsBaseService.runActiveSubscribersCb();
            this.#statemanjsBaseService.resetPathToChangedProperty();
            this.#statemanjsBaseService.setAcionKindToNone();

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
        return this.#statemanjsBaseService.proxiedState.__STATEMANJS_STATE__;
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
        const subscriberId = this.#statemanjsBaseService.generateSubscriberId();

        const notifyConditionCb = subscriptionOptions.notifyCondition;

        if (
            subscriptionOptions.properties &&
            subscriptionOptions.properties.length > 0
        ) {
            this.#statemanjsBaseService.isNeedToCheckProperties = true;
        }

        this.#statemanjsBaseService.addSubscriber({
            subId: subscriberId,
            subCb: () => subscriptionCb(this.get()),
            notifyCondition: (): boolean => {
                if (subscriptionOptions.properties) {
                    if (!this.#statemanjsBaseService.isObject(this.unwrap())) {
                        throw new Error(
                            "You can't add properties to track if your state is not an object",
                        );
                    }

                    try {
                        return this.#statemanjsBaseService.isAnyPropertyPartOfAnyPath(
                            subscriptionOptions.properties as string[],
                            this.#statemanjsBaseService.getPathToChangedProperty(),
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
                this.#statemanjsBaseService.isNeedToCheckProperties = false;
            }

            this.#statemanjsBaseService.unsubscribeById(subscriberId);
        };
    }

    /** Remove all unprotected subscribers */
    unsubscribeAll(): void {
        this.#statemanjsBaseService.isNeedToCheckProperties = false;
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
    update(updateCb: UpdateCb<E>): boolean {
        try {
            this.#statemanjsBaseService.setAcionKindToUpdate();
            this.#statemanjsBaseService.allowAccessToState();
            updateCb(this.get());
            this.#statemanjsBaseService.denyAccessToState();

            if (!this.#statemanjsBaseService.getWasChanged()) {
                return false;
            }

            if (this.DEBUG !== undefined) {
                this.DEBUG.transactionService.addTransaction(this.unwrap());
            }

            this.#statemanjsBaseService.setWasChangedToFalse();
            this.#statemanjsBaseService.runActiveSubscribersCb();
            this.#statemanjsBaseService.resetPathToChangedProperty();
            this.#statemanjsBaseService.setAcionKindToNone();

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
        this.#statemanjsBaseService.allowUnwrap();
        const unwrapped = this.get();
        this.#statemanjsBaseService.denyUnwrap();

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
        return new StatemanjsComputedService<T>(selector, [this]);
    }
}

export class StatemanjsComputedService<T> implements StatemanjsComputedAPI<T> {
    constructor(
        callback: () => T,
        deps: (StatemanjsAPI<any> | StatemanjsComputedAPI<any>)[],
    ) {
        if (!deps.length) {
            throw new Error("");
        }

        this.#statemanjs = new StatemanjsService<T>(callback());

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
