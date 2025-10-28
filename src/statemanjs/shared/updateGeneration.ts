/**
 * Global update generation counter for batching computed state updates.
 * This prevents diamond problem where a computed state might be recalculated
 * multiple times in a single synchronous update cycle.
 */
export class UpdateGeneration {
    static #generation = 0;

    static get current(): number {
        return this.#generation;
    }

    static increment(): number {
        return ++this.#generation;
    }
}
