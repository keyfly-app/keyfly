import type { Metadata } from "next";
import { OverviewTab } from "@/features/properties/OverviewTab";
import { PropertyFrame, propertyContext, propertyTitle } from "@/features/properties/PropertyFrame";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  return {
    title: await propertyTitle(undefined, code),
    robots: { index: false },
  };
}

export default async function PropertyOverview({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ created?: string }> }) {
  const [{ code }, { created }] = await Promise.all([params, searchParams]);
  const ctx = await propertyContext(undefined, code);
  return (
    <PropertyFrame ctx={ctx} tab="overview" created={created === "1"}>
      <OverviewTab ctx={ctx} />
    </PropertyFrame>
  );
}
