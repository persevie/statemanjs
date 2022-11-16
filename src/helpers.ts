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

export { formatError, getErrorMessage };
