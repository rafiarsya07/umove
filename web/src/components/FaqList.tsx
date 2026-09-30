import type { FaqItem } from "../i18n/faq";

/**
 * Questions as an accordion. With `anchors`, each item gets id="q-<id>" so
 * /faq#q-cost opens and scrolls to it; `open` lists the ids to start open.
 */
export function FaqList({ items, anchors, open }: { items: FaqItem[]; anchors?: boolean; open?: string | null }) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map(({ id, q, a }) => (
        <details key={id} id={anchors ? `q-${id}` : undefined} className="group scroll-mt-24" open={open === id}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[0.9375rem] font-semibold motion-interactive hover:text-foreground-secondary [&::-webkit-details-marker]:hidden">
            {q}
            <PlusGlyph />
          </summary>
          <p className="t-body max-w-2xl pb-5 text-foreground-secondary">{a}</p>
        </details>
      ))}
    </div>
  );
}

/** A plus that turns into a cross when the question is open. */
export function PlusGlyph() {
  return (
    <span aria-hidden="true" className="relative size-4 shrink-0 text-muted-foreground group-open:rotate-45">
      <span className="absolute top-1/2 left-0 h-px w-4 -translate-y-1/2 bg-current" />
      <span className="absolute top-0 left-1/2 h-4 w-px -translate-x-1/2 bg-current" />
    </span>
  );
}
