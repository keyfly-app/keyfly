import type { Metadata } from "next";
import { OverviewTab } from "@/features/properties/OverviewTab";
import { PropertyFrame, propertyContext, propertyTitle } from "@/features/properties/PropertyFrame";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; code: string }> }): Promise<Metadata> {
  const { slug, code } = await params;
  return { title: await propertyTitle(slug, code), robots: { index: false } };
}

export default async function CompanyPropertyOverview({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; code: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ slug, code }, { created }] = await Promise.all([params, searchParams]);
  const ctx = await propertyContext(slug, code);
  return (
    <PropertyFrame ctx={ctx} tab="overview" created={created === "1"}>
      <OverviewTab ctx={ctx} />
    </PropertyFrame>
  );
}
