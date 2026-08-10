import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-line rounded-card flex flex-col items-center justify-center border border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="bg-surface-2 text-subtle mb-4 grid size-12 place-items-center rounded-2xl">
          <Icon className="size-5" />
        </div>
      ) : null}
      <p className="text-base font-semibold">{title}</p>
      {description ? (
        <p className="text-muted mt-1.5 max-w-sm text-sm leading-relaxed">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
