import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { Container } from "../components/Container";
import { CheckIcon } from "../components/Icon";
import { Avatar, Badge, Segment, SettingsRow, VerifiedMark, btn, segmentClass } from "../components/ui";
import { LANGS, fmt, useI18n } from "../i18n";
import { ApiError, api } from "../lib/api";
import { formatWhen, useMyApplications, type ApplyRole } from "../lib/applications";
import { useSession, type Me, type RoleStatus } from "../lib/session";

/**
 * Settings. For everyone: language. For a signed-in member: who you are,
 * the profile form, and roles.
 */
export default function Settings() {
  const { t } = useI18n();
  const { user, loading } = useSession();
  const [params] = useSearchParams();
  const s = t.settings;

  return (
    <Container className="max-w-3xl py-8 sm:py-10">
      <h1 className="t-page-title">{s.title}</h1>

      {user && params.get("welcome") ? (
        <div className="mt-6 rounded-(--radius-surface) border border-primary-border bg-primary-soft px-4 py-3.5">
          <p className="text-[0.9375rem] font-semibold">{s.welcomeTitle}</p>
          <p className="t-meta mt-0.5 text-foreground-secondary">{s.welcomeBody}</p>
        </div>
      ) : null}

      {user ? (
        <div className="mt-6 flex items-center gap-3 rounded-(--radius-surface) border border-border px-4 py-3">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9375rem] font-semibold">{user.name}</p>
            <p className="t-meta truncate">{user.email}</p>
          </div>
          <Link
            to={`/u/${user.username}`}
            className="shrink-0 text-[0.8125rem] font-semibold text-primary-strong hover:underline"
          >
            {s.viewProfile}
          </Link>
        </div>
      ) : null}

      <div className="mt-2 divide-y divide-border">
        {user ? (
          <>
            <SettingsRow id="profile" title={s.profile} lead={s.profileLead}>
              <ProfileForm user={user} />
            </SettingsRow>
            <SettingsRow id="roles" title={s.roles} lead={s.rolesLead}>
              <RolesPanel user={user} />
            </SettingsRow>
          </>
        ) : null}

        <SettingsRow id="preferences" title={s.preferences} lead={s.preferencesLead}>
          <PreferencesPanel />
        </SettingsRow>

        {!user && !loading ? (
          <SettingsRow title={s.profile} lead={s.profileLead}>
            <Link to="/login?next=/settings" className={btn.primary}>
              {s.signInForMore}
            </Link>
          </SettingsRow>
        ) : null}
      </div>
    </Container>
  );
}

function PreferencesPanel() {
  const { t, lang, setLang } = useI18n();
  const s = t.settings;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="t-label">{s.language}</span>
      <div role="group" aria-label={s.language}>
        <Segment>
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              aria-pressed={l.code === lang}
              onClick={() => setLang(l.code)}
              className={segmentClass(l.code === lang)}
            >
              <span className="sm:hidden">{l.dict.meta.langShort}</span>
              <span className="hidden sm:inline">{l.dict.meta.langName}</span>
            </button>
          ))}
        </Segment>
      </div>
    </div>
  );
}

const field =
  "h-11 w-full rounded-(--radius-control) border border-border-input bg-card px-3 text-[0.9375rem] motion-interactive placeholder:text-muted-foreground focus:border-foreground focus:ring-3 focus:ring-foreground/10 focus:outline-none aria-invalid:border-danger";

type Field = "name" | "username" | "whatsapp" | "college" | "bio";

function ProfileForm({ user }: { user: Me }) {
  const { t } = useI18n();
  const { setUser } = useSession();
  const s = t.settings;
  const [form, setForm] = useState({
    name: user.name,
    username: user.username,
    whatsapp: user.whatsapp ?? "",
    college: user.college,
    bio: user.bio,
  });
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [errors, setErrors] = useState<Partial<Record<Field | "form", string>>>({});

  const set = (k: Field) => (e: { target: { value: string } }) => {
    setState("idle");
    setErrors((er) => ({ ...er, [k]: undefined, form: undefined }));
    setForm((f) => ({ ...f, [k]: k === "username" ? e.target.value.toLowerCase() : e.target.value }));
  };

  const messageFor: Record<Field, string> = {
    name: s.errName,
    username: s.errUsername,
    whatsapp: s.errWhatsapp,
    college: s.errGeneric,
    bio: s.errGeneric,
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState("saving");
    setErrors({});
    try {
      const me = await api<Omit<Me, "isAdmin">>("/me", { method: "PATCH", body: form });
      setUser({ ...me, isAdmin: user.isAdmin });
      setState("saved");
    } catch (err) {
      setState("idle");
      if (err instanceof ApiError && err.code === "username_taken") setErrors({ username: s.errUsernameTaken });
      else if (err instanceof ApiError && err.fields.length > 0)
        setErrors(Object.fromEntries(err.fields.map((f) => [f, messageFor[f as Field] ?? s.errGeneric])));
      else setErrors({ form: s.errGeneric });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="t-label">{s.name}</span>
          <input
            className={`${field} mt-1.5`}
            value={form.name}
            onChange={set("name")}
            maxLength={40}
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
          />
          <FieldError text={errors.name} />
        </label>
        <label className="block">
          <span className="t-label">{s.username}</span>
          <span className="relative mt-1.5 block">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
              @
            </span>
            <input
              className={`${field} pl-7`}
              value={form.username}
              onChange={set("username")}
              maxLength={24}
              autoComplete="username"
              spellCheck={false}
              aria-invalid={Boolean(errors.username)}
            />
          </span>
          {errors.username ? <FieldError text={errors.username} /> : <Hint text={s.usernameHint} />}
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="t-label">{s.whatsapp}</span>
          <input
            className={`${field} mt-1.5`}
            value={form.whatsapp}
            onChange={set("whatsapp")}
            placeholder={s.whatsappPlaceholder}
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            aria-invalid={Boolean(errors.whatsapp)}
          />
          {errors.whatsapp ? <FieldError text={errors.whatsapp} /> : <Hint text={s.whatsappHint} />}
        </label>
        <label className="block">
          <span className="t-label">{s.college}</span>
          <input
            className={`${field} mt-1.5`}
            value={form.college}
            onChange={set("college")}
            placeholder={s.collegePlaceholder}
            maxLength={40}
          />
        </label>
      </div>

      <label className="block">
        <span className="t-label">{s.bio}</span>
        <textarea
          className={`${field} mt-1.5 h-24 resize-none py-2.5`}
          value={form.bio}
          onChange={set("bio")}
          placeholder={s.bioPlaceholder}
          maxLength={160}
        />
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" className={`${btn.ink} disabled:opacity-60`} disabled={state === "saving"}>
          {state === "saving" ? s.saving : s.save}
        </button>
        {state === "saved" ? (
          <span className="inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-success">
            <CheckIcon className="size-4" />
            {s.saved}
          </span>
        ) : null}
        {errors.form ? <span className="text-[0.875rem] text-danger">{errors.form}</span> : null}
      </div>
    </form>
  );
}

function Hint({ text }: { text: string }) {
  return <span className="t-meta mt-1 block text-[0.75rem]">{text}</span>;
}
function FieldError({ text }: { text?: string }) {
  return text ? (
    <span role="alert" className="mt-1 block text-[0.75rem] font-medium text-danger">
      {text}
    </span>
  ) : null;
}

function RolesPanel({ user }: { user: Me }) {
  const { t, locale } = useI18n();
  const { refresh } = useSession();
  const { apps, reload } = useMyApplications();
  const s = t.settings;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withdraw = async (role: ApplyRole) => {
    setBusy(true);
    setError(null);
    try {
      await api(`/me/roles/${role}`, { method: "DELETE" });
      await refresh();
      reload();
    } catch {
      setError(s.errGeneric);
    } finally {
      setBusy(false);
    }
  };

  const rows: { key: string; title: string; body: string; status: RoleStatus | "soon"; role?: ApplyRole }[] = [
    { key: "customer", title: s.roleCustomer, body: s.roleCustomerBody, status: "active" },
    { key: "runner", title: s.roleRunner, body: s.roleRunnerBody, status: user.roles.runner, role: "runner" },
    { key: "driver", title: s.roleDriver, body: s.roleDriverBody, status: user.roles.driver, role: "driver" },
    { key: "seller", title: s.roleSeller, body: s.roleSellerBody, status: "soon" },
  ];

  return (
    <div>
      <ul className="divide-y divide-border rounded-(--radius-surface) border border-border">
        {rows.map((r) => {
          const app = r.role ? apps?.find((x) => x.role === r.role) : undefined;
          const note =
            r.status === "pending"
              ? s.reviewNote
              : r.status === "rejected" && app?.reason
                ? fmt(s.reasonShort, { reason: app.reason })
                : null;
          const waitUntil =
            r.status === "rejected" && app?.reapplyAt && new Date(app.reapplyAt) > new Date() ? app.reapplyAt : null;
          return (
            <li key={r.key} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[0.9375rem] font-semibold">
                  {r.title}
                  {r.role && r.status === "active" ? <VerifiedMark className="size-3.5" /> : null}
                </p>
                <p className="t-meta">{r.body}</p>
                {note ? <p className="mt-1 text-[0.75rem] font-medium text-foreground-secondary">{note}</p> : null}
              </div>
              <RoleControl
                status={r.status}
                busy={busy}
                applyTo={r.role ? `/apply/${r.role}` : undefined}
                waitUntil={waitUntil ? fmt(s.reapplyFrom, { time: formatWhen(waitUntil, locale) }) : null}
                onWithdraw={r.role ? () => withdraw(r.role!) : undefined}
              />
            </li>
          );
        })}
      </ul>
      {error ? (
        <p role="alert" className="mt-3 text-[0.875rem] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function RoleControl({
  status,
  busy,
  applyTo,
  waitUntil,
  onWithdraw,
}: {
  status: RoleStatus | "soon";
  busy: boolean;
  applyTo?: string;
  waitUntil: string | null;
  onWithdraw?: () => void;
}) {
  const { t } = useI18n();
  const s = t.settings;
  if (status === "soon") return <Badge tone="soon">{t.services.soon}</Badge>;
  if (status === "active") return <Badge tone="success">{s.statusActive}</Badge>;
  if (status === "pending")
    return (
      <span className="flex items-center gap-2">
        <Badge tone="warning">{s.statusPending}</Badge>
        {onWithdraw ? (
          <button
            type="button"
            onClick={onWithdraw}
            disabled={busy}
            className="t-meta font-medium hover:text-foreground"
          >
            {s.cancel}
          </button>
        ) : null}
      </span>
    );
  return (
    <span className="flex flex-wrap items-center gap-2">
      {status === "rejected" ? <Badge tone="muted">{s.statusRejected}</Badge> : null}
      {waitUntil ? (
        <span className="t-meta text-[0.75rem]">{waitUntil}</span>
      ) : applyTo ? (
        <Link to={applyTo} className={btn.small}>
          {status === "rejected" ? s.applyAgain : s.apply}
        </Link>
      ) : null}
    </span>
  );
}
