import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router";
import { BikeIcon, CarIcon, CheckIcon, MotorIcon, PlusIcon, WalkIcon } from "../components/Icon";
import { Segment, btn, segmentClass } from "../components/ui";
import { fmt, useI18n } from "../i18n";
import { ApiError, api } from "../lib/api";
import { PHOTOS, formatWhen, useMyApplications, type ApplyRole, type PhotoKind } from "../lib/applications";
import { preparePhoto } from "../lib/photo";
import { useSession } from "../lib/session";

/**
 * Apply for a role. Runner: a short form and a photo of the matric card.
 * Driver: identity, licence, vehicle and four photos. Every application is
 * reviewed by an admin (target: within 24 hours).
 */
export default function Apply() {
  const { role } = useParams();
  if (role !== "runner" && role !== "driver") return <Navigate to="/settings#roles" replace />;
  return <ApplyFor role={role} />;
}

const field =
  "h-11 w-full rounded-(--radius-control) border border-border-input bg-card px-3 text-[0.9375rem] motion-interactive placeholder:text-muted-foreground focus:border-foreground focus:ring-3 focus:ring-foreground/10 focus:outline-none aria-invalid:border-danger";

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const WAYS = [
  ["walk", WalkIcon],
  ["bicycle", BikeIcon],
  ["motorcycle", MotorIcon],
  ["car", CarIcon],
] as const;
type Way = (typeof WAYS)[number][0];

type Form = {
  vehicle: Way | "";
  fullName: string;
  matricNo: string;
  faculty: string;
  licenseClass: "" | "B2" | "B" | "D" | "DA";
  licenseType: "competent" | "probationary";
  licenseExpiry: string;
  vehicleType: "car" | "motorcycle";
  vehicleModel: string;
  vehicleColor: string;
  plate: string;
  seats: string;
  roadTaxExpiry: string;
  insured: boolean;
  agree: boolean;
};

function ApplyFor({ role }: { role: ApplyRole }) {
  const { t, locale } = useI18n();
  const { user, refresh } = useSession();
  const { apps } = useMyApplications();
  const a = t.apply;
  const driver = role === "driver";

  const [form, setForm] = useState<Form>({
    vehicle: "",
    fullName: user?.name ?? "",
    matricNo: "",
    faculty: user?.college ?? "",
    licenseClass: "",
    licenseType: "competent",
    licenseExpiry: "",
    vehicleType: "car",
    vehicleModel: "",
    vehicleColor: "",
    plate: "",
    seats: "4",
    roadTaxExpiry: "",
    insured: false,
    agree: false,
  });
  const [photos, setPhotos] = useState<Partial<Record<PhotoKind, Blob>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setFormError(null);
    setErrors((e) => ({ ...e, [k]: "" }));
    setForm((f) => ({ ...f, [k]: v }));
  };

  if (!user) return null;
  const latest = apps?.find((x) => x.role === role);
  const status = user.roles[role];

  if (state === "sent") {
    return (
      <Centered>
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckIcon className="size-6" />
        </span>
        <h1 className="t-page-title mt-4">{a.sentTitle}</h1>
        <p className="t-body mt-2 text-foreground-secondary">{a.sentBody}</p>
        <Link to="/settings#roles" className={`${btn.ink} mt-6`}>
          {a.backToSettings}
        </Link>
      </Centered>
    );
  }

  const title = driver ? a.titleDriver : a.titleRunner;
  if (status === "pending" || status === "active") {
    return (
      <Centered>
        <h1 className="t-page-title">{title}</h1>
        <p className="t-body mt-2 text-foreground-secondary">
          {status === "pending" ? a.statusPending : a.statusActive}
        </p>
        <Link to="/settings#roles" className={`${btn.outline} mt-6`}>
          {a.backToSettings}
        </Link>
      </Centered>
    );
  }

  const cooldown = latest?.reapplyAt && new Date(latest.reapplyAt) > new Date() ? latest.reapplyAt : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errs: Record<string, string> = {};
    if (form.fullName.trim().length < 3) errs.fullName = a.errRequired;
    if (!/^[A-Za-z0-9/-]{5,20}$/.test(form.matricNo.replace(/\s/g, ""))) errs.matricNo = a.errMatric;
    if (form.faculty.trim().length < 2) errs.faculty = a.errRequired;
    if (driver) {
      if (!form.licenseClass) errs.licenseClass = a.errRequired;
      if (!form.licenseExpiry) errs.licenseExpiry = a.errRequired;
      else if (form.licenseExpiry < day(30)) errs.licenseExpiry = a.errExpiry;
      if (form.vehicleModel.trim().length < 2) errs.vehicleModel = a.errRequired;
      if (form.vehicleColor.trim().length < 2) errs.vehicleColor = a.errRequired;
      if (!/^[A-Za-z0-9]{2,10}$/.test(form.plate.replace(/\s/g, ""))) errs.plate = a.errPlate;
      if (!form.roadTaxExpiry) errs.roadTaxExpiry = a.errRequired;
      else if (form.roadTaxExpiry < day(0)) errs.roadTaxExpiry = a.errRoadTax;
      const bike = form.vehicleType === "motorcycle";
      if (form.licenseClass && bike !== (form.licenseClass === "B" || form.licenseClass === "B2"))
        errs.licenseClass = a.errClassVehicle;
      if (!form.insured) errs.insured = a.errRequired;
    }
    if (!driver && !form.vehicle) errs.vehicle = a.errRequired;
    for (const k of PHOTOS[role]) if (!photos[k]) errs[k] = a.errRequired;
    if (!form.agree) errs.agree = a.errRequired;
    if (Object.values(errs).some(Boolean)) {
      setErrors(errs);
      setFormError(PHOTOS[role].some((k) => errs[k]) ? a.errPhoto : a.errFields);
      return;
    }

    const details = driver
      ? {
          fullName: form.fullName,
          matricNo: form.matricNo,
          faculty: form.faculty,
          agree: true,
          licenseClass: form.licenseClass,
          licenseType: form.licenseType,
          licenseExpiry: form.licenseExpiry,
          vehicleType: form.vehicleType,
          vehicleModel: form.vehicleModel,
          vehicleColor: form.vehicleColor,
          plate: form.plate,
          seats: form.vehicleType === "motorcycle" ? 1 : Number(form.seats),
          roadTaxExpiry: form.roadTaxExpiry,
          insured: true,
        }
      : { fullName: form.fullName, matricNo: form.matricNo, faculty: form.faculty, vehicle: form.vehicle, agree: true };
    const fd = new FormData();
    fd.set("details", JSON.stringify(details));
    for (const k of PHOTOS[role]) fd.set(k, photos[k]!, `${k}.jpg`);

    setState("sending");
    try {
      await api(`/me/roles/${role}`, { method: "POST", form: fd });
      await refresh();
      setState("sent");
    } catch (err) {
      setState("idle");
      if (!(err instanceof ApiError)) return setFormError(t.settings.errGeneric);
      const map: Record<string, string> = {
        need_whatsapp: a.needWhatsapp,
        already_applied: a.errAlready,
        too_many: a.errTooMany,
        payload_too_large: a.errTooLarge,
        cooldown: fmt(a.errCooldown, { time: err.until ? formatWhen(err.until, locale) : "" }),
      };
      if (err.fields.length) {
        const byField: Record<string, string> = {
          licenseExpiry: a.errExpiry,
          roadTaxExpiry: a.errRoadTax,
          licenseClass: a.errClassVehicle,
          seats: a.errSeats,
          plate: a.errPlate,
          matricNo: a.errMatric,
        };
        setErrors(Object.fromEntries(err.fields.map((f) => [f, byField[f] ?? a.errRequired])));
        setFormError(err.code === "invalid_photo" ? a.errPhotoRead : a.errFields);
      } else setFormError(map[err.code] ?? t.settings.errGeneric);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="t-page-title">{title}</h1>
      <p className="t-body mt-2 text-foreground-secondary">{driver ? a.leadDriver : a.leadRunner}</p>

      {latest?.status === "rejected" ? (
        <div className="mt-6 rounded-(--radius-surface) border border-border bg-surface px-4 py-3.5">
          <p className="text-[0.9375rem] font-semibold">{a.rejectedTitle}</p>
          {latest.reason ? <p className="t-meta mt-0.5">{fmt(a.reason, { reason: latest.reason })}</p> : null}
          {cooldown ? (
            <p className="t-meta mt-0.5 font-medium text-foreground">
              {fmt(a.reapplyAt, { time: formatWhen(cooldown, locale) })}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 rounded-(--radius-surface) border border-border px-4 py-3.5">
        <p className="t-label">{a.needTitle}</p>
        <ul className="mt-2 space-y-1.5">
          {(driver ? a.needDriver : a.needRunner).map((n) => (
            <li key={n} className="flex items-start gap-2 text-[0.875rem] text-foreground-secondary">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              {n}
            </li>
          ))}
        </ul>
      </div>

      {!user.whatsapp ? (
        <div className="mt-6 rounded-(--radius-surface) border border-primary-border bg-primary-soft px-4 py-3.5">
          <p className="text-[0.9375rem]">{a.needWhatsapp}</p>
          <Link to="/settings#profile" className={`${btn.small} mt-3 bg-card`}>
            {a.addWhatsapp}
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-8 space-y-10">
          <Section title={a.sectionYou}>
            <Text
              label={a.fullName}
              value={form.fullName}
              onChange={(v) => set("fullName", v)}
              error={errors.fullName}
              max={60}
              autoComplete="name"
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <Text
                label={a.matricNo}
                value={form.matricNo}
                onChange={(v) => set("matricNo", v.toUpperCase())}
                error={errors.matricNo}
                max={20}
              />
              <Text
                label={a.faculty}
                value={form.faculty}
                onChange={(v) => set("faculty", v)}
                error={errors.faculty}
                max={60}
                placeholder={a.facultyPh}
              />
            </div>
            {!driver ? (
              <div>
                <span className="t-label">{a.vehicle}</span>
                <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={a.vehicle}>
                  {WAYS.map(([v, Icon], i) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={form.vehicle === v}
                      onClick={() => set("vehicle", v)}
                      className={`flex flex-col items-center gap-1.5 rounded-(--radius-control) border px-2 py-3 text-[0.8125rem] font-medium motion-interactive ${
                        form.vehicle === v
                          ? "border-primary bg-primary-soft text-primary-strong"
                          : errors.vehicle
                            ? "border-danger"
                            : "border-border hover:bg-surface"
                      }`}
                    >
                      <Icon className="size-6" />
                      {t.runner.ways[i].title}
                    </button>
                  ))}
                </div>
                <FieldError text={errors.vehicle} />
              </div>
            ) : null}
          </Section>

          {driver ? (
            <>
              <Section title={a.sectionVehicle}>
                <Choice
                  label={a.vehicleType}
                  value={form.vehicleType}
                  options={[
                    ["car", a.car],
                    ["motorcycle", a.motorcycle],
                  ]}
                  onChange={(v) => {
                    set("vehicleType", v);
                    set("licenseClass", "");
                  }}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Text
                    label={a.vehicleModel}
                    value={form.vehicleModel}
                    onChange={(v) => set("vehicleModel", v)}
                    error={errors.vehicleModel}
                    max={40}
                    placeholder={a.vehicleModelPh}
                  />
                  <Text
                    label={a.vehicleColor}
                    value={form.vehicleColor}
                    onChange={(v) => set("vehicleColor", v)}
                    error={errors.vehicleColor}
                    max={20}
                    placeholder={a.vehicleColorPh}
                  />
                  <Text
                    label={a.plate}
                    value={form.plate}
                    onChange={(v) => set("plate", v.toUpperCase())}
                    error={errors.plate}
                    max={12}
                    placeholder={a.platePh}
                  />
                  {form.vehicleType === "car" ? (
                    <label className="block">
                      <span className="t-label">{a.seats}</span>
                      <select
                        className={`${field} mt-1.5`}
                        value={form.seats}
                        onChange={(e) => set("seats", e.target.value)}
                      >
                        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <DateField
                    label={a.roadTaxExpiry}
                    value={form.roadTaxExpiry}
                    min={day(0)}
                    onChange={(v) => set("roadTaxExpiry", v)}
                    error={errors.roadTaxExpiry}
                  />
                </div>
                <Check checked={form.insured} onChange={(v) => set("insured", v)} error={errors.insured}>
                  {a.insured}
                </Check>
              </Section>

              <Section title={a.sectionLicence}>
                <label className="block">
                  <span className="t-label">{a.licenseClass}</span>
                  <select
                    className={`${field} mt-1.5`}
                    value={form.licenseClass}
                    onChange={(e) => set("licenseClass", e.target.value as Form["licenseClass"])}
                    aria-invalid={Boolean(errors.licenseClass)}
                  >
                    <option value="">—</option>
                    {(form.vehicleType === "motorcycle"
                      ? ([
                          ["B2", a.classB2],
                          ["B", a.classB],
                        ] as const)
                      : ([
                          ["D", a.classD],
                          ["DA", a.classDA],
                        ] as const)
                    ).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <FieldError text={errors.licenseClass} />
                </label>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Choice
                    label={a.licenseType}
                    value={form.licenseType}
                    options={[
                      ["competent", a.competent],
                      ["probationary", a.probationary],
                    ]}
                    onChange={(v) => set("licenseType", v)}
                  />
                  <DateField
                    label={a.licenseExpiry}
                    value={form.licenseExpiry}
                    min={day(30)}
                    onChange={(v) => set("licenseExpiry", v)}
                    error={errors.licenseExpiry}
                  />
                </div>
              </Section>
            </>
          ) : null}

          <Section title={a.sectionPhotos} lead={a.photosLead}>
            <div className="grid gap-3 sm:grid-cols-2">
              {PHOTOS[role].map((k) => (
                <PhotoPicker
                  key={k}
                  label={a[`photo_${k}`]}
                  blob={photos[k]}
                  error={errors[k]}
                  onPick={(b) => {
                    setFormError(null);
                    setErrors((e) => ({ ...e, [k]: "" }));
                    setPhotos((p) => ({ ...p, [k]: b }));
                  }}
                  onFail={() => setErrors((e) => ({ ...e, [k]: a.errPhotoRead }))}
                />
              ))}
            </div>
          </Section>

          <div className="space-y-4 border-t border-border pt-6">
            <Check checked={form.agree} onChange={(v) => set("agree", v)} error={errors.agree}>
              {a.agree}
            </Check>
            {cooldown ? (
              <p className="text-[0.875rem] text-foreground-secondary">
                {fmt(a.reapplyAt, { time: formatWhen(cooldown, locale) })}
              </p>
            ) : null}
            {formError ? (
              <p role="alert" className="text-[0.875rem] font-medium text-danger">
                {formError}
              </p>
            ) : null}
            <button
              type="submit"
              className={`${btn.primary} w-full sm:w-auto disabled:opacity-60`}
              disabled={state === "sending" || Boolean(cooldown)}
            >
              {state === "sending" ? a.sending : a.submit}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-md py-10 text-center">{children}</div>;
}

function Section({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-[1.0625rem] font-semibold">{title}</h2>
      {lead ? <p className="t-meta mt-1">{lead}</p> : null}
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}

function FieldError({ text }: { text?: string }) {
  return text ? (
    <span role="alert" className="mt-1 block text-[0.75rem] font-medium text-danger">
      {text}
    </span>
  ) : null;
}

function Text(p: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  max: number;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="t-label">{p.label}</span>
      <input
        className={`${field} mt-1.5`}
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        maxLength={p.max}
        placeholder={p.placeholder}
        autoComplete={p.autoComplete ?? "off"}
        aria-invalid={Boolean(p.error)}
      />
      <FieldError text={p.error} />
    </label>
  );
}

function DateField(p: { label: string; value: string; min: string; onChange: (v: string) => void; error?: string }) {
  return (
    <label className="block">
      <span className="t-label">{p.label}</span>
      <input
        type="date"
        className={`${field} mt-1.5`}
        value={p.value}
        min={p.min}
        onChange={(e) => p.onChange(e.target.value)}
        aria-invalid={Boolean(p.error)}
      />
      <FieldError text={p.error} />
    </label>
  );
}

function Choice<V extends string>(p: {
  label: string;
  value: V;
  options: readonly (readonly [V, string])[];
  onChange: (v: V) => void;
}) {
  return (
    <div>
      <span className="t-label">{p.label}</span>
      <div className="mt-1.5" role="group" aria-label={p.label}>
        <Segment columns={2}>
          {p.options.map(([v, l]) => (
            <button
              key={v}
              type="button"
              aria-pressed={v === p.value}
              onClick={() => p.onChange(v)}
              className={segmentClass(v === p.value)}
            >
              {l}
            </button>
          ))}
        </Segment>
      </div>
    </div>
  );
}

function Check(p: { checked: boolean; onChange: (v: boolean) => void; error?: string; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        className="mt-0.5 size-4.5 shrink-0 accent-(--primary)"
        checked={p.checked}
        onChange={(e) => p.onChange(e.target.checked)}
        aria-invalid={Boolean(p.error)}
      />
      <span className={`text-[0.875rem] ${p.error ? "text-danger" : "text-foreground-secondary"}`}>{p.children}</span>
    </label>
  );
}

function PhotoPicker(p: { label: string; blob?: Blob; error?: string; onPick: (b: Blob) => void; onFail: () => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const url = useMemo(() => (p.blob ? URL.createObjectURL(p.blob) : null), [p.blob]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-(--radius-surface) border p-3 motion-interactive hover:bg-surface ${
        p.error ? "border-danger" : "border-border"
      }`}
    >
      <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-(--radius-control) bg-muted">
        {url ? (
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <PlusIcon className="size-5 text-muted-foreground" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.875rem] font-semibold">{p.label}</span>
        <span className={`block text-[0.75rem] ${p.error ? "font-medium text-danger" : "text-muted-foreground"}`}>
          {p.error || (busy ? "…" : p.blob ? t.apply.changePhoto : t.apply.choosePhoto)}
        </span>
      </span>
      {p.blob ? <CheckIcon className="size-5 shrink-0 text-success" /> : null}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          try {
            p.onPick(await preparePhoto(file));
          } catch {
            p.onFail();
          } finally {
            setBusy(false);
          }
        }}
      />
    </label>
  );
}
