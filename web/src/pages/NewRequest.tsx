import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setError(null);
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const tip = Number(form.tip.replace(",", "."));
    if ([form.details, form.pickup, form.dropoff].some((v) => v.trim().length < 2) || !Number.isFinite(tip)) {
      setError(r.errFields);
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ id: number }>("/requests", {
        method: "POST",
        body: { details: form.details, pickup: form.pickup, dropoff: form.dropoff, tip: Math.round(tip * 100) / 100 },
      });
      navigate(`/requests/${res.id}`);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setError(
        code === "need_whatsapp"
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
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="t-label">{r.pickup}</span>
            <input
              className={`${field} mt-1.5`}
              value={form.pickup}
              onChange={set("pickup")}
              placeholder={r.pickupPlaceholder}
              maxLength={80}
            />
          </label>
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
