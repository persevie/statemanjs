/* istanbul ignore file */

import { DebugAPI } from "./api/debugAPI";
import { StatemanjsAPI } from "./api/statemanjsApi";
import { StatemanjsComputedAPI } from "./api/statemanjsComputedAPI";
import { SubscriptionOptions } from "./entities";
import { DebugService } from "./service/debugService";
import {
    StatemanjsService,
    StatemanjsComputedService,
} from "./service/statemanjsService";
import { TransactionService } from "./service/transactionService";

export type StatemanjsOptions = {
    transactionsLen?: number;
};

export function createState<T>(
    element: T,
    options?: StatemanjsOptions,
): StatemanjsAPI<T> {
    let debugService: DebugAPI<T> | undefined;

    if (options !== undefined && options.transactionsLen !== undefined) {
        debugService = new DebugService(
            new TransactionService(options.transactionsLen),
        );
    }

    return new StatemanjsService(element, debugService);
}

export function createComputedState<T>(
    callback: () => T,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deps: StatemanjsAPI<any>[],
): StatemanjsComputedAPI<T> {
    return new StatemanjsComputedService<T>(callback, deps);
}

export type { StatemanjsAPI, StatemanjsComputedAPI, SubscriptionOptions };
