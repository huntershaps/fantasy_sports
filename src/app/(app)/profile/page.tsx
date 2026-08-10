import type { Metadata } from "next";
import { ProfileView } from "@/components/profile/profile-view";
import { requireViewContext } from "@/lib/session";
import { getCareerStats, getManagerTeams } from "@/lib/queries/career";
import { listAwards } from "@/lib/queries/awards";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { actor, viewer } = await requireViewContext();

  const [person, career, teams, awards] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: viewer.id },
      select: { id: true, name: true, image: true, bio: true },
    }),
    getCareerStats(viewer.id),
    getManagerTeams(viewer.id),
    listAwards(actor, { userId: viewer.id, take: 60 }),
  ]);

  return (
    <ProfileView
      person={person}
      career={career}
      teams={teams}
      awards={awards}
      isSelf
    />
  );
}

export const dynamic = "force-dynamic";
