"use client";

import { Children, cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";

/** Merges its props onto a single child element, so `asChild` can turn a
 *  Button into a Link without nesting an <a> inside a <button>. */
export function Slot({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  const child = Children.only(children);
  if (!isValidElement<Record<string, unknown>>(child)) return null;

  return cloneElement(child, {
    ...props,
    ...child.props,
    className: cn(className, child.props.className as string | undefined),
  });
}
