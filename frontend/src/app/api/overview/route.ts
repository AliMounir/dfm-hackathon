import { NextResponse } from "next/server";

import { createOverview } from "@/lib/dashboard-api";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(createOverview());
}
