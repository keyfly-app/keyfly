import type { Metadata } from "next";
import { DataTab, readSection } from "@/features/properties/DataTab";
import { PropertyFrame, propertyContext, propertyTitle } from "@/features/properties/PropertyFrame";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; code: string }> }): Promise<Metadata> {
  const { slug, code } = await params;
  return { title: await propertyTitle(slug, code), robots: { index: false } };
}

export default async function CompanyPropertyData({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; code: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const [{ slug, code }, { edit }] = await Promise.all([params, searchParams]);
  const ctx = await propertyContext(slug, code);
  return (
    <PropertyFrame ctx={ctx} tab="data">
      <DataTab ctx={ctx} open={readSection(edit)} />
    </PropertyFrame>
  );
}
