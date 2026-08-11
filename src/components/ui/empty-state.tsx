import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-line flex flex-col items-start border-t",
        compact ? "py-6" : "py-10",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        {Icon ? <Icon className="text-faint size-4" /> : null}
        <p className="text-ink text-base font-medium">{title}</p>
      </div>
      {description ? (
        <p className="text-muted mt-1.5 max-w-md text-sm leading-relaxed">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
