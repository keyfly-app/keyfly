import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";
import { LoginCard, Shell } from "@/components/Shell";

export const metadata: Metadata = { title: "Belépés" };

export default async function PortalLogin({ searchParams }: { searchParams: Promise<{ hiba?: string }> }) {
  const { hiba } = await searchParams;
  return (
    <Shell site="portal">
      <LoginCard title="Belépés a Keyflyba" text="Bérlőknek, bérbeadóknak és partnereinknek.">
        {hiba && (
          <p className="mb-4 rounded-2xl bg-warn px-4 py-3 text-sm font-semibold text-[#6B3D00]">
            A link lejárt vagy már felhasználtad. Kérj újat.
          </p>
        )}
        <LoginForm site="portal" />
      </LoginCard>
    </Shell>
  );
}
