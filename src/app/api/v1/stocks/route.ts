import { apiJson } from "@/lib/api/respond";
import { getSummary } from "@/lib/api/summary";

export const revalidate = 3600;

/** Every stock we track, with its best figure in each category. */
export function GET() {
  const { stocks } = getSummary();
  return apiJson({ count: stocks.length, items: stocks });
}
