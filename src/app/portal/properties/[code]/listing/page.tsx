import type { Metadata } from "next";
import { ListingTab } from "@/features/properties/ListingTab";
import { PropertyFrame, propertyContext, propertyTitle } from "@/features/properties/PropertyFrame";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  return { title: await propertyTitle(undefined, code), robots: { index: false } };
}

export default async function PropertyListing({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ctx = await propertyContext(undefined, code);
  return (
    <PropertyFrame ctx={ctx} tab="listing">
      <ListingTab ctx={ctx} />
    </PropertyFrame>
  );
}
