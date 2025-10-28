/* istanbul ignore file */
/**
 * Makes the error message clear and beautiful.
 * @param description Description of where the error occurred
 * (for example - 'an error occurred while setting the new state').
 * @param error Error object.
 * @returns Nice error message 🌸.
 */
function formatError(description: string, error: unknown): string {
    return `${description}: ${getErrorMessage(error)}`;
}

function getErrorMessage(error: unknown): string {
    return (error as Error).message;
}

function deepClone<T>(obj: T): T {
    if (typeof structuredClone !== "undefined") {
        return structuredClone(obj);
    }
    // Fallback for older environments
    return JSON.parse(JSON.stringify(obj));
}

export { formatError, getErrorMessage, deepClone };
