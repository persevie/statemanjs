/* istanbul ignore file */

import { DebugAPI } from "../api/debugAPI";
import { TransactionAPI } from "../api/transactionAPI";

export class DebugService<T> implements DebugAPI<T> {
    constructor(transactionService: TransactionAPI<T>) {
        this.transactionService = transactionService;
    }

    transactionService: TransactionAPI<T>;
}
