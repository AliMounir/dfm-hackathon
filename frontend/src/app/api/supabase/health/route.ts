import { NextResponse } from "next/server";

import {
  createSupabaseServerClient,
  getSupabaseServerConfig,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

type CheckResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

const REQUIRED_TABLES = [
  "projects",
  "upload_batches",
  "project_files",
  "upload_workflow_steps",
] as const;

export async function GET() {
  const checks: CheckResult[] = [];
  let config;

  try {
    config = getSupabaseServerConfig();
    checks.push({
      name: "environment",
      ok: true,
      detail: "Supabase URL and service-role key are configured.",
    });
  } catch (error) {
    checks.push({
      name: "environment",
      ok: false,
      detail:
        error instanceof Error
          ? error.message
          : "Supabase environment values are missing.",
    });

    return NextResponse.json(
      {
        ok: false,
        checks,
      },
      { status: 500 },
    );
  }

  const supabase = createSupabaseServerClient();
  const bucketResult = await supabase.storage.getBucket(config.uploadBucket);

  checks.push({
    name: "storage_bucket",
    ok: !bucketResult.error,
    detail: bucketResult.error
      ? bucketResult.error.message
      : `Bucket ${config.uploadBucket} is reachable.`,
  });

  for (const table of REQUIRED_TABLES) {
    const tableResult = await supabase.from(table).select("*", { count: "exact", head: true });

    checks.push({
      name: `table_${table}`,
      ok: !tableResult.error,
      detail: tableResult.error
        ? tableResult.error.message
        : `Table ${table} is reachable.`,
    });
  }

  const ok = checks.every((check) => check.ok);

  return NextResponse.json(
    {
      ok,
      bucket: config.uploadBucket,
      checks,
    },
    { status: ok ? 200 : 500 },
  );
}
