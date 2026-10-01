import { Link } from "react-router";
import { Container } from "../components/Container";
import { HowItWorks } from "../components/HowItWorks";
import { StatusDot } from "../components/StatusScene";
import { ringgit, timeAgo } from "../lib/format";
import { useBoard } from "../lib/useBoard";
import { ArrowRightIcon, PlusIcon, QuestionIcon, StepsIcon } from "../components/Icon";
import { SectionHeading, btn } from "../components/ui";
import { fmt, useI18n } from "../i18n";
import { useCoreFaq } from "../i18n/faq";
import { FaqList } from "../components/FaqList";

/**
 * Home, built around the one thing people come for:
 *   1. Hero: what UMOVE is and the button to ask, next to the live board,
 *      so a visitor sees real requests (and that people are using it)
 *      before scrolling.
 *   2. How it works.
 *   3. Questions.
 *   4. One band for runners.
 */
export default function Home() {
  const { t } = useI18n();
  const core = useCoreFaq();

  return (
    <>
      {/* 1. HERO + LIVE BOARD */}
      <section className="border-b border-border bg-surface/60">
        <Container className="grid items-center gap-10 pt-10 pb-12 sm:pt-16 sm:pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:gap-14 lg:pt-20 lg:pb-20">
          <div className="text-center lg:text-left">
            <h1 className="t-hero text-balance">{t.hero.title}</h1>
            <p className="t-body mx-auto mt-4 max-w-md text-[1.0625rem] text-foreground-secondary lg:mx-0">
              {t.hero.lead}
            </p>
            <div className="mt-7 flex justify-center gap-2 lg:justify-start">
              <Link to="/requests/new" className={`${btn.primary} flex-1 sm:flex-none`}>
                <PlusIcon />
                {t.hero.primary}
              </Link>
              <Link to="/runner" className={`${btn.outline} flex-1 sm:flex-none`}>
                {t.hero.secondary}
              </Link>
            </div>
            {/* Deliveries only for now: what people usually ask for. */}
            <ul
              aria-label={t.hero.examplesLabel}
              className="mt-7 flex flex-wrap justify-center gap-1.5 lg:justify-start"
            >
              {t.hero.examples.map((x) => (
                <li
                  key={x}
                  className="rounded-full border border-border bg-card px-3 py-1 text-[0.8125rem] font-medium text-foreground-secondary"
                >
                  {x}
                </li>
              ))}
            </ul>
          </div>

          <LiveBoard />
        </Container>
      </section>

      <Container>
        {/* 2. HOW IT WORKS */}
        <section id="how" className="scroll-mt-20 pt-14 sm:pt-20">
          <SectionHeading icon={StepsIcon} title={t.how.title} />
          <HowItWorks />
        </section>

        {/* 3. QUESTIONS */}
        <section id="faq" className="scroll-mt-20 pt-16 sm:pt-24">
          <SectionHeading icon={QuestionIcon} title={t.faq.title} />
          {core ? <FaqList items={core} /> : <div className="h-[21rem] border-y border-border" aria-hidden="true" />}
          <Link to="/faq" className={`${btn.outline} mt-6`}>
            {t.faq.seeAll}
            <ArrowRightIcon />
          </Link>
        </section>

        {/* 4. RUNNERS */}
        <section className="mt-16 flex flex-col gap-5 rounded-(--radius-surface) bg-foreground px-6 py-8 text-background sm:mt-24 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div>
            <h2 className="font-display text-[1.375rem] leading-tight font-bold tracking-tight sm:text-[1.625rem]">
              {t.cta.title}
            </h2>
            <p className="mt-1.5 text-[0.9375rem] opacity-70">{t.cta.body}</p>
          </div>
          <Link to="/runner" className={`${btn.primary} shrink-0`}>
            {t.cta.button}
            <ArrowRightIcon />
          </Link>
        </section>
      </Container>
    </>
  );
}

/**
 * The newest open requests, live, as a compact panel. With nothing open it
 * still says so plainly and offers the next step.
 */
function LiveBoard() {
  const { t, locale } = useI18n();
  const r = t.requests;
  const h = t.hero;
  const { items } = useBoard();
  const n = items?.length ?? 0;

  return (
    <section
      aria-label={r.homeTitle}
      className="w-full overflow-hidden rounded-(--radius-surface) border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="flex items-center gap-2.5 text-[0.9375rem] font-semibold">
          {n > 0 ? (
            <StatusDot status="open" />
          ) : (
            <span className="size-2.5 rounded-full bg-border-strong" aria-hidden="true" />
          )}
          {items === null ? r.homeTitle : n > 0 ? fmt(n === 1 ? h.liveOne : h.liveMany, { n }) : h.liveNone}
        </p>
        {n > 0 ? (
          <Link
            to="/requests"
            className="inline-flex shrink-0 items-center gap-1 text-[0.8125rem] font-semibold text-primary-strong hover:underline"
          >
            {r.seeAll}
            <ArrowRightIcon className="size-3.5" />
          </Link>
        ) : null}
      </header>

      {items === null ? (
        <div className="space-y-px" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[4.25rem] animate-pulse bg-surface" />
          ))}
        </div>
      ) : n === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="t-meta mx-auto max-w-[16rem]">{h.boardEmpty}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.slice(0, 4).map((x) => (
            <li key={x.code}>
              <Link
                to={`/requests/${x.code}`}
                className="flex items-center gap-3 px-4 py-3 motion-interactive hover:bg-surface"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.9375rem] font-semibold">{x.details}</span>
                  <span className="t-meta mt-0.5 flex min-w-0 items-center gap-1.5 text-[0.75rem]">
                    <span className="truncate">{x.pickup}</span>
                    <ArrowRightIcon className="size-3 shrink-0" />
                    <span className="truncate font-medium text-foreground-secondary">{x.dropoff}</span>
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block rounded-full bg-primary-soft px-2.5 py-0.5 text-[0.875rem] font-bold text-primary-strong tabular-nums">
                    {ringgit(x.tipSen)}
                  </span>
                  <span className="mt-1 block text-[0.6875rem] text-muted-foreground">
                    {timeAgo(x.createdAt, locale)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <footer className="border-t border-border bg-surface/70 p-3">
        <Link to="/requests/new" className={`${btn.primary} w-full`}>
          <PlusIcon />
          {h.boardAsk}
        </Link>
      </footer>
    </section>
  );
}
