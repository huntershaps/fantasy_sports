import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileView } from "@/components/profile/profile-view";
import { requireViewContext } from "@/lib/session";
import { getCareerStats, getManagerTeams } from "@/lib/queries/career";
import { listAwards } from "@/lib/queries/awards";
import { db } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id }, select: { name: true } });
  return { title: user?.name ?? "Manager" };
}

export default async function ManagerProfilePage({ params }: Props) {
  const { id } = await params;
  const { actor, viewer } = await requireViewContext();

  const person = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, image: true, bio: true },
  });
  if (!person) notFound();

  const [career, teams, awards] = await Promise.all([
    getCareerStats(person.id),
    getManagerTeams(person.id),
    listAwards(actor, { userId: person.id, take: 60 }),
  ]);

  return (
    <ProfileView
      person={person}
      career={career}
      teams={teams}
      awards={awards}
      isSelf={person.id === viewer.id}
    />
  );
}

export const dynamic = "force-dynamic";
