"use client";

import React, { ReactNode, SetStateAction, useEffect, useState } from "react";

export interface ActionSwitchProps<T extends any> {
    selectedValue: T;
    onSelect: (selection: T | SetStateAction<T>) => any;
    items: T[];
    children: (selection: T, selected: boolean) => ReactNode;
    buttonClassName?: string;
    className?: string;
}

export const TabSwitch = <T extends any>({
    selectedValue: _selectedValue,
    onSelect,
    items,
    children,
    buttonClassName,
    className,
}: ActionSwitchProps<T>) => {
    const [selectedValue, setSelectedValue] = useState<T>(_selectedValue);

    const selectValue = (newValue: T) => {
        if (newValue === selectedValue) return;
        setSelectedValue(newValue);
        onSelect(newValue);
    };

    useEffect(() => {
        setSelectedValue(_selectedValue);
    }, [_selectedValue]);

    return (
        <div className={`flex flex-row items-center ${className ?? ``}`}>
            {items &&
                items.map((item, index) => (
                    <button
                        key={`${item}_${index}`}
                        className={`text-center text-base ${buttonClassName ?? ``}`}
                        onClick={() => selectValue(item)}
                        {...(selectedValue === item ? { "data-selected": true } : {})}
                    >
                        {children(item, selectedValue === item)}
                    </button>
                ))}
        </div>
    );
};
