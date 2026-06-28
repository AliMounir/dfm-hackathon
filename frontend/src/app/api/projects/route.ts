import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { projects } from "@/lib/projects";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const result = await supabase
      .from("projects")
      .select("id,name,slug,folder_path,description,created_at,updated_at")
      .order("name", { ascending: true });

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({
      source: "supabase",
      projects: result.data.map((project) => ({
        id: project.id,
        name: project.name,
        slug: project.slug,
        folder: project.folder_path,
        description: project.description,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
      })),
    });
  } catch {
    return NextResponse.json({
      source: "local",
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        slug: project.id,
        folder: project.folder,
        description: project.focus.fr,
        createdAt: null,
        updatedAt: null,
      })),
    });
  }
}

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    id?: string;
    name?: string;
    folder?: string;
    description?: string;
  };
  const name = payload.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServerClient();
    const id = payload.id?.trim() || slugify(name);
    const folder = payload.folder?.trim() || `data/projects/${id}`;
    const result = await supabase
      .from("projects")
      .upsert(
        {
          id,
          name,
          slug: id,
          folder_path: folder,
          description: payload.description?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .select("id,name,slug,folder_path,description,created_at,updated_at")
      .single();

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        project: {
          id: result.data.id,
          name: result.data.name,
          slug: result.data.slug,
          folder: result.data.folder_path,
          description: result.data.description,
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Supabase is not configured.",
      },
      { status: 500 },
    );
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
