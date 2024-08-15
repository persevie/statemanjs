/* eslint-disable @typescript-eslint/no-explicit-any */

import { DebugAPI } from "./api/debugAPI";

/** Wrapper for the ability to save entities other than an object or array. */
export type StatemanjsStateWrapper<T> = {
    __STATEMANJS_STATE__: T;
};

/**
 * Subscriber object for internal use.
 */
export type Subscriber = {
    subId: symbol;
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

export type CustomComparator<T> = (a: T, b: T) => boolean;

export type DefaultComparator = "none" | "ref" | "shallow" | "custom";

export type StatemanjsServiceOptions<T> = {
    debugService?: DebugAPI<T>;
    customComparator?: CustomComparator<T>;
    defaultComparator?: DefaultComparator;
};

export type StatemanjsComputedServiceOptions<T> = StatemanjsServiceOptions<T> &
    SubscriptionOptions<T>;

type BaseModifyOptions<T> = {
    skipComparison?: boolean;
    comparatorOverride?: DefaultComparator;
    customComparatorOverride?: CustomComparator<T>;
    afterUpdate: () => void;
};

export type BaseSetOptions<T> = BaseModifyOptions<T>;

export type BaseUpdateOptions<T> = BaseModifyOptions<T>;

export type SetOptions<T> = Omit<BaseModifyOptions<T>, "afterUpdate">;

export type UpdateOptions<T> = Omit<BaseModifyOptions<T>, "afterUpdate">;
