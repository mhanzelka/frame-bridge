import {TransportType} from "@/bridge";

/**
 * Get transports with prioritized transport first
 * @param transports - Available transports
 * @param priority - Transport to prioritize
 * @returns Transports with prioritized transport first
 */
export const getPrioritizedTransports = (
    transports: TransportType[],
    priority?: TransportType
): TransportType[] => {
    if (!priority || !transports.includes(priority)) {
        return transports;
    }
    return [
        priority,
        ...transports.filter(t => t !== priority)
    ];
}