import type { Locale } from "@/content/types";
import es from "@/messages/es.json";
import ca from "@/messages/ca.json";
import en from "@/messages/en.json";

export type Messages = typeof es;
export type MessageKey = Exclude<keyof Messages, "marquee">;

const ALL: Record<Locale, Messages> = { es, ca, en };

export function getMessages(locale: Locale): Messages {
  return ALL[locale];
}

/** Fills `{name}` placeholders, e.g. format(m.aboutMin, { eta: 45 }). */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? `{${k}}`));
}
