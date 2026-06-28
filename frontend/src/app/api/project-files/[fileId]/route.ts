import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    fileId: string;
  }>;
};

type ProjectFileRow = {
  original_filename: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
};

export async function GET(_request: Request, context: RouteContext) {
  const { fileId } = await context.params;

  try {
    const supabase = createSupabaseServerClient();
    const fileResult = await supabase
      .from("project_files")
      .select("original_filename,storage_bucket,storage_path,mime_type")
      .eq("id", fileId)
      .single<ProjectFileRow>();

    if (fileResult.error) {
      return NextResponse.json({ error: fileResult.error.message }, { status: 404 });
    }

    const downloadResult = await supabase.storage
      .from(fileResult.data.storage_bucket)
      .download(fileResult.data.storage_path);

    if (downloadResult.error) {
      return NextResponse.json({ error: downloadResult.error.message }, { status: 500 });
    }

    return new Response(downloadResult.data, {
      headers: {
        "Content-Type": fileResult.data.mime_type || "application/octet-stream",
        "Content-Disposition": `inline; filename="${safeHeaderFilename(
          fileResult.data.original_filename,
        )}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not download generated file.",
      },
      { status: 500 },
    );
  }
}

function safeHeaderFilename(filename: string) {
  return filename.replace(/["\r\n]/g, "_");
}
