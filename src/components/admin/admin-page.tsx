import Link from "next/link";
import { PageContainer } from "@/components/shell/app-shell";

export function AdminPageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8">
      <Link href="/admin" className="text-muted hover:text-ink text-sm">
        ← Admin
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">{title}</h1>
      {description ? (
        <p className="text-muted mt-3 max-w-2xl">{description}</p>
      ) : null}
      {children}
    </header>
  );
}

export function AdminShell({
  title,
  description,
  children,
  wide,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <PageContainer className={wide ? "py-8 sm:py-10" : "max-w-4xl py-8 sm:py-10"}>
      <AdminPageHeader title={title} description={description} />
      {children}
    </PageContainer>
  );
}
