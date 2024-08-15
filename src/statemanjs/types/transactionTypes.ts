export type Transaction<T> = {
    number: number;
    snapshot: T;
    timestamp: number;
};

export type TransactionDiff<T> = {
    old: T;
    new: T;
};
