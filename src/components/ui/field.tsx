import { cn } from "@/lib/utils";

const control =
  "w-full rounded-xl border border-line bg-surface-2 px-3.5 text-sm text-ink placeholder:text-subtle transition-colors hover:border-line-strong focus:border-gold focus:outline-none disabled:opacity-50 aria-[invalid=true]:border-ember";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea className={cn(control, "min-h-24 py-2.5", className)} {...props} />
  );
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(control, "h-10 appearance-none pr-9", className)}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("text-ink block text-sm font-medium", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-ember text-xs" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-subtle text-xs">{hint}</p>
      ) : null}
    </div>
  );
}
