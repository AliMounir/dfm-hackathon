export type { Project, Language } from "@/lib/projects";

export type DataFile = {
  id: string;
  filename: string;
  kind: "redcap" | "dhis2" | "excel" | "csv" | "pdf" | "unknown";
  sizeBytes: number;
};
