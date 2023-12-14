import { TransactionAPI } from "./transactionAPI";

export interface DebugAPI<T> {
    transactionService: TransactionAPI<T>;
}
