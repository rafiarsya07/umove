import { useI18n } from "../i18n";
import { CheckIcon, RunnerIcon } from "./Icon";
import { Stars } from "./ui";

/**
 * Three small scenes of the real flow. Scenes are decorative (aria-hidden);
 * the step titles and text carry the meaning.
 */
export function HowItWorks() {
  const { t } = useI18n();
  const scenes = [<RequestScene key="1" />, <ChatScene key="2" />, <DoneScene key="3" />];

  return (
    <ol className="grid gap-6 md:grid-cols-3 md:gap-5">
      {t.how.steps.map((step, i) => (
        <li key={step.title}>
          <div
            aria-hidden="true"
            className="relative flex h-44 items-center justify-center overflow-hidden rounded-(--radius-surface) border border-border bg-surface px-6"
          >
            <span className="absolute top-3 left-3 inline-flex size-6 items-center justify-center rounded-full bg-foreground text-[0.75rem] font-bold text-background tabular-nums">
              {i + 1}
            </span>
            {scenes[i]}
          </div>
          <h3 className="mt-4 text-[1rem] font-semibold">{step.title}</h3>
          <p className="t-meta mt-1 leading-relaxed">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

function RequestScene() {
  const { t } = useI18n();
  return (
    <div className="flex w-full max-w-[15.5rem] items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-[0_8px_24px_-14px_rgb(0_0_0/0.3)]">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
        <RunnerIcon className="size-7" />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.9375rem] font-bold tabular-nums">{t.how.sceneTip}</span>
        <span className="block truncate text-[0.75rem] text-foreground-secondary">{t.how.sceneLine}</span>
        <span className="mt-1.5 inline-flex rounded-full bg-muted px-2 py-0.5 text-[0.625rem] font-semibold text-muted-foreground">
          {t.how.sceneTag}
        </span>
      </span>
    </div>
  );
}

function ChatScene() {
  const { t } = useI18n();
  return (
    <div className="flex w-full max-w-[15.5rem] flex-col gap-1.5 text-[0.8125rem] leading-snug">
      <span className="max-w-[88%] self-end rounded-2xl rounded-br-md bg-(--chat-out) px-3 py-2 text-(--chat-out-foreground)">
        {t.how.chatOut}
      </span>
      <span className="max-w-[88%] self-start rounded-2xl rounded-bl-md border border-border bg-card px-3 py-2">
        {t.how.chatIn}
      </span>
    </div>
  );
}

function DoneScene() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <CheckIcon className="size-5" />
      </span>
      <span className="text-[1rem] font-bold">{t.how.done}</span>
      <Stars value={5} className="size-4" />
    </div>
  );
}
