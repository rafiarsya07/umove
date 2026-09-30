import { useEffect, useRef, type ReactNode } from "react";
import { btn } from "./ui";

/**
 * A small confirmation step before an action that other people see or that
 * cannot be undone. Uses the native <dialog>: focus is trapped, Esc closes it,
 * and screen readers announce it as a dialog.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirm,
  cancel,
  tone = "primary",
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirm: string;
  cancel: string;
  tone?: "primary" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="confirm-title"
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-(--radius-surface) border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-foreground/40"
    >
      <div className="p-5">
        <h2 id="confirm-title" className="text-[1.0625rem] font-semibold">
          {title}
        </h2>
        <div className="t-body mt-1.5 text-[0.9375rem] text-foreground-secondary">{body}</div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={btn.outline} onClick={onClose} disabled={busy}>
            {cancel}
          </button>
          <button
            type="button"
            className={`${tone === "danger" ? "inline-flex h-11 items-center justify-center rounded-full bg-danger px-5 text-[0.9375rem] font-semibold text-white motion-pressable hover:opacity-90" : btn.primary} disabled:opacity-60`}
            onClick={onConfirm}
            disabled={busy}
            autoFocus
          >
            {confirm}
          </button>
        </div>
      </div>
    </dialog>
  );
}
