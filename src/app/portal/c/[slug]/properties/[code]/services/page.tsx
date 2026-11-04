import type { Metadata } from "next";
import { ServicesTab } from "@/features/properties/ServicesTab";
import { PropertyFrame, propertyContext, propertyTitle } from "@/features/properties/PropertyFrame";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; code: string }> }): Promise<Metadata> {
  const { slug, code } = await params;
  return { title: await propertyTitle(slug, code), robots: { index: false } };
}

export default async function CompanyPropertyServices({ params, searchParams }: { params: Promise<{ slug: string; code: string }>; searchParams: Promise<{ add?: string }> }) {
  const [{ slug, code }, { add }] = await Promise.all([params, searchParams]);
  const ctx = await propertyContext(slug, code);
  return (
    <PropertyFrame ctx={ctx} tab="services">
      <ServicesTab ctx={ctx} openAdd={add === "utility" || add === "other" ? add : null} />
    </PropertyFrame>
  );
}
