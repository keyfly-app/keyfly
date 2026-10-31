const huf = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 });

export const ft = (n: number | null | undefined) => (n == null ? "–" : `${huf.format(n)} Ft`);
export const datum = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit" }) : "–";

export const APPLICATION_STATUS: Record<string, string> = {
  draft: "Piszkozat",
  submitted: "Beküldve",
  verifying: "Ellenőrzés alatt",
  approved: "Ajánlat kész",
  declined: "Elutasítva",
  accepted: "Elfogadva",
  expired: "Lejárt",
  cancelled: "Visszavonva",
};

export const SEGMENT: Record<string, string> = {
  tenant: "Bérlő",
  landlord: "Bérbeadó",
  agent: "Ingatlaniroda",
  company: "Cég",
};
