import { notFound } from "next/navigation";
import { companyBySlug } from "@/features/companies/accounts";

/** Every /c/<slug>/… page works in that company account: members only. Each page puts itself in the Shell. */
export default async function CompanyLayout({ params, children }: { params: Promise<{ slug: string }>; children: React.ReactNode }) {
  const { slug } = await params;
  if (!(await companyBySlug(slug))) notFound();
  return children;
}
