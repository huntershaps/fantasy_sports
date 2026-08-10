import type { Metadata } from "next";
import { PageContainer } from "@/components/shell/app-shell";
import { requireViewContext } from "@/lib/session";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const { viewer } = await requireViewContext();

  return (
    <PageContainer className="py-8">
      <p className="eyebrow mb-2">Your dashboard</p>
      <h1 className="text-4xl font-extrabold">
        Welcome back, {viewer.name.split(" ")[0]}.
      </h1>
    </PageContainer>
  );
}
