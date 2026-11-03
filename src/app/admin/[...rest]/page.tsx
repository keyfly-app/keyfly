import { notFound } from "next/navigation";

/** Any address without a page: the Keyfly 404 (not-found.tsx next to this folder). */
export default function UnknownPage() {
  notFound();
}
