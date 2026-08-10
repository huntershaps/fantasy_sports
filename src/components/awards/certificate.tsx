import { BrandMark } from "@/components/brand";
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

/** Rendered as real DOM rather than an image so it stays crisp at any size,
 *  is selectable and screen-reader legible, and prints correctly. */
export function Certificate({
  certificate,
  className,
}: {
  certificate: CertificateData;
  className?: string;
}) {
  const isChampion = certificate.template === "champion";

  return (
    <article
      style={{ ["--cert" as string]: certificate.accentColor }}
      className={cn(
        "relative isolate mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border-2 p-8 text-center sm:p-12",
        "border-[color:var(--cert)]/45 bg-surface shadow-pop",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.09]"
        style={{
          background:
            "radial-gradient(70% 55% at 50% 0%, var(--cert), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="noise pointer-events-none absolute inset-0 -z-10 opacity-[0.35] mix-blend-overlay"
      />
      {/* Inner hairline frame — the detail that reads as "document". */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-3 rounded-xl border border-[color:var(--cert)]/25"
      />

      <div className="relative">
        <BrandMark className="mx-auto size-9" />

        <p className="eyebrow mt-6 mb-8">{certificate.leagueName}</p>

        <p className="text-6xl leading-none sm:text-7xl">{certificate.icon}</p>

        <h2
          className="font-display mt-6 text-2xl leading-tight font-extrabold tracking-[0.08em] uppercase sm:text-3xl"
          style={{ color: "var(--cert)" }}
        >
          {certificate.title}
        </h2>

        <div
          aria-hidden
          className="mx-auto my-7 h-px w-24"
          style={{ backgroundColor: "color-mix(in srgb, var(--cert) 50%, transparent)" }}
        />

        <p className="text-subtle text-xs tracking-[0.16em] uppercase">
          Presented to
        </p>
        <p className="font-display mt-3 text-3xl font-extrabold text-balance sm:text-4xl">
          {certificate.recipientName}
        </p>
        {certificate.subtitle ? (
          <p className="text-muted mt-2 text-lg">{certificate.subtitle}</p>
        ) : null}

        <p className="text-muted mt-7 text-sm">
          {certificate.seasonLabel}
          {isChampion ? " · Champion" : ""}
        </p>

        <div className="border-line text-subtle mt-9 flex flex-wrap items-center justify-between gap-2 border-t pt-5 text-[11px]">
          <span>No. {certificate.serialNumber}</span>
          <span>Issued {issuedFormat.format(certificate.issuedOn)}</span>
        </div>
      </div>
    </article>
  );
}
