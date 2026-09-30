import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { Container } from "../components/Container";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  BikeIcon,
  CarIcon,
  CheckIcon,
  DropoffIcon,
  MotorIcon,
  PickupIcon,
  StarIcon,
  WalkIcon,
} from "../components/Icon";
import { Stars, VerifiedMark, btn } from "../components/ui";
import { fmt, useI18n } from "../i18n";
import { ApiError, api } from "../lib/api";
import { ringgit, timeAgo } from "../lib/format";
import { useLive } from "../lib/live";
import type { RequestDetail as Detail, RequestStatus } from "../lib/requests";
import { useSession } from "../lib/session";
import NotFound from "./NotFound";

const STEPS: RequestStatus[] = ["open", "accepted", "on_the_way", "delivered"];

type Action = "take" | "onTheWay" | "delivered" | "release" | "cancel";
const ACTIONS: Record<Action, [string, unknown?]> = {
  take: ["accept"],
  onTheWay: ["status", { status: "on_the_way" }],
  delivered: ["status", { status: "delivered" }],
  release: ["release"],
  cancel: ["cancel"],
};

/** One request: its route, progress, the WhatsApp hand-off, and actions for whoever is looking. */
export default function RequestDetail() {
  const { code = "" } = useParams();
  const { t, locale } = useI18n();
  const { user } = useSession();
  const r = t.requests;
  const [data, setData] = useState<Detail | null | "missing">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState<Action | null>(null);

  const load = useCallback(() => {
    api<Detail>(`/requests/${encodeURIComponent(code)}`)
      .then(setData)
      .catch((err) => setData(err instanceof ApiError && err.status === 404 ? "missing" : null));
  }, [code]);
  useEffect(load, [load, user?.username]);
  useLive(load);

  if (data === "missing") return <NotFound title={r.title} body={r.notFound} />;
  if (!data) {
    return (
      <Container className="max-w-3xl py-12">
        <p className="t-meta">{t.common.loading}</p>
      </Container>
    );
  }

  const act = async (action: Action) => {
    const [path, body] = ACTIONS[action];
    setBusy(true);
    setError(null);
    try {
      await api(`/requests/${data.code}/${path}`, { method: "POST", body });
      setAsking(null);
      load();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setError(
        code === "gone"
          ? r.errGone
          : code === "busy"
            ? r.errBusy
            : code === "not_runner"
              ? r.errNotRunner
              : code === "need_photo"
                ? r.errNeedPhoto
                : r.errGeneric,
      );
      setAsking(null);
      load();
    } finally {
      setBusy(false);
    }
  };
  const ask = (a: Action) => {
    setError(null);
    setAsking(a);
  };

  const stepIndex = STEPS.indexOf(data.status);
  const counterpart =
    data.viewerRole === "customer" ? data.runner : data.viewerRole === "runner" ? data.customer : null;
  const waText = fmt(data.viewerRole === "runner" ? r.waFromRunner : r.waFromCustomer, {
    id: data.code,
    details: data.details,
  });

  return (
    <Container className="max-w-3xl py-8 sm:py-10">
      <Link to="/requests" className="t-meta font-medium hover:text-foreground">
        ← {r.back}
      </Link>

      <div className="mt-4 rounded-(--radius-surface) border border-border p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-muted-foreground">
              <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.75rem] font-semibold tracking-wide text-foreground">
                {data.code}
              </span>
              <span>{fmt(r.by, { name: data.customer.name })}</span>
              <span>{timeAgo(data.createdAt, locale)}</span>
            </p>
            <h1 className="mt-1 font-display text-[1.375rem] leading-snug font-bold tracking-tight">{data.details}</h1>
          </div>
          <div className="shrink-0 text-right">
            <p className="t-meta text-[0.75rem]">{r.tipLabel}</p>
            <p className="font-display text-[1.5rem] leading-none font-bold tabular-nums">{ringgit(data.tipSen)}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-3 text-[0.9375rem]">
          <PickupIcon className="mt-3 size-5" />
          <span>
            <span className="t-meta block text-[0.75rem]">{r.pickup}</span>
            {data.pickup}
            {data.listed ? (
              <span className="mt-1 flex items-center gap-1 text-[0.75rem] font-medium text-primary-strong">
                <CheckIcon className="size-3.5" />
                {r.placeListed}
              </span>
            ) : null}
          </span>
          <DropoffIcon className="mt-3 size-5" />
          <span>
            <span className="t-meta block text-[0.75rem]">{r.dropoff}</span>
            <span className="font-medium">{data.dropoff}</span>
          </span>
        </div>

        {data.status === "cancelled" ? (
          <p className="mt-6 rounded-(--radius-control) bg-muted px-3 py-2 text-[0.875rem] font-medium">
            {r.status.cancelled}
          </p>
        ) : (
          <ol className="mt-6 grid grid-cols-4 gap-1.5" aria-label={r.status[data.status]}>
            {STEPS.map((s, i) => (
              <li key={s}>
                <span
                  className={`block h-1.5 rounded-full ${i < stepIndex ? "bg-foreground" : i === stepIndex ? "bg-primary" : "bg-muted"}`}
                />
                <span
                  className={`mt-1.5 block text-[0.6875rem] leading-tight sm:text-[0.75rem] ${
                    i === stepIndex ? "font-semibold text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {r.status[s]}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* How payment works, for the two people involved (and for runners deciding) */}
      {data.status !== "cancelled" && data.status !== "delivered" ? (
        <div className="mt-4 rounded-(--radius-surface) border border-border bg-surface px-4 py-3.5">
          <p className="text-[0.875rem] font-semibold">{r.payTitle}</p>
          <p className="t-meta mt-0.5 leading-relaxed">
            {data.viewerRole === "customer" ? r.payBody : r.payRunner} {r.handover}
          </p>
        </div>
      ) : null}

      {/* The other person, once matched. The requester also sees who is coming. */}
      {counterpart && data.contact ? (
        <div className="mt-4 flex flex-col gap-4 rounded-(--radius-surface) border border-border p-4 sm:flex-row sm:items-center">
          {data.viewerRole === "customer" && data.runner ? (
            <RunnerCard code={data.code} runner={data.runner} />
          ) : (
            <div className="min-w-0 flex-1">
              <p className="t-meta text-[0.75rem]">{r.customer}</p>
              <Link to={`/u/${counterpart.username}`} className="text-[0.9375rem] font-semibold hover:underline">
                {counterpart.name} <span className="t-meta font-normal">@{counterpart.username}</span>
              </Link>
            </div>
          )}
          <a
            href={`https://wa.me/${data.contact.replace(/\D/g, "")}?text=${encodeURIComponent(waText)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#25d366] px-5 text-[0.9375rem] font-semibold text-[#0b1f14] motion-pressable hover:opacity-90"
          >
            {r.chat}
          </a>
        </div>
      ) : null}

      {/* Actions for whoever is looking */}
      <div className="mt-5 flex flex-wrap gap-2">
        {data.status === "open" && data.viewerRole === null ? (
          !user ? (
            <Link to={`/login?next=/requests/${data.code}`} className={btn.primary}>
              {r.signInToTake}
            </Link>
          ) : data.canAccept && data.needsPhoto ? (
            <div className="w-full rounded-(--radius-surface) border border-warning/30 bg-warning-soft p-4">
              <p className="text-[0.9375rem] font-semibold">{r.needPhotoTitle}</p>
              <p className="t-meta mt-1">{r.needPhotoBody}</p>
              <Link to="/settings#photo" className={`${btn.small} mt-3`}>
                {r.needPhotoButton}
              </Link>
            </div>
          ) : data.canAccept ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => ask("take")}
              className={`${btn.primary} disabled:opacity-60`}
            >
              {r.take}
            </button>
          ) : (
            <Link to="/runner" className={btn.outline}>
              {r.becomeRunner}
            </Link>
          )
        ) : null}

        {data.viewerRole === "customer" && data.status === "open" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => ask("cancel")}
            className={`${btn.outline} disabled:opacity-60`}
          >
            {r.cancel}
          </button>
        ) : null}

        {data.viewerRole === "runner" && data.status === "accepted" ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => ask("onTheWay")}
              className={`${btn.primary} disabled:opacity-60`}
            >
              {r.onTheWay}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => ask("release")}
              className={`${btn.outline} disabled:opacity-60`}
            >
              {r.release}
            </button>
          </>
        ) : null}

        {data.viewerRole === "runner" && data.status === "on_the_way" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => ask("delivered")}
            className={`${btn.primary} disabled:opacity-60`}
          >
            <CheckIcon className="size-4" />
            {r.markDelivered}
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-[0.875rem] text-danger">
          {error}
        </p>
      ) : null}

      {data.canRate ? <RateForm code={data.code} role={data.viewerRole} onDone={load} /> : null}

      {asking ? (
        <ConfirmDialog
          open
          title={r.confirm[asking].title}
          body={
            <>
              {r.confirm[asking].body}
              {error ? <span className="mt-2 block font-medium text-danger">{error}</span> : null}
            </>
          }
          confirm={busy ? r.working : r.confirm[asking].ok}
          cancel={r.confirm.back}
          tone={asking === "cancel" || asking === "release" ? "danger" : "primary"}
          busy={busy}
          onConfirm={() => act(asking)}
          onClose={() => !busy && setAsking(null)}
        />
      ) : null}
    </Container>
  );
}

function RateForm({ code, role, onDone }: { code: string; role: Detail["viewerRole"]; onDone: () => void }) {
  const { t } = useI18n();
  const r = t.requests;
  const [stars, setStars] = useState(5);
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState("busy");
    try {
      await api(`/requests/${code}/rate`, { method: "POST", body: { stars, body } });
      setState("done");
      onDone();
    } catch {
      setState("error");
    }
  };

  if (state === "done") return <p className="mt-8 text-[0.9375rem] font-medium text-success">{r.rated}</p>;

  return (
    <form onSubmit={submit} className="mt-8 rounded-(--radius-surface) border border-border p-5">
      <p className="text-[1rem] font-semibold">{role === "customer" ? r.rateRunner : r.rateCustomer}</p>
      <div className="mt-3 flex gap-1" role="radiogroup">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n}`}
            onClick={() => setStars(n)}
            className={`rounded-md p-1 motion-interactive ${n <= stars ? "text-star" : "text-border-strong"}`}
          >
            <StarIcon className="size-7" />
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={300}
        placeholder={r.ratePlaceholder}
        className="mt-3 h-20 w-full resize-none rounded-(--radius-control) border border-border-input px-3 py-2.5 text-[0.9375rem] placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
      />
      <button type="submit" disabled={state === "busy"} className={`${btn.ink} mt-3 disabled:opacity-60`}>
        {r.rateSubmit}
      </button>
      {state === "error" ? <p className="mt-2 text-[0.875rem] text-danger">{r.errGeneric}</p> : null}
    </form>
  );
}

const WAYS = ["walk", "bicycle", "motorcycle", "car"] as const;
const WAY_ICON = { walk: WalkIcon, bicycle: BikeIcon, motorcycle: MotorIcon, car: CarIcon };

/** Who is coming: face, name, how they travel, deliveries and rating. For the requester only. */
function RunnerCard({ code, runner }: { code: string; runner: NonNullable<Detail["runner"]> }) {
  const { t } = useI18n();
  const r = t.requests;
  const [broken, setBroken] = useState(false);
  const Way = runner.vehicle ? WAY_ICON[runner.vehicle] : null;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-4">
      <span className="inline-flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground font-display text-[1.75rem] font-bold text-background ring-4 ring-primary-soft">
        {runner.hasPhoto && !broken ? (
          <img
            src={`/api/requests/${encodeURIComponent(code)}/runner-photo`}
            alt={runner.name}
            onError={() => setBroken(true)}
            className="size-full object-cover"
          />
        ) : (
          runner.name.trim().charAt(0).toUpperCase()
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="t-meta text-[0.75rem]">{r.yourRunner}</p>
        <Link to={`/u/${runner.username}`} className="flex items-center gap-1.5 hover:underline">
          <span className="truncate text-[1.0625rem] font-semibold">{runner.name}</span>
          <VerifiedMark className="size-4 shrink-0" />
        </Link>
        <p className="t-meta text-[0.8125rem]">@{runner.username}</p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[0.75rem]">
          {Way && runner.vehicle ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5">
              <Way className="size-3.5" />
              {t.runner.ways[WAYS.indexOf(runner.vehicle)].title}
            </span>
          ) : null}
          <span className="rounded-full border border-border px-2 py-0.5">
            {runner.runs ? fmt(r.runnerRuns, { n: runner.runs }) : r.runnerNew}
          </span>
          {runner.rating != null ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5">
              <Stars value={runner.rating} className="size-3" />
              <span className="font-semibold tabular-nums">{runner.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({runner.ratingCount})</span>
            </span>
          ) : null}
        </div>
        <p className="t-meta mt-2 text-[0.75rem]">{r.runnerCheck}</p>
      </div>
    </div>
  );
}
