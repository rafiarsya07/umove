import type { ComponentType } from "react";
import { Link } from "react-router";
import { Container } from "../components/Container";
import { HowItWorks } from "../components/HowItWorks";
import { RequestGrid } from "../components/RequestCard";
import { useBoard } from "../lib/useBoard";
import {
  ArrowRightIcon,
  MarketIcon,
  QuestionIcon,
  RequestsIcon,
  RideIcon,
  RunnerIcon,
  StepsIcon,
} from "../components/Icon";
import { Badge, SectionHeading, btn } from "../components/ui";
import { useI18n } from "../i18n";
import { useCoreFaq } from "../i18n/faq";
import { FaqList } from "../components/FaqList";

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
  const core = useCoreFaq();

  const services: { icon: IconType; title: string; body: string; soon: boolean }[] = [
    { icon: RunnerIcon, ...t.services.deliver, soon: false },
    { icon: RideIcon, ...t.services.ride, soon: true },
    { icon: MarketIcon, ...t.services.market, soon: true },
  ];

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

          <ul
            aria-label={t.services.label}
            className="mx-auto mt-12 grid max-w-4xl grid-cols-3 divide-x divide-border overflow-hidden rounded-(--radius-surface) border border-border sm:mt-16"
          >
            {services.map(({ icon: Icon, title, body, soon }) => (
              <li key={title} className="flex flex-col items-center gap-2 px-2 py-4 text-center sm:px-5 sm:py-6">
                <Icon className={`size-8 sm:size-9 ${soon ? "opacity-45" : ""}`} />
                <span className="text-[0.9375rem] font-semibold sm:text-[1rem]">{title}</span>
                <span className="t-meta hidden text-[0.8125rem] sm:block">{body}</span>
                <Badge tone={soon ? "soon" : "live"}>{soon ? t.services.soon : t.services.live}</Badge>
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
