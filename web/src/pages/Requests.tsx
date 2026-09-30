import { Link } from "react-router";
import { Container } from "../components/Container";
import { PlusIcon } from "../components/Icon";
import { RequestGrid } from "../components/RequestCard";
import { btn } from "../components/ui";
import { useI18n } from "../i18n";
import { useBoard } from "../lib/useBoard";

/** The request board: every open request, updated live. */
export default function Requests() {
  const { t } = useI18n();
  const r = t.requests;
  const { items, error, reload } = useBoard();

  return (
    <Container className="py-8 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="t-page-title">{r.title}</h1>
          <p className="t-body mt-1 text-muted-foreground">{r.lead}</p>
        </div>
        <Link to="/requests/new" className={`${btn.primary} self-start sm:self-auto`}>
          <PlusIcon className="size-4" />
          {r.new}
        </Link>
      </div>

      <div className="mt-8">
        {items === null ? (
          error ? (
            <div className="rounded-(--radius-surface) border border-border px-6 py-10 text-center">
              <p className="t-body text-muted-foreground">
                {error === "offline" ? t.common.offline : t.common.error}
              </p>
              <button type="button" onClick={reload} className={`${btn.outline} mt-4`}>
                {t.common.retry}
              </button>
            </div>
          ) : (
            <p className="t-meta">{t.common.loading}</p>
          )
        ) : items.length === 0 ? (
          <div className="rounded-(--radius-surface) border border-dashed border-border-strong px-6 py-12 text-center">
            <p className="text-[1rem] font-semibold">{r.empty}</p>
            <p className="t-meta mt-1">{r.emptyCta}</p>
            <Link to="/requests/new" className={`${btn.ink} mt-5`}>
              {r.new}
            </Link>
          </div>
        ) : (
          <RequestGrid items={items} />
        )}
      </div>
    </Container>
  );
}
