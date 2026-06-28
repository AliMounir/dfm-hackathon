import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import {
  createSupabaseServerClient,
  getSupabaseServerConfig,
} from "@/lib/supabase/server";
import { projects } from "@/lib/projects";

export const runtime = "nodejs";

type UploadStageStatus = "done" | "active" | "waiting" | "error";

type WorkflowStage = {
  key:
    | "received"
    | "folder"
    | "convert"
    | "extract"
    | "quality"
    | "approval";
  status: UploadStageStatus;
};

type ProjectTarget = {
  id: string;
  name: string;
  folder: string;
  source: "existing" | "auto" | "created";
};

const WORKFLOW_STAGES: WorkflowStage[] = [
  { key: "received", status: "done" },
  { key: "folder", status: "done" },
  { key: "convert", status: "waiting" },
  { key: "extract", status: "waiting" },
  { key: "quality", status: "waiting" },
  { key: "approval", status: "waiting" },
];

export async function POST(request: Request) {
  let config;

  try {
    config = getSupabaseServerConfig();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Supabase is not configured." },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const projectId = String(formData.get("projectId") ?? "auto");
  const files = formData
    .getAll("files")
    .filter((file): file is File => file instanceof File && file.size > 0);

  if (files.length === 0) {
    return NextResponse.json(
      { error: "Upload at least one file before starting the workflow." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServerClient();
  const batchId = randomUUID();
  const targetProject = resolveProjectTarget(projectId, files);

  const projectResult = await supabase.from("projects").upsert(
    {
      id: targetProject.id,
      name: targetProject.name,
      slug: targetProject.id,
      folder_path: targetProject.folder,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (projectResult.error) {
    return NextResponse.json(
      { error: projectResult.error.message },
      { status: 500 },
    );
  }

  const batchResult = await supabase
    .from("upload_batches")
    .insert({
      id: batchId,
      project_id: targetProject.id,
      status: "received",
      source: "web-upload",
      file_count: files.length,
    });

  if (batchResult.error) {
    return NextResponse.json({ error: batchResult.error.message }, { status: 500 });
  }

  const uploadedFiles = [];

  for (const file of files) {
    const safeName = sanitizeFileName(file.name);
    const storagePath = `${targetProject.id}/${batchId}/${safeName}`;
    const fileBuffer = await file.arrayBuffer();
    const storageResult = await supabase.storage
      .from(config.uploadBucket)
      .upload(storagePath, fileBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (storageResult.error) {
      await markBatchFailed(supabase, batchId, storageResult.error.message);

      return NextResponse.json(
        { error: storageResult.error.message },
        { status: 500 },
      );
    }

    const fileId = randomUUID();
    const metadataResult = await supabase.from("project_files").insert({
      id: fileId,
      batch_id: batchId,
      project_id: targetProject.id,
      original_filename: file.name,
      storage_bucket: config.uploadBucket,
      storage_path: storagePath,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      kind: detectFileKind(file.name, file.type),
      status: "uploaded",
    });

    if (metadataResult.error) {
      await markBatchFailed(supabase, batchId, metadataResult.error.message);

      return NextResponse.json(
        { error: metadataResult.error.message },
        { status: 500 },
      );
    }

    uploadedFiles.push({
      id: fileId,
      name: file.name,
      sizeBytes: file.size,
      kind: detectFileKind(file.name, file.type),
      storagePath,
    });
  }

  const stepRows = WORKFLOW_STAGES.map((stage, index) => ({
    batch_id: batchId,
    project_id: targetProject.id,
    step_key: stage.key,
    status: stage.status,
    sort_order: index + 1,
  }));
  const stepsResult = await supabase.from("upload_workflow_steps").insert(stepRows);

  if (stepsResult.error) {
    await markBatchFailed(supabase, batchId, stepsResult.error.message);

    return NextResponse.json({ error: stepsResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    batchId,
    project: targetProject,
    files: uploadedFiles,
    stages: WORKFLOW_STAGES,
  });
}

function resolveProjectTarget(projectId: string, files: File[]): ProjectTarget {
  if (projectId !== "auto" && projectId !== "new") {
    const project = projects.find((candidate) => candidate.id === projectId);

    if (project) {
      return {
        id: project.id,
        name: project.name,
        folder: project.folder,
        source: "existing",
      };
    }
  }

  if (projectId === "auto") {
    const filenames = files.map((file) => file.name.toLowerCase()).join(" ");
    const inferredProject = projects.find((project) => {
      const projectTokens = [project.id, project.name, project.folder]
        .join(" ")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);

      return projectTokens.some((token) => filenames.includes(token));
    });

    if (inferredProject) {
      return {
        id: inferredProject.id,
        name: inferredProject.name,
        folder: inferredProject.folder,
        source: "auto",
      };
    }
  }

  const fallbackName = titleizeFileStem(files[0]?.name ?? "uploaded-project");
  const fallbackId = slugify(fallbackName || "uploaded-project");

  return {
    id: fallbackId,
    name: fallbackName,
    folder: `data/projects/${fallbackId}`,
    source: "created",
  };
}

function detectFileKind(filename: string, mimeType: string) {
  const extension = filename.split(".").pop()?.toLowerCase();

  if (extension === "xlsx" || extension === "xls") return "excel";
  if (extension === "csv" || extension === "tsv") return "csv";
  if (extension === "json") return "json";
  if (extension === "zip") return "archive";
  if (mimeType.includes("pdf")) return "pdf";

  return "unknown";
}

function sanitizeFileName(filename: string) {
  const [name, ...extensionParts] = filename.split(".");
  const extension = extensionParts.length > 0 ? `.${extensionParts.pop()}` : "";

  return `${slugify(name || "upload")}${extension.toLowerCase()}`;
}

function titleizeFileStem(filename: string) {
  const stem = filename.replace(/\.[^.]+$/, "");

  return stem
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function markBatchFailed(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  batchId: string,
  errorMessage: string,
) {
  await supabase
    .from("upload_batches")
    .update({ status: "failed", error_message: errorMessage })
    .eq("id", batchId);
}
