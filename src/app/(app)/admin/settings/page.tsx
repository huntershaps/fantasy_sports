import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "System Settings" };

/** Reports whether required secrets are present. Never renders their values. */
const CHECKS = [
  { key: "DATABASE_URL", label: "Database connection" },
  { key: "AUTH_SECRET", label: "Auth session secret" },
  { key: "CREDENTIAL_ENCRYPTION_KEY", label: "Provider credential encryption key" },
  { key: "YAHOO_CLIENT_ID", label: "Yahoo OAuth client", optional: true },
  { key: "YAHOO_CLIENT_SECRET", label: "Yahoo OAuth secret", optional: true },
];

export default async function AdminSettingsPage() {
  await requireRole("SUPER_ADMIN");

  return (
    <AdminShell
      title="System"
      description="Environment health. Secret values are never displayed — only whether they are set."
    >
      <Card variant="bordered" className="divide-line divide-y">
        {CHECKS.map((check) => {
          const isSet = Boolean(process.env[check.key]);
          return (
            <div key={check.key} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{check.label}</p>
                <p className="text-faint text-xs">
                  <code>{check.key}</code>
                </p>
              </div>
              <Badge
                size="xs"
                tone={isSet ? "win" : check.optional ? "neutral" : "loss"}
              >
                {isSet ? "Set" : check.optional ? "Not configured" : "Missing"}
              </Badge>
            </div>
          );
        })}
      </Card>

      <Card variant="bordered" className="mt-4 p-5">
        <p className="text-sm font-semibold">Email delivery</p>
        <p className="text-muted mt-1.5 text-sm leading-relaxed">
          No mail transport is configured. Password reset generates a valid token
          and, in development, shows the link on screen instead of emailing it.
          Production use needs a mail provider wired into the reset action.
        </p>
      </Card>
    </AdminShell>
  );
}

export const dynamic = "force-dynamic";
