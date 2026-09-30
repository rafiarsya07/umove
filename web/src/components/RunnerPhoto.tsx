import { useCallback, useEffect, useState } from "react";
import { fmt, useI18n } from "../i18n";
import { ApiError, api } from "../lib/api";
import { preparePhoto } from "../lib/photo";
import { Badge, btn } from "./ui";

type PhotoStatus = {
  approved: boolean;
  approvedAt: string | null;
  pending: boolean;
  pendingAt: string | null;
  reason: string | null;
};

/**
 * Settings → Runner photo. Shows the face requesters see and lets a runner send
 * a new one; the new photo waits for an admin while the current one stays in use.
 */
export function RunnerPhotoPanel() {
  const { t } = useI18n();
  const s = t.settings;
  const [st, setSt] = useState<PhotoStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    api<PhotoStatus>("/me/photo")
      .then(setSt)
      .catch(() => setSt(null));
  }, []);
  useEffect(load, [load]);

  const upload = async (file: File) => {
    setBusy(true);
    setNote(null);
    try {
      const blob = await preparePhoto(file);
      const fd = new FormData();
      fd.set("photo", blob, "photo.jpg");
      setSt(await api<PhotoStatus>("/me/photo", { method: "POST", form: fd }));
      setNote({ ok: true, text: s.photoSent });
    } catch (err) {
      setNote({ ok: false, text: err instanceof ApiError && err.code === "too_many" ? s.photoTooMany : s.photoErr });
    } finally {
      setBusy(false);
    }
  };

  if (!st) return <p className="t-meta">{t.common.loading}</p>;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex gap-3">
        <Face src={st.approved ? `/api/me/photo/approved?v=${st.approvedAt ?? ""}` : null} />
        {st.pending ? <Face src={`/api/me/photo/pending?v=${st.pendingAt ?? ""}`} faded /> : null}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {st.approved ? <Badge tone="success">{s.photoApproved}</Badge> : null}
          {st.pending ? <Badge tone="warning">{s.photoPending}</Badge> : null}
        </div>
        {!st.approved && !st.pending ? <p className="text-[0.875rem] font-medium">{s.photoNone}</p> : null}
        {st.reason && !st.pending ? (
          <p className="text-[0.8125rem] text-danger">{fmt(s.photoRejected, { reason: st.reason })}</p>
        ) : null}
        <p className="t-meta text-[0.8125rem]">{s.photoTips}</p>
        <label className={`${btn.small} cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
          {busy ? s.photoUploading : s.photoUpload}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void upload(f);
            }}
          />
        </label>
        {note ? (
          <p role="status" className={`text-[0.8125rem] font-medium ${note.ok ? "text-success" : "text-danger"}`}>
            {note.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Face({ src, faded }: { src: string | null; faded?: boolean }) {
  return (
    <span
      className={`inline-flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-border ${
        faded ? "opacity-70 ring-2 ring-warning" : ""
      }`}
    >
      {src ? (
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="size-9 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <circle cx="12" cy="8.5" r="3.6" />
          <path d="M5 19.5c1.4-3.3 4-5 7-5s5.6 1.7 7 5" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}
