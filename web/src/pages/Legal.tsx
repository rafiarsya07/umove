import { Link } from "react-router";
import { Container } from "../components/Container";
import { useI18n } from "../i18n";
import { useLegal } from "../i18n/legal";

/** /privacy and /terms: plain, readable, in the visitor's language. */
export default function Legal({ kind }: { kind: "privacy" | "terms" }) {
  const { t } = useI18n();
  const legal = useLegal();
  if (!legal) {
    return (
      <Container className="max-w-2xl py-12">
        <p className="t-meta">{t.common.loading}</p>
      </Container>
    );
  }
  const doc = legal[kind];
  return (
    <Container className="max-w-2xl! py-10 sm:py-14">
      <h1 className="t-page-title">{doc.title}</h1>
      <p className="t-meta mt-1">{legal.updated}</p>
      <p className="t-body mt-5 text-foreground-secondary">{doc.intro}</p>
      <div className="mt-8 space-y-8">
        {doc.sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-[1.0625rem] font-semibold">{s.h}</h2>
            {s.p.map((para) => (
              <p key={para.slice(0, 32)} className="t-body mt-2 text-foreground-secondary">
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>
      <p className="mt-10 border-t border-border pt-5 text-[0.875rem]">
        <Link
          to={kind === "privacy" ? "/terms" : "/privacy"}
          className="font-semibold text-primary-strong hover:underline"
        >
          {kind === "privacy" ? t.nav.terms : t.nav.privacy}
        </Link>
      </p>
    </Container>
  );
}
