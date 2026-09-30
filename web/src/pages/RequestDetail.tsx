import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { Container } from "../components/Container";
import { CheckIcon, StarIcon } from "../components/Icon";
import { btn } from "../components/ui";
import { fmt, useI18n } from "../i18n";
import { ApiError, api } from "../lib/api";
import { ringgit, timeAgo } from "../lib/format";
import { useLive } from "../lib/live";
import type { RequestDetail as Detail, RequestStatus } from "../lib/requests";
import { useSession } from "../lib/session";
import NotFound from "./NotFound";

const STEPS: RequestStatus[] = ["open", "accepted", "on_the_way", "delivered"];

/** One request: its route, progress, the WhatsApp hand-off, and actions for whoever is looking. */
export default function RequestDetail() {
  const { id = "" } = useParams();
  const { t, locale } = useI18n();
  const { user } = useSession();
  const r = t.requests;
  const [data, setData] = useState<Detail | null | "missing">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Detail>(`/requests/${encodeURIComponent(id)}`)
      .then(setData)
      .catch((err) => setData(err instanceof ApiError && err.status === 404 ? "missing" : null));
  }, [id]);
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

  const act = async (path: string, body?: unknown) => {
    setBusy(true);
    setError(null);
    try {
      await api(`/requests/${data.id}/${path}`, { method: "POST", body });
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
              : r.errGeneric,
      );
      load();
    } finally {
      setBusy(false);
    }
  };

  const stepIndex = STEPS.indexOf(data.status);
  const counterpart =
    data.viewerRole === "customer" ? data.runner : data.viewerRole === "runner" ? data.customer : null;
  const waText = fmt(data.viewerRole === "runner" ? r.waFromRunner : r.waFromCustomer, {
    id: data.id,
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
            <p className="t-meta text-[0.75rem]">
              #{data.id} · {fmt(r.by, { name: data.customer.name })} · {timeAgo(data.createdAt, locale)}
            </p>
            <h1 className="mt-1 font-display text-[1.375rem] leading-snug font-bold tracking-tight">{data.details}</h1>
          </div>
          <div className="shrink-0 text-right">
            <p className="t-meta text-[0.75rem]">{r.tipLabel}</p>
            <p className="font-display text-[1.5rem] leading-none font-bold tabular-nums">{ringgit(data.tipSen)}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-[0.9375rem]">
          <span className="mt-2 size-2.5 rounded-full border-2 border-foreground-secondary" aria-hidden="true" />
          <span>
            <span className="t-meta block text-[0.75rem]">{r.pickup}</span>
            {data.pickup}
          </span>
          <span className="mt-2 size-2.5 rounded-full bg-primary" aria-hidden="true" />
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

      {/* The other person, once matched */}
      {counterpart && data.contact ? (
        <div className="mt-4 flex flex-col gap-3 rounded-(--radius-surface) border border-border p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="t-meta text-[0.75rem]">{data.viewerRole === "customer" ? r.runner : r.customer}</p>
            <Link to={`/u/${counterpart.username}`} className="text-[0.9375rem] font-semibold hover:underline">
              {counterpart.name} <span className="t-meta font-normal">@{counterpart.username}</span>
            </Link>
          </div>
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
            <Link to={`/login?next=/requests/${data.id}`} className={btn.primary}>
              {r.signInToTake}
            </Link>
          ) : data.canAccept ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => act("accept")}
              className={`${btn.primary} disabled:opacity-60`}
            >
              {busy ? r.working : r.take}
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
            onClick={() => act("cancel")}
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
              onClick={() => act("status", { status: "on_the_way" })}
              className={`${btn.primary} disabled:opacity-60`}
            >
              {r.onTheWay}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => act("release")}
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
            onClick={() => act("status", { status: "delivered" })}
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

      {data.canRate ? <RateForm id={data.id} role={data.viewerRole} onDone={load} /> : null}
    </Container>
  );
}

function RateForm({ id, role, onDone }: { id: number; role: Detail["viewerRole"]; onDone: () => void }) {
  const { t } = useI18n();
  const r = t.requests;
  const [stars, setStars] = useState(5);
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState("busy");
    try {
      await api(`/requests/${id}/rate`, { method: "POST", body: { stars, body } });
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
