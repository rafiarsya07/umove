import { useEffect, useState } from "react";
import { useI18n, type Lang } from "..";
import type { Legal } from "./types";

/** Privacy and terms text, loaded on demand in the current language. */
const loaders: Record<Lang, () => Promise<{ legal: Legal }>> = {
  en: () => import("./en"),
  id: () => import("./id"),
  ms: () => import("./ms"),
};

export function useLegal(): Legal | null {
  const { lang } = useI18n();
  const [data, setData] = useState<{ lang: Lang; legal: Legal } | null>(null);
  useEffect(() => {
    let live = true;
    loaders[lang]()
      .then((m) => live && setData({ lang, legal: m.legal }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [lang]);
  return data && data.lang === lang ? data.legal : null;
}
