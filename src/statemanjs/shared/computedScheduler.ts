type FlushCallback = () => void;

const pending = new Set<FlushCallback>();
let isFlushing = false;

export function scheduleComputedRecompute(callback: FlushCallback): void {
    pending.add(callback);
}

export function flushScheduledComputed(): void {
    if (isFlushing) {
        return;
    }

    isFlushing = true;
    try {
        while (pending.size > 0) {
            const callbacks = Array.from(pending);
            pending.clear();

            for (const callback of callbacks) {
                callback();
            }
        }
    } finally {
        isFlushing = false;
    }
}
