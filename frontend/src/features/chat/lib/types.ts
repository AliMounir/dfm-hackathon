export type { Project, Language, LocalizedText } from "@/lib/projects";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};
