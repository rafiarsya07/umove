import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Badge, btn } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { timeAgo } from "../../lib/format";
import { PageTitle, panel } from "./AdminLayout";

type Status = "pending" | "approved" | "rejected";
type Application = {
  id: number;
  role: "runner" | "driver";
  status: Status;
  details: Record<string, string | number | boolean>;
  reason: string | null;
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  filesPurged: boolean;
  files: string[];
  name: string;
  username: string;
  email: string;
  whatsapp: string | null;
  college: string;
  joined: string;
};

const PHOTO_LABEL: Record<string, string> = {
  matric_card: "Matric card",
  license: "Driving licence",
  vehicle: "Vehicle",
  selfie: "Selfie + card",
};

const PHOTO_ORDER = ["matric_card", "license", "vehicle", "selfie"];

const DETAIL_LABEL: [string, string][] = [
  ["fullName", "Full name"],
  ["matricNo", "Matric no."],
  ["faculty", "Faculty / college"],
  ["vehicle", "Delivers by"],
  ["vehicleType", "Vehicle"],
  ["vehicleModel", "Make / model"],
  ["vehicleColor", "Colour"],
  ["plate", "Plate"],
  ["seats", "Passenger seats"],
  ["roadTaxExpiry", "Road tax until"],
  ["licenseClass", "Licence class"],
  ["licenseType", "Licence type"],
  ["licenseExpiry", "Licence until"],
];

/** Quick reasons; the applicant sees the reason in Settings and by email. */
const REASONS = [
  "Photo is blurry or cut off. Please retake it in good light.",
  "Name doesn't match the matric card.",
  "Licence is expired, probationary or doesn't match the vehicle.",
  "Plate isn't visible in the vehicle photo.",
  "Selfie doesn't clearly show you with your matric card.",
  "We couldn't reach you on WhatsApp to verify.",
];

const OVERDUE_MS = 24 * 3600 * 1000;

export default function Applications() {
  const [params, setParams] = useSearchParams();
  const status = (["pending", "approved", "rejected"] as const).find((s) => s === params.get("status")) ?? "pending";
  const [apps, setApps] = useState<Application[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setApps(null);
    api<Application[]>(`/admin/applications?status=${status}`)
      .then(setApps)
      .catch(() => setError("Could not load applications."));
  }, [status]);
  useEffect(load, [load]);

  return (
    <div>
      <PageTitle
        title="Applications"
        lead="Review within 24 hours. Check every photo against the details, and message the applicant on WhatsApp if anything is unclear."
      />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setParams(f === "pending" ? {} : { status: f })}
            className={`rounded-full px-3 py-1.5 text-[0.8125rem] font-medium capitalize motion-interactive ${
              status === f
                ? "bg-foreground text-background"
                : "border border-border bg-card text-foreground-secondary hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      {error ? <p className="mb-4 text-[0.875rem] text-danger">{error}</p> : null}
      {apps === null ? (
        <p className="t-meta">Loading…</p>
      ) : apps.length === 0 ? (
        <div className={`${panel} px-6 py-10 text-center`}>
          <p className="font-semibold">{status === "pending" ? "All caught up" : "Nothing here yet"}</p>
          <p className="t-meta mt-1">{status === "pending" ? "No applications waiting." : "No applications in this list."}</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {apps.map((a) => (
            <ApplicationCard key={a.id} app={a} onDone={() => setApps((l) => l?.filter((x) => x.id !== a.id) ?? null)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ApplicationCard({ app: a, onDone }: { app: Application; onDone: () => void }) {
  const [mode, setMode] = useState<"view" | "reject">("view");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overdue = a.status === "pending" && Date.now() - new Date(a.createdAt).getTime() > OVERDUE_MS;

  const decide = async (decision: "approve" | "reject") => {
    if (decision === "approve" && !window.confirm(`Approve ${a.name} as a ${a.role}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/applications/${a.id}/decision`, {
        method: "POST",
        body: decision === "reject" ? { decision, reason: reason.trim() } : { decision },
      });
      onDone();
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === "invalid"
          ? "Write a reason (at least 5 characters)."
          : "That action failed. Refresh and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const details = DETAIL_LABEL.filter(([k]) => a.details[k] !== undefined);

  return (
    <li className={`${panel} overflow-hidden`}>
      <div className="flex flex-wrap items-start gap-3 border-b border-border p-4">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[0.9375rem] font-semibold">
            {a.name}
            <span className="t-meta font-normal">@{a.username}</span>
            <Badge tone={a.role === "driver" ? "live" : "muted"}>{a.role === "driver" ? "Driver" : "Runner"}</Badge>
            {overdue ? <Badge tone="danger">Over 24h</Badge> : null}
          </p>
          <p className="t-meta mt-0.5">
            {a.email} · {a.whatsapp ?? "no WhatsApp"}
            {a.college ? ` · ${a.college}` : ""} · joined {new Date(a.joined).toLocaleDateString("en-MY")}
          </p>
          <p className="t-meta text-[0.75rem]">
            Applied {timeAgo(a.createdAt, "en-MY")}
            {a.decidedAt ? ` · ${a.status} ${timeAgo(a.decidedAt, "en-MY")}${a.decidedBy ? ` by @${a.decidedBy}` : ""}` : ""}
          </p>
          {a.reason ? <p className="mt-1 text-[0.8125rem] text-foreground-secondary">Reason: {a.reason}</p> : null}
        </div>
        {a.whatsapp ? (
          <a className={btn.small} href={`https://wa.me/${a.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        ) : null}
      </div>

      <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[0.8125rem]">
          {details.map(([k, label]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium break-words">{String(a.details[k])}</dd>
            </div>
          ))}
        </dl>
        <div>
          {a.filesPurged ? (
            <p className="t-meta">Photos were deleted 30 days after the decision.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {[...a.files].sort((x, y) => PHOTO_ORDER.indexOf(x) - PHOTO_ORDER.indexOf(y)).map((k) => {
                const src = `/api/admin/applications/${a.id}/files/${k}`;
                return (
                  <a key={k} href={src} target="_blank" rel="noreferrer" className="group block">
                    <img
                      src={src}
                      alt={PHOTO_LABEL[k] ?? k}
                      loading="lazy"
                      className="aspect-[4/3] w-full rounded-(--radius-control) border border-border bg-muted object-cover group-hover:opacity-90"
                    />
                    <span className="t-meta mt-1 block text-[0.75rem]">{PHOTO_LABEL[k] ?? k}</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {a.status === "pending" ? (
        <div className="border-t border-border bg-surface p-4">
          {mode === "reject" ? (
            <div className="space-y-3">
              <p className="t-label">Why is it rejected? The applicant will see this.</p>
              <div className="flex flex-wrap gap-1.5">
                {REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className="rounded-full border border-border bg-card px-2.5 py-1 text-left text-[0.75rem] text-foreground-secondary hover:text-foreground"
                  >
                    {r}
                  </button>
                ))}
              </div>
              <textarea
                className="h-20 w-full resize-none rounded-(--radius-control) border border-border-input bg-card px-3 py-2 text-[0.875rem] focus:border-foreground focus:outline-none"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={300}
                placeholder="Reason (they can reapply after 24 hours)"
              />
              <div className="flex gap-2">
                <button type="button" className={btn.small} onClick={() => setMode("view")} disabled={busy}>
                  Back
                </button>
                <button
                  type="button"
                  className="inline-flex h-9 items-center rounded-full bg-danger px-3.5 text-[0.8125rem] font-semibold text-white motion-pressable disabled:opacity-60"
                  disabled={busy || reason.trim().length < 5}
                  onClick={() => decide("reject")}
                >
                  Reject application
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={btn.small} disabled={busy} onClick={() => setMode("reject")}>
                Reject…
              </button>
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-full bg-primary px-3.5 text-[0.8125rem] font-semibold text-primary-foreground motion-pressable hover:bg-primary-hover disabled:opacity-60"
                disabled={busy}
                onClick={() => decide("approve")}
              >
                Approve
              </button>
            </div>
          )}
          {error ? <p className="mt-2 text-[0.8125rem] text-danger">{error}</p> : null}
        </div>
      ) : null}
    </li>
  );
}
