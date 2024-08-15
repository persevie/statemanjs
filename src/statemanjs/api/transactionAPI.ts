import { Transaction, TransactionDiff } from "../types/transactionTypes";

/**
 * Interface for a transaction API that stores state history in a chain
 * (with a configurable length) and allows for receiving diffs and rolling back changes.
 *
 * @template T - The type of the state being managed by the transactions.
 */
export interface TransactionAPI<T> {
    /**
     * The total number of transactions that have occurred since the state was initialized.
     */
    totalTransactions: number;

    /**
     * Adds a new transaction to the transaction chain.
     *
     * @param {T} snapshot - The snapshot of the state to be added as a transaction.
     */
    addTransaction(snapshot: T): void;

    /**
     * Retrieves the last transaction in the transaction chain.
     *
     * @returns {Transaction<T> | null} The last transaction, or null if there are no transactions.
     */
    getLastTransaction(): Transaction<T> | null;

    /**
     * Retrieves all transactions that have occurred.
     *
     * @returns {Transaction<T>[]} An array of all transactions.
     */
    getAllTransactions(): Transaction<T>[];

    /**
     * Retrieves a specific transaction by its number in the transaction chain.
     *
     * @param {number} transactionNumber - The number of the transaction to retrieve.
     * @returns {Transaction<T> | null} The transaction with the specified number, or null if it doesn't exist.
     */
    getTransactionByNumber(transactionNumber: number): Transaction<T> | null;

    /**
     * Retrieves the difference between the current state and the last transaction.
     *
     * @returns {TransactionDiff<T> | null} The difference between the current state and the last transaction, or null if there are no transactions.
     */
    getLastDiff(): TransactionDiff<T> | null;

    /**
     * Retrieves the difference between two specific transactions.
     *
     * @param {number} transactionA - The number of the first transaction.
     * @param {number} transactionB - The number of the second transaction.
     * @returns {TransactionDiff<T> | null} The difference between the two specified transactions, or null if the transactions don't exist or there is no difference.
     */
    getDiffBetween(
        transactionA: number,
        transactionB: number,
    ): TransactionDiff<T> | null;
}
