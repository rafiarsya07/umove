import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { Container } from "../components/Container";
import { FaqList } from "../components/FaqList";
import { ArrowRightIcon, ChatIcon } from "../components/Icon";
import { btn } from "../components/ui";
import { fmt, useI18n } from "../i18n";
import { useFaq } from "../i18n/faq";

/** Lower-case, accent-free text for forgiving search. */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/**
 * All questions: search, jump to a category, and deep links (/faq#q-cost opens
 * that question). Public; the help chat CTA at the end is for members.
 */
export default function Faq() {
  const { t } = useI18n();
  const f = t.faq;
  const categories = useFaq();
  const { hash } = useLocation();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("all");
  const openId = hash.startsWith("#q-") ? hash.slice(3) : null;

  // A deep link to one question should always be visible, whatever the filters.
  useEffect(() => {
    if (!openId) return;
    setQuery("");
    setCat("all");
    requestAnimationFrame(() => document.getElementById(`q-${openId}`)?.scrollIntoView({ block: "start" }));
  }, [openId]);

  const q = norm(query.trim());
  const shown = useMemo(
    () =>
      categories
        .filter((c) => cat === "all" || c.id === cat)
        .map((c) => ({ ...c, items: q ? c.items.filter((i) => norm(`${i.q} ${i.a}`).includes(q)) : c.items }))
        .filter((c) => c.items.length > 0),
    [categories, cat, q],
  );
  const total = shown.reduce((n, c) => n + c.items.length, 0);

  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-3 py-1.5 text-[0.8125rem] font-medium motion-interactive ${
      active
        ? "bg-foreground text-background"
        : "border border-border bg-card text-foreground-secondary hover:text-foreground"
    }`;

  return (
    <Container className="max-w-3xl! py-10 sm:py-14">
      <h1 className="t-page-title">{f.pageTitle}</h1>
      <p className="t-body mt-1.5 text-foreground-secondary">{f.lead}</p>

      <div className="mt-6">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={f.search}
          aria-label={f.search}
          className="h-11 w-full rounded-full border border-border-input bg-card px-4 text-[0.9375rem] motion-interactive placeholder:text-muted-foreground focus:border-foreground focus:ring-3 focus:ring-foreground/10 focus:outline-none"
        />
        <div className="-mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <button type="button" className={chip(cat === "all")} onClick={() => setCat("all")}>
            {f.all}
          </button>
          {categories.map((c) => (
            <button key={c.id} type="button" className={chip(cat === c.id)} onClick={() => setCat(c.id)}>
              {c.title}
            </button>
          ))}
        </div>
      </div>

      <p className="t-meta mt-4" aria-live="polite">
        {total === 0 ? fmt(f.noResults, { q: query.trim() }) : fmt(f.count, { n: total })}
      </p>

      <div className="mt-2 space-y-10">
        {shown.map((c) => (
          <section key={c.id} id={c.id} className="scroll-mt-24">
            <h2 className="mb-2 text-[0.8125rem] font-semibold tracking-wide text-muted-foreground uppercase">
              {c.title}
            </h2>
            <FaqList items={c.items} anchors open={openId} />
          </section>
        ))}
      </div>

      <div className="mt-12 flex flex-col gap-4 rounded-(--radius-surface) border border-border p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ChatIcon className="size-7 shrink-0" />
          <div>
            <p className="text-[1rem] font-semibold">{f.stillTitle}</p>
            <p className="t-meta">{f.stillBody}</p>
          </div>
        </div>
        <Link to="/help" className={`${btn.primary} shrink-0`}>
          {f.stillButton}
          <ArrowRightIcon />
        </Link>
      </div>
    </Container>
  );
}
