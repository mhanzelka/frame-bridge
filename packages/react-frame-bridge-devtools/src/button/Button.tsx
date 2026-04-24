"use client";

import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    selected?: boolean;
}

export const Button = ({ selected, ...props }: ButtonProps) => {
    return (
        <button type="button" {...props} className={clsx(`focus:outline-none`, props.className)} data-selected={selected}>
            {props.children}
        </button>
    );
};
