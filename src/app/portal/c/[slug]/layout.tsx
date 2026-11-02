import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { companyBySlug } from "@/features/companies/accounts";

/** Every /c/<slug>/… page works in that company account: members only, the switcher shows it. */
export default async function CompanyLayout({ params, children }: { params: Promise<{ slug: string }>; children: React.ReactNode }) {
  const { slug } = await params;
  const account = await companyBySlug(slug);
  if (!account) notFound();
  return (
    <Shell site="portal" account={account}>
      {children}
    </Shell>
  );
}
