
export type PendingStoreProps = {
    onChange?: (count: number) => void
};

export type PendingStore = {
    resolve: (data: any) => void,
    reject: (error: Error) => void,
    timeout: number,
    timeoutError?: Error,
    onTimeout?: () => void,
}

export const createPendingStore = (props?: PendingStoreProps) => {
    const map = new Map<string, PendingStore>();
    const onChange = props?.onChange;

    const addPending = (messageId: string, data: PendingStore) => {
        const t = setTimeout(() => {
            if (!map.has(messageId)) return;
            const p = map.get(messageId)!;
            map.delete(messageId);
            p.reject(data.timeoutError ?? new Error(`Pending message timeout msgId=${messageId}`));
            data.onTimeout?.();
        }, data.timeout);
        map.set(messageId, {
            resolve: data.resolve,
            reject: data.reject,
            timeout: t
        });
        onChange?.(map.size);
    }

    const resolvePending = (messageId: string, data: any) => {
        if (!map.has(messageId)) return false;
        const p = map.get(messageId)!;
        clearTimeout(p.timeout);
        map.delete(messageId);
        p.resolve(data);
        onChange?.(map.size);
        return true;
    }

    const rejectPending = (messageId: string, error: Error) => {
        if (!map.has(messageId)) return false;
        const p = map.get(messageId)!;
        clearTimeout(p.timeout);
        map.delete(messageId);
        p.reject(error);
        onChange?.(map.size);
        return true;
    }

    const hasPending = (messageId: string) => map.has(messageId);
    const clearAll = () => {
        map.forEach((p) => {
            clearTimeout(p.timeout);
            p.reject(new Error(`Pending message cleared`));
        });
        map.clear();
        onChange?.(0);
    }

    return {
        addPending,
        resolvePending,
        rejectPending,
        hasPending,
        clearAll
    }
}