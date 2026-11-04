import type { Metadata } from "next";
import { ServicesTab } from "@/features/properties/ServicesTab";
import { PropertyFrame, propertyContext, propertyTitle } from "@/features/properties/PropertyFrame";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  return { title: await propertyTitle(undefined, code), robots: { index: false } };
}

export default async function PropertyServices({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ add?: string }> }) {
  const [{ code }, { add }] = await Promise.all([params, searchParams]);
  const ctx = await propertyContext(undefined, code);
  return (
    <PropertyFrame ctx={ctx} tab="services">
      <ServicesTab ctx={ctx} openAdd={add === "utility" || add === "other" ? add : null} />
    </PropertyFrame>
  );
}
