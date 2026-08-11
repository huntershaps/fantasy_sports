import { cn } from "@/lib/utils";

const control =
  "w-full rounded-md border border-line bg-surface-2 px-2.5 text-sm text-ink placeholder:text-faint transition-colors hover:border-line-strong focus:border-brand focus:outline-none disabled:opacity-50 aria-[invalid=true]:border-loss";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(control, "h-8", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-20 py-2", className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(control, "h-8 pr-7", className)} {...props} />;
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-ink block text-xs font-medium", className)} {...props} />;
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
        <p className="text-loss text-xs" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-faint text-xs">{hint}</p>
      ) : null}
    </div>
  );
}
