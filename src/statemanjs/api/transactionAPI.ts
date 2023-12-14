import { Transaction, TransactionDiff } from "../entities";

/**
 * Transactions store state history in a chain (length is configurable)
 * and allow you to receive diffs and roll back changes.
 */
export interface TransactionAPI<T> {
    /**
     * Number of transactions since state initialization
     */
    totalTransactions: number;

    /**
     * Add transaction to the chain
     * @param snapshot
     */
    addTransaction(snapshot: T): void;

    getLastTransaction(): Transaction<T> | null;

    getAllTransactions(): Transaction<T>[];

    getTransactionByNumber(transactionNumber: number): Transaction<T> | null;

    getLastDiff(): TransactionDiff<T> | null;

    getDiffBetween(
        transactionA: number,
        transactionB: number,
    ): TransactionDiff<T> | null;
}
