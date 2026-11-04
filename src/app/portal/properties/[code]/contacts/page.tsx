import type { Metadata } from "next";
import { ContactsTab } from "@/features/properties/ContactsTab";
import { PropertyFrame, propertyContext, propertyTitle } from "@/features/properties/PropertyFrame";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  return { title: await propertyTitle(undefined, code), robots: { index: false } };
}

export default async function PropertyContacts({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ add?: string }> }) {
  const [{ code }, { add }] = await Promise.all([params, searchParams]);
  const ctx = await propertyContext(undefined, code);
  return (
    <PropertyFrame ctx={ctx} tab="contacts">
      <ContactsTab ctx={ctx} openAdd={add === "1"} />
    </PropertyFrame>
  );
}
