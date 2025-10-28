/* istanbul ignore file */

import { DebugAPI } from "./api/debugAPI";
import { StatemanjsAPI } from "./api/statemanjsApi";
import { StatemanjsComputedAPI } from "./api/statemanjsComputedAPI";
import {
    CustomComparator,
    DefaultComparator,
    SubscriptionOptions,
} from "./shared/entities";
import { DebugService } from "./service/debugService";
import {
    StatemanjsService,
    StatemanjsComputedService,
} from "./service/statemanjsService";
import { TransactionService } from "./service/transactionService";

export type StatemanjsOptions<T> = {
    transactionsLen?: number;
    customComparator?: CustomComparator<T>;
    defaultComparator?: DefaultComparator;
    batch?: boolean;
};

export function createState<T>(
    element: T,
    options?: StatemanjsOptions<T>,
): StatemanjsAPI<T> {
    let debugService: DebugAPI<T> | undefined;

    if (options !== undefined && options.transactionsLen !== undefined) {
        debugService = new DebugService(
            new TransactionService(options.transactionsLen),
        );
    }

    return new StatemanjsService(element, {
        debugService,
        customComparator: options?.customComparator,
        defaultComparator: options?.defaultComparator,
        batch: options?.batch,
    });
}

export function createComputedState<T>(
    callback: () => T,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deps: (StatemanjsAPI<any> | StatemanjsComputedAPI<any>)[],
    options?: StatemanjsOptions<T>,
): StatemanjsComputedAPI<T> {
    return new StatemanjsComputedService<T>(callback, deps, {
        ...(options || {}),
        debugService:
            options !== undefined && options.transactionsLen !== undefined
                ? new DebugService(
                      new TransactionService(options.transactionsLen),
                  )
                : undefined,
        customComparator: options?.customComparator,
        defaultComparator: options?.defaultComparator,
        batch: options?.batch,
    });
}

export type { StatemanjsAPI, StatemanjsComputedAPI, SubscriptionOptions };
