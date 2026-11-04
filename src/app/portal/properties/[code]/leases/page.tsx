import type { Metadata } from "next";
import { LeasesTab } from "@/features/properties/LeasesTab";
import { PropertyFrame, propertyContext, propertyTitle } from "@/features/properties/PropertyFrame";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  return {
    title: await propertyTitle(undefined, code),
    robots: { index: false },
  };
}

export default async function PropertyLeases({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ctx = await propertyContext(undefined, code);
  return (
    <PropertyFrame ctx={ctx} tab="leases">
      <LeasesTab ctx={ctx} />
    </PropertyFrame>
  );
}
