import { apiJson } from "@/lib/api/respond";
import { getSummary } from "@/lib/api/summary";

export const revalidate = 3600;

/** Headline numbers across Earn, Liquidity and Borrow. */
export function GET() {
  return apiJson(getSummary());
}
