import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { PlacePicker } from "../components/PlacePicker";
import { btn } from "../components/ui";
import { useI18n } from "../i18n";
import { ApiError, api } from "../lib/api";

const field =
  "h-11 w-full rounded-(--radius-control) border border-border-input bg-card px-3 text-[0.9375rem] motion-interactive placeholder:text-muted-foreground focus:border-foreground focus:ring-3 focus:ring-foreground/10 focus:outline-none";

/** Post a request. Signed-in only (the route sits inside AccountLayout). */
export default function NewRequest() {
  const { t } = useI18n();
  const r = t.requests;
  const navigate = useNavigate();
  const [form, setForm] = useState({ details: "", pickup: "", dropoff: "", tip: "3" });
  const [placeId, setPlaceId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setError(null);
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const tip = Number(form.tip.replace(",", "."));
    if ([form.details, form.pickup, form.dropoff].some((v) => v.trim().length < 2)) {
      setError(r.errFields);
      return;
    }
    if (!Number.isFinite(tip) || tip < 1 || tip > 100) {
      setError(r.errFee);
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ code: string }>("/requests", {
        method: "POST",
        body: {
          details: form.details,
          ...(placeId ? { placeId } : { pickup: form.pickup }),
          dropoff: form.dropoff,
          tip: Math.round(tip * 100) / 100,
        },
      });
      navigate(`/requests/${res.code}`);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setError(
        code === "blocked"
          ? r.errBlocked
          : code === "need_whatsapp"
            ? r.errNeedWhatsapp
            : code === "too_many"
              ? r.errTooMany
              : code === "daily_limit"
                ? r.errDaily
                : code === "invalid"
                  ? r.errFields
                  : r.errGeneric,
      );
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="t-page-title">{r.new}</h1>
      <p className="t-body mt-1 text-muted-foreground">{r.newLead}</p>

      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        <label className="block">
          <span className="t-label">{r.details}</span>
          <textarea
            className={`${field} mt-1.5 h-24 resize-none py-2.5`}
            value={form.details}
            onChange={set("details")}
            placeholder={r.detailsPlaceholder}
            maxLength={300}
          />
        </label>
        <div className="grid items-start gap-5 sm:grid-cols-2">
          <div>
            <span className="t-label">{r.pickup}</span>
            <div className="mt-1.5">
              <PlacePicker
                className={field}
                value={form.pickup}
                placeId={placeId}
                onChange={(text, id) => {
                  setError(null);
                  setForm((f) => ({ ...f, pickup: text }));
                  setPlaceId(id);
                }}
              />
            </div>
          </div>
          <label className="block">
            <span className="t-label">{r.dropoff}</span>
            <input
              className={`${field} mt-1.5`}
              value={form.dropoff}
              onChange={set("dropoff")}
              placeholder={r.dropoffPlaceholder}
              maxLength={80}
            />
          </label>
        </div>
        <label className="block max-w-[12rem]">
          <span className="t-label">{r.tip}</span>
          <input
            className={`${field} mt-1.5 tabular-nums`}
            value={form.tip}
            onChange={set("tip")}
            inputMode="decimal"
            maxLength={6}
          />
        </label>
        <p className="t-meta -mt-3 text-[0.75rem]">{r.tipHint}</p>

        <div className="rounded-(--radius-surface) border border-border bg-surface px-4 py-3.5">
          <p className="text-[0.875rem] font-semibold">{r.payTitle}</p>
          <p className="t-meta mt-0.5 leading-relaxed">
            {r.payBody} {r.handover}
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-(--radius-control) bg-warning-soft px-3 py-2.5 text-[0.875rem] text-warning"
          >
            {error}{" "}
            {error === r.errNeedWhatsapp ? (
              <Link to="/settings#profile" className="font-semibold underline">
                {t.nav.settings}
              </Link>
            ) : null}
          </p>
        ) : null}

        <button type="submit" disabled={busy} className={`${btn.primary} disabled:opacity-60`}>
          {busy ? r.posting : r.submit}
        </button>
      </form>
    </div>
  );
}
