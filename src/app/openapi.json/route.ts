import { NextResponse } from "next/server";
import { openapi } from "@/lib/api/openapi";

export const revalidate = 3600;

export function GET() {
  return NextResponse.json(openapi(), { headers: { "access-control-allow-origin": "*" } });
}
