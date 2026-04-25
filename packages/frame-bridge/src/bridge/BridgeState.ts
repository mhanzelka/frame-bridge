import {BridgeStatus, BridgeStateController, TransportType} from "@/bridge/types";

/**
 * Create a BridgeStateController to manage the state of bridge transports
 * @returns BridgeStateController
 */
export const createBridgeState = <T extends any>(initialState: Partial<BridgeStatus>) => {
    let state: BridgeStatus = {
        state: `closed`,
        transports: {
            "post-message-channel": {
                state: `disabled`,
                messageCount: 0,
            },
            "broadcast-channel": {
                state: `disabled`,
                messageCount: 0,
            },
            "message-channel": {
                state: `disabled`,
                messageCount: 0,
            }
        },
        pendingCount: 0,
        origin: undefined,
        ...initialState
    }

    const listeners = new Set<() => void>();

    /**
     * Subscribe to state changes
     * @param listener
     */
    const subscribe = (listener: () => void) => {
        listeners.add(listener);
        return () => {
            listeners.delete(listener)
        };
    }

    /**
     * Emit state change to all listeners
     */
    const emit = () => listeners.forEach(l => l());

    /**
     * Get current state
     */
    const getState = () => state;

    /**
     * Patch state with partial state
     * @param partial
     */
    const patchState = (partial: Partial<BridgeStatus>) => {
        state = {
            ...state,
            ...partial
        }
        emit();
    }

    /**
     * Patch state for a specific transport type
     * @param transportType
     * @param partial
     */
    const patchChannelState = (transportType: TransportType, partial: Partial<BridgeStatus[`transports`][TransportType]>) => {
        state = {
            ...state,
            transports: {
                ...state.transports,
                [transportType]: {
                    ...state.transports[transportType],
                    ...partial
                }
            }
        }
        emit();
    }

    /**
     * Increment message count for a specific transport type
     * @param transportType
     */
    const incMessageCount = (transportType: TransportType) => {
        const current = state.transports[transportType]?.messageCount || 0;
        patchChannelState(transportType, {
            messageCount: current + 1,
        });
    }

    return {
        getState,
        patchState,
        patchChannelState,
        incMessageCount,
        subscribe
    } as BridgeStateController;
}