import { Link } from "react-router";
import { Container } from "../components/Container";
import { btn } from "../components/ui";
import { useI18n } from "../i18n";

export default function NotFound({ title, body }: { title?: string; body?: string }) {
  const { t } = useI18n();
  return (
    <Container className="max-w-xl py-20 text-center">
      <p className="font-display text-[3rem] leading-none font-bold text-muted-foreground">404</p>
      <h1 className="t-page-title mt-4">{title ?? t.notFound.title}</h1>
      <p className="t-body mt-2 text-muted-foreground">{body ?? t.notFound.body}</p>
      <Link to="/" className={`${btn.ink} mt-8`}>
        {t.notFound.home}
      </Link>
    </Container>
  );
}
