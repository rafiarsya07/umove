import { useEffect, useState } from "react";
import { useI18n, type Lang } from "..";
import { CORE_IDS, type FaqCategory, type FaqItem } from "./types";

/**
 * FAQ text is loaded on demand, one language at a time, so it doesn't weigh
 * down the first page load. Loaded languages are kept for the session.
 */
const loaders: Record<Lang, () => Promise<{ faq: FaqCategory[] }>> = {
  en: () => import("./en"),
  id: () => import("./id"),
  ms: () => import("./ms"),
};
const loaded: Partial<Record<Lang, FaqCategory[]>> = {};

/** The full FAQ in the current language, or null while it loads. */
export function useFaq(): FaqCategory[] | null {
  const { lang } = useI18n();
  const [data, setData] = useState<{ lang: Lang; faq: FaqCategory[] } | null>(() =>
    loaded[lang] ? { lang, faq: loaded[lang] } : null,
  );
  useEffect(() => {
    if (loaded[lang]) return setData({ lang, faq: loaded[lang] });
    let live = true;
    loaders[lang]()
      .then((m) => {
        loaded[lang] = m.faq;
        if (live) setData({ lang, faq: m.faq });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [lang]);
  return data && data.lang === lang ? data.faq : (loaded[lang] ?? null);
}

/** The handful of core questions shown on the home page, in CORE_IDS order. */
export function useCoreFaq(): FaqItem[] | null {
  const faq = useFaq();
  if (!faq) return null;
  const all = faq.flatMap((c) => c.items);
  return CORE_IDS.map((k) => all.find((i) => i.id === k)).filter((i): i is FaqItem => Boolean(i));
}

export type { FaqCategory, FaqItem };
