import { Children, cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";

/** Merges its props onto a single child element, so `asChild` can turn a
 *  Button into a Link without nesting an <a> inside a <button>.
 *
 *  Deliberately tolerant rather than using Children.only: across the server/
 *  client boundary the child can arrive wrapped or alongside whitespace nodes,
 *  and throwing there would take down the whole page over a formatting detail.
 *  If no element is found we render the children untouched. */
export function Slot({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  const child = Children.toArray(children).find((node) => isValidElement(node));

  if (!isValidElement<{ className?: string }>(child)) {
    return <>{children}</>;
  }

  return cloneElement(child, {
    ...props,
    ...child.props,
    className: cn(className, child.props.className),
  });
}
