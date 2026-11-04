import type { Metadata } from "next";
import { DataTab, readSection } from "@/features/properties/DataTab";
import { PropertyFrame, propertyContext, propertyTitle } from "@/features/properties/PropertyFrame";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  return {
    title: await propertyTitle(undefined, code),
    robots: { index: false },
  };
}

export default async function PropertyData({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ edit?: string }> }) {
  const [{ code }, { edit }] = await Promise.all([params, searchParams]);
  const ctx = await propertyContext(undefined, code);
  return (
    <PropertyFrame ctx={ctx} tab="data">
      <DataTab ctx={ctx} open={readSection(edit)} />
    </PropertyFrame>
  );
}
