import { useI18n } from "..";
import { faq as en } from "./en";
import { faq as id } from "./id";
import { faq as ms } from "./ms";
import { CORE_IDS, type FaqCategory, type FaqItem } from "./types";

const BY_LANG = { en, id, ms } as const;

/** The full FAQ in the current language, grouped by category. */
export function useFaq(): FaqCategory[] {
  return BY_LANG[useI18n().lang];
}

/** The handful of core questions shown on the home page, in CORE_IDS order. */
export function useCoreFaq(): FaqItem[] {
  const all = useFaq().flatMap((c) => c.items);
  return CORE_IDS.map((k) => all.find((i) => i.id === k)).filter((i): i is FaqItem => Boolean(i));
}

export type { FaqCategory, FaqItem };
