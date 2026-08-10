import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/shell/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { setUserDisabled, setUserRole } from "@/app/actions/admin";
import { startImpersonating } from "@/app/actions/impersonate";

export const metadata: Metadata = { title: "Manage Users" };

export default async function AdminUsersPage() {
  const actor = await requireRole("SUPER_ADMIN");

  const users = await db.user.findMany({
    orderBy: [{ role: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { teamMemberships: true, leagueMemberships: true } },
      leagueMemberships: { include: { league: { select: { name: true } } } },
    },
  });

  return (
    <PageContainer className="py-8 sm:py-10">
      <header className="mb-8">
        <Link href="/admin" className="text-muted hover:text-ink text-sm">
          ← Admin
        </Link>
        <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">Users</h1>
        <p className="text-muted mt-3">
          {users.length} accounts. Roles and access take effect on the next request.
        </p>
      </header>

      <div className="space-y-3">
        {users.map((user) => (
          <Card key={user.id} variant="flat" className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={user.name} src={user.image} size="md" />

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  <Link href={`/profile/${user.id}`} className="hover:underline">
                    {user.name}
                  </Link>
                  {user.id === actor.id ? (
                    <Badge tone="gold" size="xs">
                      You
                    </Badge>
                  ) : null}
                  {user.isDisabled ? (
                    <Badge tone="ember" size="xs">
                      Disabled
                    </Badge>
                  ) : null}
                </p>
                <p className="text-subtle truncate text-xs">{user.email}</p>
                <p className="text-subtle mt-1 truncate text-xs">
                  {user._count.teamMemberships} teams ·{" "}
                  {user.leagueMemberships.map((m) => m.league.name).join(", ") ||
                    "no leagues"}
                </p>
              </div>

              <form action={setUserRole} className="flex items-center gap-2">
                <input type="hidden" name="userId" value={user.id} />
                <Select
                  name="role"
                  defaultValue={user.role}
                  aria-label={`Role for ${user.name}`}
                  className="h-9 w-36"
                  disabled={user.id === actor.id}
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </Select>
                <Button
                  type="submit"
                  variant="subtle"
                  size="sm"
                  disabled={user.id === actor.id}
                >
                  Save
                </Button>
              </form>

              <div className="flex items-center gap-2">
                {user.id !== actor.id ? (
                  <>
                    <form action={startImpersonating.bind(null, user.id)}>
                      <Button type="submit" variant="ghost" size="sm">
                        View as
                      </Button>
                    </form>
                    <form action={setUserDisabled}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input
                        type="hidden"
                        name="disabled"
                        value={user.isDisabled ? "false" : "true"}
                      />
                      <Button
                        type="submit"
                        variant={user.isDisabled ? "subtle" : "ghost"}
                        size="sm"
                      >
                        {user.isDisabled ? "Enable" : "Disable"}
                      </Button>
                    </form>
                  </>
                ) : null}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
