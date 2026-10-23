import { Info } from "lucide-react";

/**
 * An ⓘ next to a heading or figure, holding the explanation that used to be a
 * paragraph. The text is in the HTML for screen readers and crawlers.
 */
export function InfoTip({ text }: { text: string }) {
  return (
    <span title={text} className="inline-flex cursor-help align-middle text-fg-subtle hover:text-fg">
      <Info size={14} aria-hidden="true" />
      <span className="sr-only">{text}</span>
    </span>
  );
}
