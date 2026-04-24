import {
    BridgeObserver,
    BridgeObserverEventParamPayload,
} from "@/bridge/observer/types";
import {TransportType} from "@/bridge";
import * as logger from "@/logger";

export const createBridgeObserver = <T extends any>(bridgeId: string, channelName: string) => {
    const observers: BridgeObserver<T>[] = [];

    const notifyObservers = (
        transportType: TransportType,
        event: BridgeObserverEventParamPayload<T>
    ) => {
        observers.forEach(observer => {
            try {
                observer({channelName, transportType, ...event});
            } catch (e) {
                logger.error(`[BridgeObserver:${bridgeId}] Observer error:`, e);
            }
        });
    }

    const removeObserver = (observer: BridgeObserver<T>) => {
        const index = observers.indexOf(observer);
        if (index !== -1) observers.splice(index, 1);
    }

    const addObserver = (observer: BridgeObserver<T>) => {
        if (!observers.includes(observer)) observers.push(observer);
        return () => removeObserver(observer);
    }

    return { notifyObservers, addObserver }
}
