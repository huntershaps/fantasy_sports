import Link from "next/link";
import { Tabs } from "@/components/ui/segmented";
import { PageContainer } from "@/components/shell/app-shell";
import { Chips } from "@/components/ui/segmented";
import { Crest } from "@/components/ui/crest";

export type LeagueHeaderProps = {
  slug: string;
  name: string;
  logoUrl?: string | null;
  tagline: string | null;
  accentColor: string;
  foundedYear: number;
  seasonCount: number;
  managerCount: number;
  currentTab: string;
  seasons: { year: number }[];
  activeYear: number;
  championLine?: string | null;
};

/** The league's front door. A coloured rule carries the league's identity —
 *  no hero image, no gradient wash, no oversized name. */
export function LeagueHeader({
  slug,
  name,
  logoUrl,
  tagline,
  accentColor,
  foundedYear,
  seasonCount,
  managerCount,
  currentTab,
  seasons,
  activeYear,
  championLine,
}: LeagueHeaderProps) {
  const tabs = [
    { value: "overview", label: "Overview", href: `/league/${slug}?season=${activeYear}` },
    { value: "schedule", label: "Schedule", href: `/league/${slug}/schedule?season=${activeYear}` },
    { value: "standings", label: "Standings", href: `/league/${slug}/standings?season=${activeYear}` },
    { value: "history", label: "History", href: `/history?league=${slug}` },
    { value: "memories", label: "Memories", href: `/memories?league=${slug}` },
    { value: "awards", label: "Awards", href: `/awards?league=${slug}` },
    { value: "records", label: "Records", href: `/records?league=${slug}` },
  ];

  return (
    <div className="border-line border-b">
      <PageContainer width="wide" className="pt-6">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <Crest name={name} src={logoUrl} size="2xl" className="hidden sm:block" />
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-3.5 w-1 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
                <span className="label">Est. {foundedYear}</span>
              </div>
              <h1 className="text-2xl leading-none font-semibold">{name}</h1>
              {tagline ? <p className="text-muted mt-1.5 text-base">{tagline}</p> : null}
            </div>
          </div>

          <dl className="flex flex-wrap items-end gap-x-7 gap-y-2">
            <HeaderStat label="Season" value={String(activeYear)} />
            <HeaderStat label="Seasons" value={String(seasonCount)} />
            <HeaderStat label="Managers" value={String(managerCount)} />
            {championLine ? (
              <div className="min-w-0">
                <dt className="label mb-0.5">Champion</dt>
                <dd className="text-ink max-w-[14rem] truncate text-sm font-medium">
                  {championLine}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
          <Tabs items={tabs} active={currentTab} className="min-w-0 flex-1" />
        </div>

        <div className="py-2.5">
          <Chips
            active={String(activeYear)}
            items={seasons.map((s) => ({
              value: String(s.year),
              label: String(s.year),
              href: hrefForTab(currentTab, slug, s.year),
            }))}
          />
        </div>
      </PageContainer>
    </div>
  );
}

function hrefForTab(tab: string, slug: string, year: number): string {
  if (tab === "schedule") return `/league/${slug}/schedule?season=${year}`;
  if (tab === "standings") return `/league/${slug}/standings?season=${year}`;
  return `/league/${slug}?season=${year}`;
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label mb-0.5">{label}</dt>
      <dd className="figure-num tnum text-ink text-lg">{value}</dd>
    </div>
  );
}

export { Link };
