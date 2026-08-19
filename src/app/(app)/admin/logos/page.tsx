import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-page";
import { LogoManager } from "@/components/admin/logo-manager";
import { requireRole } from "@/lib/session";
import { getLogoInventory } from "@/lib/queries/logos";

export const metadata: Metadata = { title: "Logos" };

export default async function AdminLogosPage() {
  await requireRole("ADMIN");
  const leagues = await getLogoInventory();

  return (
    <AdminShell
      title="Logos"
      description="Every crest in the archive. Anything set here is pinned, so a sync will not overwrite it."
    >
      <LogoManager leagues={leagues} />
    </AdminShell>
  );
}

export const dynamic = "force-dynamic";
