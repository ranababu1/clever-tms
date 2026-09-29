export interface Pricing {
  inputPer1M: number;
  outputPer1M: number;
}

// Approximate USD → INR rate. Not fetched live (pricing display is a rough guide, not a
// billing statement) — bump this occasionally if the real rate drifts far from it.
export const USD_TO_INR = 88;

export function usdToInr(usd: number): number {
  return usd * USD_TO_INR;
}

// Cost to translate ~1,00,000 (1 lakh) characters, counted as both input AND output tokens —
// a translation round-trip reads and writes roughly that much text. Uses the same
// "~4 characters per token" estimate already shown elsewhere in the UI (char counters).
// Doubled to reflect the draft+critique+final generation actually billed per request.
export function costPerLakhChars(pricing: Pricing): number {
  const tokens = 100_000 / 4;
  const roundTripCost = (tokens / 1_000_000) * pricing.inputPer1M + (tokens / 1_000_000) * pricing.outputPer1M;
  return roundTripCost * 2;
}

export function formatUsd(usd: number): string {
  if (usd === 0) return "$0.00";
  return `$${usd < 0.01 ? usd.toFixed(4) : usd.toFixed(2)}`;
}

export function formatInr(usd: number): string {
  const inr = usdToInr(usd);
  if (inr === 0) return "₹0.00";
  return `₹${inr < 1 ? inr.toFixed(3) : inr.toFixed(2)}`;
}
