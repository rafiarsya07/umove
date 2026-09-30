import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Container } from "../components/Container";
import { Avatar, Stars, VerifiedMark, btn } from "../components/ui";
import { fmt, useI18n } from "../i18n";
import { ApiError, api } from "../lib/api";
import { formatDate, formatMonth } from "../lib/format";
import { useSession } from "../lib/session";
import NotFound from "./NotFound";

type PublicProfile = {
  name: string;
  username: string;
  college: string;
  bio: string;
  joined: string;
  verifiedRunner: boolean;
  runnerVehicle: "walk" | "bicycle" | "motorcycle" | "car" | null;
  stats: { requests: number; runs: number; rating: number | null; ratingCount: number };
  reviews: { id: number; by: string; stars: number; body: string; when: string }[];
};

/** Public profile: who they are, their standing, and reviews. No contact details. */
export default function Profile() {
  const { username = "" } = useParams();
  const { t, locale } = useI18n();
  const { user } = useSession();
  const p = t.profile;
  const [state, setState] = useState<{ status: "loading" | "ok" | "missing" | "error"; data?: PublicProfile }>({
    status: "loading",
  });

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    api<PublicProfile>(`/users/${encodeURIComponent(username.toLowerCase())}`)
      .then((data) => alive && setState({ status: "ok", data }))
      .catch(
        (err) => alive && setState({ status: err instanceof ApiError && err.status === 404 ? "missing" : "error" }),
      );
    return () => {
      alive = false;
    };
  }, [username, user?.username, user?.name, user?.bio, user?.college]);

  if (state.status === "missing") return <NotFound title={p.notFoundTitle} body={p.notFoundBody} />;
  if (state.status !== "ok" || !state.data) {
    return (
      <Container className="max-w-4xl py-12">
        <p className="t-meta">{state.status === "error" ? t.common.error : t.common.loading}</p>
      </Container>
    );
  }

  const profile = state.data;
  const own = user?.username === profile.username;

  return (
    <Container className="max-w-4xl py-8 sm:py-12">
      <header className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={profile.name} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-[1.5rem] leading-tight font-bold tracking-tight sm:text-[1.875rem]">
              {profile.name}
            </h1>
            <p className="t-meta mt-0.5">@{profile.username}</p>
            <p className="t-meta mt-1 flex flex-wrap gap-x-3 text-[0.75rem]">
              {profile.college ? <span>{profile.college}</span> : null}
              <span>{fmt(p.memberSince, { date: formatMonth(profile.joined, locale) })}</span>
            </p>
          </div>
        </div>
        {own ? (
          <Link to="/settings" className={`${btn.outline} h-10 text-[0.875rem]`}>
            {p.edit}
          </Link>
        ) : null}
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {profile.verifiedRunner ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border py-1 pr-3 pl-1.5 text-[0.8125rem] font-semibold">
            <VerifiedMark className="size-4" />
            {p.verified}
          </span>
        ) : null}
        {profile.runnerVehicle ? (
          <span className="rounded-full border border-border px-3 py-1 text-[0.8125rem]">
            {fmt(p.deliversBy, {
              way: t.runner.ways[["walk", "bicycle", "motorcycle", "car"].indexOf(profile.runnerVehicle)].title,
            })}
          </span>
        ) : null}
        {profile.stats.rating !== null ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[0.8125rem]">
            <Stars value={profile.stats.rating} className="size-3.5" />
            <span className="font-semibold tabular-nums">{profile.stats.rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({profile.stats.ratingCount})</span>
          </span>
        ) : null}
        <span className="rounded-full border border-border px-3 py-1 text-[0.8125rem]">
          <span className="font-semibold tabular-nums">{profile.stats.runs}</span>{" "}
          <span className="text-muted-foreground">{p.runs}</span>
        </span>
        <span className="rounded-full border border-border px-3 py-1 text-[0.8125rem]">
          <span className="font-semibold tabular-nums">{profile.stats.requests}</span>{" "}
          <span className="text-muted-foreground">{p.requests}</span>
        </span>
      </div>

      {profile.bio ? <p className="t-body mt-5 max-w-2xl text-foreground-secondary">{profile.bio}</p> : null}

      <section className="mt-12">
        <h2 className="t-section-title mb-4">{p.reviews}</h2>
        {profile.reviews.length === 0 ? (
          <p className="t-meta">{p.noReviews}</p>
        ) : (
          <ul className="divide-y divide-border rounded-(--radius-surface) border border-border">
            {profile.reviews.map((r) => (
              <li key={r.id} className="p-4">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Stars value={r.stars} className="size-3.5" />
                  <Link to={`/u/${r.by}`} className="text-[0.8125rem] font-semibold hover:underline">
                    @{r.by}
                  </Link>
                  <span className="t-meta text-[0.75rem]">{formatDate(r.when, locale)}</span>
                </div>
                {r.body ? <p className="t-body mt-1.5 text-foreground-secondary">{r.body}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
