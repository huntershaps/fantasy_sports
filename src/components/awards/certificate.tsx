import { cn } from "@/lib/utils";

export type CertificateData = {
  serialNumber: string;
  template: string;
  recipientName: string;
  title: string;
  subtitle: string | null;
  leagueName: string;
  seasonLabel: string;
  issuedOn: Date;
  icon: string;
  accentColor: string;
};

const issuedFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** Engraved plaque rather than a printed certificate: double rule, letterspaced
 *  caps, a lot of quiet space, and a serial number in the margin. Real DOM so
 *  it stays crisp, selectable, and prints correctly. */
export function Certificate({
  certificate,
  className,
}: {
  certificate: CertificateData;
  className?: string;
}) {
  return (
    <article
      style={{ ["--cert" as string]: certificate.accentColor }}
      className={cn(
        "bg-surface relative mx-auto w-full max-w-xl border px-8 py-12 text-center sm:px-14 sm:py-16",
        "border-[color:var(--cert)]/45",
        className,
      )}
    >
      {/* Inner rule — the detail that reads as "document". */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-2 border border-[color:var(--cert)]/20"
      />

      <div className="relative">
        <p className="label tracking-[0.22em]">{certificate.leagueName}</p>

        <div
          aria-hidden
          className="mx-auto mt-6 h-px w-full max-w-56"
          style={{ backgroundColor: "color-mix(in srgb, var(--cert) 45%, transparent)" }}
        />

        <p className="mt-8 text-5xl leading-none">{certificate.icon}</p>

        <h2
          className="font-display mt-7 text-lg leading-tight font-semibold tracking-[0.14em] uppercase"
          style={{ color: "var(--cert)" }}
        >
          {certificate.title}
        </h2>

        <p className="text-faint mt-10 text-2xs tracking-[0.18em] uppercase">
          Presented to
        </p>
        <p className="font-display text-ink mt-2.5 text-2xl font-semibold text-balance">
          {certificate.recipientName}
        </p>
        {certificate.subtitle ? (
          <p className="text-muted mt-1 text-sm">{certificate.subtitle}</p>
        ) : null}

        <div
          aria-hidden
          className="mx-auto mt-10 h-px w-full max-w-56"
          style={{ backgroundColor: "color-mix(in srgb, var(--cert) 45%, transparent)" }}
        />

        <p className="text-muted mt-6 text-xs tracking-[0.14em] uppercase">
          {certificate.seasonLabel}
        </p>

        <div className="text-faint mt-10 flex items-baseline justify-between text-2xs">
          <span className="tnum">No. {certificate.serialNumber}</span>
          <span>{issuedFormat.format(certificate.issuedOn)}</span>
        </div>
      </div>
    </article>
  );
}
