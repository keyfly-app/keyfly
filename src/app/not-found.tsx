import Link from "next/link";
import { LogoFull } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-4 px-4">
      <LogoFull height={28} />
      <h1 className="font-display text-4xl font-bold">Ez az oldal nem létezik.</h1>
      <Link href="/" className="rounded-full bg-green px-6 py-3 font-bold text-white">Vissza a főoldalra</Link>
    </div>
  );
}
