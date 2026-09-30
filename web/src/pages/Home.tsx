import { Link } from "react-router";
import { Container } from "../components/Container";
import { HowItWorks } from "../components/HowItWorks";
import { RequestGrid } from "../components/RequestCard";
import { useBoard } from "../lib/useBoard";
import { ArrowRightIcon, QuestionIcon, RequestsIcon, StepsIcon } from "../components/Icon";
import { SectionHeading, btn } from "../components/ui";
import { useI18n } from "../i18n";
import { useCoreFaq } from "../i18n/faq";
import { FaqList } from "../components/FaqList";

/**
 * Home: quiet and typographic.
 *   1. Hero: one line, one sentence, two actions, what people usually ask for.
 *   2. How it works.
 *   3. Questions.
 *   4. One band for runners.
 */
export default function Home() {
  const { t } = useI18n();
  const core = useCoreFaq();

  return (
    <>
      {/* 1. HERO */}
      <section className="border-b border-border">
        <Container className="pt-12 pb-10 sm:pt-24 sm:pb-14">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="t-hero text-balance">{t.hero.title}</h1>
            <p className="t-body mx-auto mt-4 max-w-md text-[1.0625rem] text-foreground-secondary">{t.hero.lead}</p>
            <div className="mt-8 flex justify-center gap-2">
              <Link to="/requests/new" className={`${btn.primary} flex-1 sm:flex-none`}>
                {t.hero.primary}
              </Link>
              <Link to="/runner" className={`${btn.outline} flex-1 sm:flex-none`}>
                {t.hero.secondary}
              </Link>
            </div>
          </div>

          {/* Deliveries only for now: what people usually ask for. */}
          <ul
            aria-label={t.hero.examplesLabel}
            className="mx-auto mt-10 flex max-w-2xl flex-wrap justify-center gap-2 sm:mt-12"
          >
            {t.hero.examples.map((x) => (
              <li
                key={x}
                className="rounded-full border border-border bg-card px-3.5 py-1.5 text-[0.875rem] font-medium text-foreground-secondary"
              >
                {x}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Container>
        {/* 2. OPEN REQUESTS (live) */}
        <OpenRequests />

        {/* 3. HOW IT WORKS */}
        <section id="how" className="scroll-mt-20 pt-14 sm:pt-20">
          <SectionHeading icon={StepsIcon} title={t.how.title} />
          <HowItWorks />
        </section>

        {/* 4. QUESTIONS */}
        <section id="faq" className="scroll-mt-20 pt-16 sm:pt-24">
          <SectionHeading icon={QuestionIcon} title={t.faq.title} />
          {core ? <FaqList items={core} /> : <div className="h-[21rem] border-y border-border" aria-hidden="true" />}
          <Link to="/faq" className={`${btn.outline} mt-6`}>
            {t.faq.seeAll}
            <ArrowRightIcon />
          </Link>
        </section>

        {/* 5. RUNNERS */}
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
 * The newest open requests, live. When there are none the section still
 * offers the next step instead of announcing that it is empty.
 */
function OpenRequests() {
  const { t } = useI18n();
  const r = t.requests;
  const { items } = useBoard();
  if (items === null) return null;
  return (
    <section className="pt-14 sm:pt-20">
      <SectionHeading
        icon={RequestsIcon}
        title={r.homeTitle}
        action={
          items.length > 0 ? (
            <Link
              to="/requests"
              className="group inline-flex items-center gap-1 text-[0.875rem] font-medium text-foreground-secondary hover:text-foreground"
            >
              {r.seeAll}
              <ArrowRightIcon className="size-3.5" />
            </Link>
          ) : undefined
        }
      />
      {items.length > 0 ? <RequestGrid items={items.slice(0, 6)} /> : null}
      <Link
        to="/requests/new"
        className="group mt-4 flex items-center justify-between gap-3 rounded-(--radius-surface) border border-dashed border-border-strong px-4 py-3.5 motion-interactive hover:border-foreground"
      >
        <span className="text-[0.9375rem] font-semibold">{items.length > 0 ? r.new : r.emptyCta}</span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[0.875rem] font-semibold text-primary-strong">
          {r.new}
          <ArrowRightIcon className="size-4" />
        </span>
      </Link>
    </section>
  );
}
