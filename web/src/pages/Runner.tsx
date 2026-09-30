import type { ComponentType } from "react";
import { Link } from "react-router";
import { Container } from "../components/Container";
import { AlertIcon, CheckIcon, KeepIcon, ScheduleIcon } from "../components/Icon";
import { RunnerMock } from "../components/RunnerMock";
import { btn } from "../components/ui";
import { useI18n } from "../i18n";
import { site } from "../lib/site";
import { useSession } from "../lib/session";

type IconType = ComponentType<{ className?: string }>;

export default function Runner() {
  const { t } = useI18n();
  const { user } = useSession();
  const r = t.runner;
  const perkIcons: IconType[] = [ScheduleIcon, KeepIcon, AlertIcon];

  const applyTo = site.runnerSignupUrl || (user ? "/apply/runner" : "/login?next=/apply/runner");
  const external = Boolean(site.runnerSignupUrl);
  const Apply = ({ className = "" }: { className?: string }) =>
    external ? (
      <a href={applyTo} target="_blank" rel="noreferrer" className={`${btn.primary} ${className}`}>
        {r.apply}
      </a>
    ) : (
      <Link to={applyTo} className={`${btn.primary} ${className}`}>
        {r.apply}
      </Link>
    );

  return (
    <>
      <section className="border-b border-border">
        <Container className="grid items-center gap-10 py-10 sm:py-16 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
          <div>
            <h1 className="t-hero">{r.title}</h1>
            <p className="t-body mt-4 max-w-lg text-[1.0625rem] text-foreground-secondary">{r.lead}</p>
            <Apply className="mt-7" />
          </div>
          <div className="hidden lg:block">
            <RunnerMock />
          </div>
        </Container>
      </section>

      <Container>
        <section className="pt-14 sm:pt-20">
          <h2 className="t-section-title">{r.perksTitle}</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {r.perks.map((perk, i) => {
              const Icon = perkIcons[i];
              return (
                <li key={perk.title} className="rounded-(--radius-surface) border border-border p-5">
                  <Icon className="size-7" />
                  <h3 className="mt-4 text-[1rem] font-semibold">{perk.title}</h3>
                  <p className="t-meta mt-1 leading-relaxed">{perk.body}</p>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="grid gap-12 pt-16 sm:pt-20 md:grid-cols-2 md:gap-10">
          <div>
            <h2 className="t-section-title">{r.reqTitle}</h2>
            <ul className="mt-5 space-y-3">
              {r.reqs.map((req) => (
                <li key={req} className="flex items-start gap-3 text-[0.9375rem]">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                    <CheckIcon className="size-3" />
                  </span>
                  {req}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="t-section-title">{r.stepsTitle}</h2>
            <ol className="mt-5 space-y-4">
              {r.steps.map((step, i) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border-strong text-[0.75rem] font-bold tabular-nums">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-[0.9375rem] font-semibold">{step.title}</span>
                    <span className="t-meta block">{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <div className="mt-14 border-t border-border pt-8 lg:hidden">
          <RunnerMock />
        </div>

        <div className="mt-12 flex justify-center">
          <Apply />
        </div>
      </Container>
    </>
  );
}
