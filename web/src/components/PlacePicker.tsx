import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { api } from "../lib/api";
import { CheckIcon } from "./Icon";

export type Place = { id: number; name: string; area: string; kind: "food" | "shop" | "print" | "other" };
export const placeLabel = (p: Place) => `${p.name}, ${p.area}`;

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

/**
 * Pickup place: a search box over the admin's list of places inside UM,
 * grouped by area (KK12, faculties...). Picking one sets `placeId`; typing
 * something else clears it and keeps the text as a custom place.
 */
export function PlacePicker({
  value,
  placeId,
  onChange,
  className,
}: {
  value: string;
  placeId: number | null;
  onChange: (text: string, placeId: number | null) => void;
  className: string;
}) {
  const { t } = useI18n();
  const r = t.requests;
  const listId = useId();
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<Place[]>("/places")
      .then(setPlaces)
      .catch(() => setPlaces([]));
  }, []);

  // Close when tapping outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Words can match the name or the area in any order: "ayam kk12", "kk12 kafe".
  const matches = useMemo(() => {
    if (!places) return [];
    const words = norm(placeId ? "" : value)
      .split(" ")
      .filter(Boolean);
    return places.filter((p) => {
      const hay = norm(`${p.name} ${p.area} ${r.placeKinds[p.kind]}`);
      return words.every((w) => hay.includes(w));
    });
  }, [places, value, placeId, r.placeKinds]);

  const groups = useMemo(() => {
    const m = new Map<string, Place[]>();
    for (const p of matches) m.set(p.area, [...(m.get(p.area) ?? []), p]);
    return [...m.entries()];
  }, [matches]);

  const pick = (p: Place) => {
    onChange(placeLabel(p), p.id);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      const n = matches.length;
      if (n) setActive((i) => (e.key === "ArrowDown" ? (i + 1) % n : (i - 1 + n) % n));
    } else if (e.key === "Enter" && open && matches[active]) {
      e.preventDefault();
      pick(matches[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const typed = value.trim().length >= 2 && placeId === null;

  return (
    <div ref={box} className="relative">
      <div className="relative">
        <input
          className={`${className} ${placeId ? "pr-9" : ""}`}
          value={value}
          onChange={(e) => {
            onChange(e.target.value, null);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={r.pickupPlaceholder}
          maxLength={80}
          aria-label={r.pickup}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[active] ? `${listId}-${matches[active].id}` : undefined}
          autoComplete="off"
        />
        {placeId ? (
          <CheckIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-primary" />
        ) : null}
      </div>

      {open && matches.length > 0 ? (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-(--radius-control) border border-border bg-card py-1 shadow-lg"
        >
          {groups.map(([area, items]) => (
            <div key={area} role="group" aria-label={area}>
              <p className="px-3 pt-2 pb-1 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
                {area}
              </p>
              {items.map((p) => {
                const i = matches.indexOf(p);
                return (
                  <button
                    key={p.id}
                    id={`${listId}-${p.id}`}
                    type="button"
                    role="option"
                    aria-selected={p.id === placeId}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(p)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[0.875rem] ${
                      i === active ? "bg-surface" : ""
                    }`}
                  >
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="shrink-0 text-[0.75rem] text-muted-foreground">{r.placeKinds[p.kind]}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}

      <p className={`mt-1 text-[0.75rem] ${typed ? "text-warning" : "text-muted-foreground"}`}>
        {placeId ? r.placeListed : typed ? r.placeCustom : r.placeHint}
      </p>
    </div>
  );
}
