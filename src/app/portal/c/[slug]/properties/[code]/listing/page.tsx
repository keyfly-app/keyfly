import type { Metadata } from "next";
import { ListingTab } from "@/features/properties/ListingTab";
import { PropertyFrame, propertyContext, propertyTitle } from "@/features/properties/PropertyFrame";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; code: string }> }): Promise<Metadata> {
  const { slug, code } = await params;
  return { title: await propertyTitle(slug, code), robots: { index: false } };
}

export default async function CompanyPropertyListing({ params }: { params: Promise<{ slug: string; code: string }> }) {
  const { slug, code } = await params;
  const ctx = await propertyContext(slug, code);
  return (
    <PropertyFrame ctx={ctx} tab="listing">
      <ListingTab ctx={ctx} />
    </PropertyFrame>
  );
}
