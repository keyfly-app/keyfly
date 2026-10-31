/** Illustrative figures used on the coming-soon page (example card, FAQ, trust section). Not an offer. */
export const EXAMPLE = {
  rent: 350_000,
  depositMonths: 3,
  /** About 6 % a year of the deposit, per month. */
  monthlyFee: 5_250,
} as const;

/** The deposit the tenant keeps in the example. */
export const EXAMPLE_DEPOSIT = EXAMPLE.rent * EXAMPLE.depositMonths;
