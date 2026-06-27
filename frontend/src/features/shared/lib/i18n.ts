import type { Language, LocalizedText } from "@/lib/projects";

export type { Language, LocalizedText };

/** Resolve a bilingual string for the active language, with fallbacks. */
export function t(text: LocalizedText | undefined, lang: Language): string {
  if (!text) return "";
  return text[lang] ?? text.fr ?? text.en ?? "";
}
