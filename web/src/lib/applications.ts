import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export type ApplyRole = "runner" | "driver";
export type PhotoKind = "matric_card" | "license" | "vehicle" | "selfie";

export const PHOTOS: Record<ApplyRole, PhotoKind[]> = {
  runner: ["matric_card", "selfie"],
  driver: ["matric_card", "license", "vehicle", "selfie"],
};

export type MyApplication = {
  role: ApplyRole;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  reason: string | null;
  createdAt: string;
  decidedAt: string | null;
  reapplyAt: string | null;
};

/** My latest application per role (null while loading). */
export function useMyApplications() {
  const [apps, setApps] = useState<MyApplication[] | null>(null);
  const load = useCallback(() => {
    api<MyApplication[]>("/me/applications")
      .then(setApps)
      .catch(() => setApps([]));
  }, []);
  useEffect(load, [load]);
  return { apps, reload: load };
}

/** "5 Oct, 14:30" in the current language. */
export function formatWhen(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}
