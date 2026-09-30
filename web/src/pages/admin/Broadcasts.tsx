import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Badge, btn } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { PageTitle, panel } from "./AdminLayout";

type Tone = "info" | "warning" | "success";
type Audience = "all" | "members" | "runners";
type Row = {
  id: number;
  title: string;
  body: string;
  tone: Tone;
  audience: Audience;
  linkPath: string | null;
  startsAt: string;
  endsAt: string | null;
  createdBy: string | null;
  state: "scheduled" | "live" | "ended";
};

const field =
  "w-full rounded-(--radius-control) border border-border-input bg-card px-3 text-[0.9375rem] focus:border-foreground focus:outline-none aria-invalid:border-danger";
const PREVIEW: Record<Tone, string> = {
  info: "bg-primary-soft text-primary-strong border-primary-border",
  warning: "bg-warning-soft text-warning border-warning/25",
  success: "bg-success-soft text-success border-success/25",
};
const AUDIENCE: Record<Audience, string> = {
  all: "Everyone",
  members: "Signed-in members",
  runners: "Approved runners",
};

/** Datetime-local value (local time) → ISO string, or "" when empty. */
const toIso = (v: string) => (v ? new Date(v).toISOString() : "");

/**
 * Broadcasts: short announcements shown as a bar under the header, live for
 * everyone the moment they're posted. Choose who sees it and, optionally,
 * when it starts and ends.
 */
export default function Broadcasts() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [form, setForm] = useState({
    title: "",
    body: "",
    tone: "info" as Tone,
    audience: "all" as Audience,
    linkPath: "",
    startsAt: "",
    endsAt: "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<Row[]>("/admin/broadcasts")
      .then(setRows)
      .catch(() => setRows([]));
  }, []);
  useEffect(load, [load]);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setErrors([]);
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/admin/broadcasts", {
        method: "POST",
        body: { ...form, startsAt: toIso(form.startsAt), endsAt: toIso(form.endsAt) },
      });
      setForm({ title: "", body: "", tone: "info", audience: "all", linkPath: "", startsAt: "", endsAt: "" });
      load();
    } catch (err) {
      setErrors(err instanceof ApiError && err.fields.length ? err.fields : ["form"]);
    } finally {
      setBusy(false);
    }
  };

  const end = async (r: Row) => {
    if (!window.confirm(`End "${r.title}" now?`)) return;
    await api(`/admin/broadcasts/${r.id}/end`, { method: "POST" }).catch(() => {});
    load();
  };

  const bad = (k: string) => errors.includes(k);

  return (
    <div>
      <PageTitle
        title="Broadcasts"
        lead="Announcements shown under the header for everyone you choose. They appear live, and people can dismiss them."
      />

      <form onSubmit={submit} noValidate className={`${panel} space-y-4 p-5`}>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <label className="block">
            <span className="t-label">Title</span>
            <input
              className={`${field} mt-1.5 h-11`}
              value={form.title}
              onChange={set("title")}
              maxLength={80}
              placeholder="Deliveries now open in KK8 and KK12"
              aria-invalid={bad("title")}
            />
          </label>
          <label className="block">
            <span className="t-label">Style</span>
            <select className={`${field} mt-1.5 h-11`} value={form.tone} onChange={set("tone")}>
              <option value="info">Info (blue)</option>
              <option value="success">Good news (green)</option>
              <option value="warning">Important (amber)</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="t-label">Message (optional)</span>
          <textarea
            className={`${field} mt-1.5 h-20 resize-none py-2.5`}
            value={form.body}
            onChange={set("body")}
            maxLength={400}
            aria-invalid={bad("body")}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="t-label">Who sees it</span>
            <select className={`${field} mt-1.5 h-11`} value={form.audience} onChange={set("audience")}>
              {Object.entries(AUDIENCE).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="t-label">Link inside UMOVE (optional)</span>
            <input
              className={`${field} mt-1.5 h-11 font-mono text-[0.875rem]`}
              value={form.linkPath}
              onChange={set("linkPath")}
              placeholder="/runner"
              aria-invalid={bad("linkPath")}
            />
          </label>
          <label className="block">
            <span className="t-label">Starts (optional)</span>
            <input
              type="datetime-local"
              className={`${field} mt-1.5 h-11`}
              value={form.startsAt}
              onChange={set("startsAt")}
              aria-invalid={bad("startsAt")}
            />
          </label>
          <label className="block">
            <span className="t-label">Ends (optional)</span>
            <input
              type="datetime-local"
              className={`${field} mt-1.5 h-11`}
              value={form.endsAt}
              onChange={set("endsAt")}
              aria-invalid={bad("endsAt")}
            />
          </label>
        </div>

        {form.title.trim() ? (
          <div>
            <p className="t-label mb-1.5">Preview</p>
            <div className={`rounded-(--radius-control) border px-4 py-2.5 text-[0.875rem] ${PREVIEW[form.tone]}`}>
              <span className="font-semibold">{form.title}</span>
              {form.body ? <span className="ml-2 opacity-90">{form.body}</span> : null}
              {form.linkPath ? <span className="ml-2 font-semibold underline">Learn more</span> : null}
            </div>
          </div>
        ) : null}

        {errors.length ? (
          <p className="text-[0.8125rem] text-danger">
            {errors.includes("linkPath")
              ? "The link must be a path inside UMOVE, like /runner or /faq."
              : errors.includes("endsAt")
                ? "The end must be after the start."
                : errors.includes("title")
                  ? "Write a title of at least 3 characters."
                  : "Couldn't post it. Check the fields and try again."}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy || form.title.trim().length < 3}
          className={`${btn.primary} disabled:opacity-50`}
        >
          {form.startsAt ? "Schedule broadcast" : "Post now"}
        </button>
      </form>

      <h2 className="mt-8 mb-3 text-[1rem] font-semibold">History</h2>
      {rows === null ? (
        <p className="t-meta">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="t-meta">No broadcasts yet.</p>
      ) : (
        <ul className={`${panel} divide-y divide-border`}>
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[0.9375rem] font-semibold">
                  {r.title}
                  <Badge tone={r.state === "live" ? "success" : r.state === "scheduled" ? "warning" : "muted"}>
                    {r.state}
                  </Badge>
                  <Badge tone="muted">{AUDIENCE[r.audience]}</Badge>
                </p>
                {r.body ? <p className="t-meta truncate">{r.body}</p> : null}
                <p className="text-[0.75rem] text-muted-foreground">
                  From {new Date(r.startsAt).toLocaleString("en-MY")}
                  {r.endsAt ? ` to ${new Date(r.endsAt).toLocaleString("en-MY")}` : ", no end"}
                  {r.createdBy ? `, by @${r.createdBy}` : ""}
                </p>
              </div>
              {r.state !== "ended" ? (
                <button type="button" className={btn.small} onClick={() => end(r)}>
                  End now
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
