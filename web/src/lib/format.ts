export function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export function formatMonth(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(iso));
}

export function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

/** "5 min ago", "2 hr ago", in the current language. */
export function timeAgo(iso: string, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  const sec = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(sec);
  if (abs < 60) return rtf.format(Math.round(sec), "second");
  if (abs < 3600) return rtf.format(Math.round(sec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(sec / 3600), "hour");
  return rtf.format(Math.round(sec / 86400), "day");
}

/** 300 sen → "RM3", 250 → "RM2.50". */
export function ringgit(sen: number): string {
  return `RM${sen % 100 === 0 ? sen / 100 : (sen / 100).toFixed(2)}`;
}
