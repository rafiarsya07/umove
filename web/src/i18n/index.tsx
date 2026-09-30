import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { en, type Dict } from "./en";
import { id } from "./id";
import { ms } from "./ms";

export const LANGS = [
  { code: "en", short: "EN", dict: en, locale: "en-MY" },
  { code: "id", short: "ID", dict: id, locale: "id-ID" },
  { code: "ms", short: "MS", dict: ms, locale: "ms-MY" },
] as const;

export type Lang = (typeof LANGS)[number]["code"];
const KEY = "umove-lang";

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "id" || saved === "ms") return saved;
  } catch {
    /* storage unavailable */
  }
  for (const l of navigator.languages ?? [navigator.language]) {
    const code = l.toLowerCase();
    if (code.startsWith("id") || code.startsWith("in")) return "id";
    if (code.startsWith("ms")) return "ms";
    if (code.startsWith("en")) return "en";
  }
  return "en";
}

/** Fill `{name}` placeholders. */
export function fmt(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

type Ctx = { lang: Lang; locale: string; setLang: (l: Lang) => void; t: Dict };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(detect);
  const entry = LANGS.find((l) => l.code === lang)!;

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = entry.dict.meta.title;
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* storage unavailable */
    }
  }, [lang, entry]);

  return (
    <I18nContext.Provider value={{ lang, locale: entry.locale, setLang, t: entry.dict }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
