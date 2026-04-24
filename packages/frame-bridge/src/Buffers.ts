/**
 * A simple ring buffer implementation.
 * @template T - The type of items to be stored in the ring buffer.
 * @param capacity - The maximum number of items the ring buffer can hold.
 * @returns An object with methods to push items, get a snapshot of the buffer, and clear the buffer.
 * @example
 * const ringBuffer = createRingBuffer<number>(3);
 * ringBuffer.push(1);
 * ringBuffer.push(2);
 * ringBuffer.push(3);
 * console.log(ringBuffer.snapshot()); // [1, 2, 3]
 * ringBuffer.push(4);
 * console.log(ringBuffer.snapshot()); // [2, 3, 4]
 * ringBuffer.clear();
 * console.log(ringBuffer.snapshot()); // []
 */
export const createRingBuffer = <T extends any>(capacity: number) => {
    const buffer: T[] = [];
    return {
        push: (item: T) => {
            buffer.push(item);
            if (buffer.length > capacity) {
                buffer.shift();
            }
        },
        snapshot: () => { return [...buffer]},
        clear: () => { buffer.length = 0; }
    }
}