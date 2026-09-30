import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Badge, btn } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { PageTitle, panel } from "./AdminLayout";

type Kind = "food" | "shop" | "print" | "other";
type Row = { id: number; name: string; area: string; kind: Kind; active: boolean; uses: number };
type Form = { id?: number; name: string; area: string; kind: Kind; active: boolean };

const KINDS: [Kind, string][] = [
  ["food", "Food"],
  ["shop", "Shop"],
  ["print", "Printing"],
  ["other", "Other"],
];
const EMPTY: Form = { name: "", area: "", kind: "food", active: true };
const field =
  "h-10 w-full rounded-(--radius-control) border border-border-input bg-card px-3 text-[0.9375rem] focus:border-foreground focus:outline-none aria-invalid:border-danger";

/**
 * Pickup places inside UM. Members pick from this list when posting a request
 * (they can still type a place that isn't listed). Hide a place instead of
 * deleting it, so old requests keep their link.
 */
export default function Places() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    api<Row[]>("/admin/places")
      .then(setRows)
      .catch(() => setRows([]));
  }, []);
  useEffect(load, [load]);

  const areas = useMemo(() => [...new Set((rows ?? []).map((r) => r.area))], [rows]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => !s || `${r.name} ${r.area}`.toLowerCase().includes(s));
  }, [rows, q]);

  const save = async (f: Form) => {
    setBusy(true);
    setErrors([]);
    setMessage(null);
    try {
      const { id, ...body } = f;
      await api(id ? `/admin/places/${id}` : "/admin/places", { method: "POST", body });
      if (f === form) {
        setForm({ ...EMPTY, area: f.id ? "" : f.area, kind: f.kind });
        setMessage(f.id ? "Saved." : `Added ${f.name}, ${f.area}.`);
      }
      load();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      if (code === "invalid" && err instanceof ApiError) setErrors(err.fields ?? []);
      else setMessage(code === "duplicate" ? "That place already exists in this area." : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = [
      ...(form.name.trim().length < 2 ? ["name"] : []),
      ...(form.area.trim().length < 2 ? ["area"] : []),
    ];
    setErrors(errs);
    if (!errs.length) save(form);
  };

  return (
    <div>
      <PageTitle
        title="Places"
        lead="Cafeterias, shops and print corners inside UM. Members pick from this list for the pickup. If a place isn't here they can still type it, and those requests show without the check mark."
      />

      <form onSubmit={submit} noValidate className={`${panel} mb-6 p-4`}>
        <p className="mb-3 text-[0.9375rem] font-semibold">{form.id ? "Edit place" : "Add a place"}</p>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_10rem]">
          <label className="block">
            <span className="t-label">Name</span>
            <input
              className={`${field} mt-1`}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Ayam Gepuk stall"
              maxLength={50}
              aria-invalid={errors.includes("name")}
            />
          </label>
          <label className="block">
            <span className="t-label">Area</span>
            <input
              className={`${field} mt-1`}
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
              placeholder="e.g. KK12, FSKTM"
              maxLength={40}
              list="place-areas"
              aria-invalid={errors.includes("area")}
            />
            <datalist id="place-areas">
              {areas.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="t-label">Type</span>
            <select
              className={`${field} mt-1`}
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as Kind })}
            >
              {KINDS.map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="submit" disabled={busy} className={`${btn.primary} h-10! disabled:opacity-60`}>
            {form.id ? "Save changes" : "Add place"}
          </button>
          {form.id ? (
            <button type="button" className={btn.small} onClick={() => setForm(EMPTY)}>
              Cancel
            </button>
          ) : null}
          {message ? <p className="t-meta ml-1">{message}</p> : null}
        </div>
      </form>

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="t-meta">
          {rows ? `${rows.filter((r) => r.active).length} shown to members, ${rows.filter((r) => !r.active).length} hidden` : ""}
        </p>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter"
          aria-label="Filter places"
          className="h-9 w-44 rounded-full border border-border-input bg-card px-3 text-[0.875rem] focus:border-foreground focus:outline-none"
        />
      </div>

      <div className={`${panel} overflow-x-auto`}>
        <table className="w-full text-left text-[0.875rem]">
          <thead className="border-b border-border text-[0.75rem] text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Area</th>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Requests</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows === null ? (
              <tr>
                <td className="t-meta px-4 py-4" colSpan={6}>
                  Loading…
                </td>
              </tr>
            ) : shown.length === 0 ? (
              <tr>
                <td className="t-meta px-4 py-4" colSpan={6}>
                  No places yet.
                </td>
              </tr>
            ) : (
              shown.map((p) => (
                <tr key={p.id} className={p.active ? "" : "text-muted-foreground"}>
                  <td className="px-4 py-2.5 font-medium whitespace-nowrap">{p.area}</td>
                  <td className="px-4 py-2.5">{p.name}</td>
                  <td className="px-4 py-2.5">{KINDS.find(([k]) => k === p.kind)?.[1]}</td>
                  <td className="px-4 py-2.5 tabular-nums">{p.uses}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={p.active ? "success" : "muted"}>{p.active ? "Shown" : "Hidden"}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        className={btn.small}
                        onClick={() => {
                          setForm({ id: p.id, name: p.name, area: p.area, kind: p.kind, active: p.active });
                          setErrors([]);
                          setMessage(null);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={btn.small}
                        disabled={busy}
                        onClick={() => save({ id: p.id, name: p.name, area: p.area, kind: p.kind, active: !p.active })}
                      >
                        {p.active ? "Hide" : "Show"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
