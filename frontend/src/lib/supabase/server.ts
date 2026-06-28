import { createClient } from "@supabase/supabase-js";

const DEFAULT_UPLOAD_BUCKET = "dfm-data-uploads";

export type SupabaseServerConfig = {
  url: string;
  serviceRoleKey: string;
  uploadBucket: string;
};

export function getSupabaseServerConfig(): SupabaseServerConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return {
    url,
    serviceRoleKey,
    uploadBucket:
      process.env.SUPABASE_UPLOAD_BUCKET?.trim() || DEFAULT_UPLOAD_BUCKET,
  };
}

export function createSupabaseServerClient() {
  const config = getSupabaseServerConfig();

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
