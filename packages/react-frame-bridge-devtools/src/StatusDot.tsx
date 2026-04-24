"use client";

export interface StatusDotProps<T extends string = any> {
    status?: T;
    statusMap: Record<T, string>;
}

export const StatusDot = <T extends string>({ status, statusMap }: StatusDotProps<T>) => {
    return (
        <span className={`inline-block size-2 rounded-full ${status ? statusMap[status] : `bg-gray-400`}`} />
    );
};
