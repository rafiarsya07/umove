import type { ComponentType } from "react";
import { Link } from "react-router";
import { Container } from "../components/Container";
import { HowItWorks } from "../components/HowItWorks";
import { RequestPreview } from "../components/RequestPreview";
import { ArrowRightIcon, MarketIcon, QuestionIcon, RideIcon, RunnerIcon, StepsIcon } from "../components/Icon";
import { SectionHeading, btn } from "../components/ui";
import { useI18n } from "../i18n";
import { useSession } from "../lib/session";

type IconType = ComponentType<{ className?: string }>;

/**
 * Home: quiet and typographic.
 *   1. Hero: one line, one sentence, two actions, the three services.
 *   2. How it works.
 *   3. Questions.
 *   4. One band for runners.
 */
export default function Home() {
  const { t } = useI18n();
  const { user } = useSession();

  const services: { icon: IconType; title: string; body: string; soon: boolean }[] = [
    { icon: RunnerIcon, ...t.services.deliver, soon: false },
    { icon: RideIcon, ...t.services.ride, soon: true },
    { icon: MarketIcon, ...t.services.market, soon: true },
  ];

  return (
    <>
      {/* 1. HERO */}
      <section className="border-b border-border">
        <Container className="pt-10 pb-8 sm:pt-20 sm:pb-12">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <div>
              <h1 className="t-hero max-w-3xl text-balance">{t.hero.title}</h1>
              <p className="t-body mt-4 max-w-xl text-[1.0625rem] text-foreground-secondary">{t.hero.lead}</p>
              <div className="mt-7 flex gap-2">
                <Link to={user ? "/dashboard" : "/login"} className={`${btn.primary} flex-1 sm:flex-none`}>
                  {t.hero.primary}
                </Link>
                <Link to="/runner" className={`${btn.outline} flex-1 sm:flex-none`}>
                  {t.hero.secondary}
                </Link>
              </div>
            </div>
            <RequestPreview className="hidden lg:block" />
          </div>

          <ul
            aria-label={t.services.label}
            className="mt-10 grid grid-cols-3 divide-x divide-border overflow-hidden rounded-(--radius-surface) border border-border sm:mt-16"
          >
            {services.map(({ icon: Icon, title, body, soon }) => (
              <li key={title} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
                <Icon className={`size-8 shrink-0 sm:size-9 ${soon ? "opacity-50" : ""}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-[0.875rem] font-semibold sm:text-[1rem]">{title}</span>
                    {soon ? (
                      <span className="rounded-full bg-muted px-1.5 py-px text-[0.625rem] font-semibold text-muted-foreground sm:text-[0.6875rem]">
                        {t.services.soon}
                      </span>
                    ) : null}
                  </span>
                  <span className="t-meta mt-0.5 hidden sm:block">{body}</span>
                </span>
              </li>
            ))}
          </ul>
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
          <div className="divide-y divide-border border-y border-border">
            {t.faq.items.map(({ q, a }) => (
              <details key={q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[0.9375rem] font-semibold motion-interactive hover:text-foreground-secondary [&::-webkit-details-marker]:hidden">
                  {q}
                  <PlusGlyph />
                </summary>
                <p className="t-body max-w-2xl pb-5 text-foreground-secondary">{a}</p>
              </details>
            ))}
          </div>
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

/** A plus that turns into a cross when the question is open. */
function PlusGlyph() {
  return (
    <span aria-hidden="true" className="relative size-4 shrink-0 text-muted-foreground group-open:rotate-45">
      <span className="absolute top-1/2 left-0 h-px w-4 -translate-y-1/2 bg-current" />
      <span className="absolute top-0 left-1/2 h-4 w-px -translate-x-1/2 bg-current" />
    </span>
  );
}
