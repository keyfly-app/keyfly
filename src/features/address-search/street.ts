import { withDot } from "@/lib/address";
import type { FoundAddress } from "./places";

/** The street line of a picked address: "Pozsonyi út 12." in Hungary, "Hauptstraße 5" elsewhere. */
export function pickedStreet(a: FoundAddress, country = "HU"): string {
  const route = `${a.streetName} ${a.streetType}`.trim();
  if (!a.houseNumber) return route;
  return country === "HU" ? `${route} ${withDot(a.houseNumber)}` : `${route} ${a.houseNumber}`;
}
