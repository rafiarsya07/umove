import { Link } from "react-router";
import { useI18n } from "../i18n";
import { useSession } from "../lib/session";
import { Container } from "./Container";
import { Logo } from "./Logo";

export const AUTHOR = "Muhammad Rafi Arsya";

/**
 * Footer: brand and one line, three short link columns, then a bottom bar
 * with the copyright, the author and the independence note.
 */
export function Footer() {
  const { t } = useI18n();
  const { user } = useSession();
  const f = t.footer;
  const year = new Date().getFullYear();

  const columns = [
    {
      title: f.product,
      links: [
        { to: "/requests", label: t.nav.requests },
        { to: "/runner", label: t.nav.runner },
        { to: "/#how", label: t.nav.how },
      ],
    },
    {
      title: f.account,
      links: user
        ? [
            { to: "/dashboard", label: t.nav.dashboard },
            { to: "/settings", label: t.nav.settings },
          ]
        : [
            { to: "/login", label: t.nav.signIn },
            { to: "/settings", label: t.nav.settings },
          ],
    },
    {
      title: f.help,
      links: [
        { to: "/#faq", label: t.nav.faq },
        { to: "/help", label: t.help.nav },
      ],
    },
  ];

  return (
    <footer className="mt-24 border-t border-border bg-surface pb-16 md:pb-0">
      <Container>
        <div className="grid gap-10 py-12 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] md:gap-16">
          <div className="max-w-xs">
            <Logo />
            <p className="t-meta mt-3 leading-relaxed">{f.tagline}</p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {columns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h2 className="text-[0.75rem] font-semibold tracking-wide text-muted-foreground uppercase">
                  {col.title}
                </h2>
                <ul className="mt-3 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="text-[0.875rem] font-medium text-foreground-secondary motion-interactive hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-6 pb-8 text-[0.8125rem] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-foreground-secondary">
            © {year} <span className="font-semibold text-foreground">UMOVE</span> · {f.rights}
          </p>
          <p className="text-foreground-secondary">
            {f.builtBy} <span className="font-semibold text-foreground">{AUTHOR}</span>
          </p>
        </div>
      </Container>
    </footer>
  );
}
