import type { ReactElement } from "react";
import { safeHref, segments, typographic } from "../inline";

/** Inline markdown rendered for the paper. Links that aren't web, mail or phone become text. */
export function Inline({ text }: { readonly text: string }): ReactElement {
  return (
    <>
      {segments(text).map((s, i) => {
        if (s.href !== undefined) {
          const href = safeHref(s.href);
          const text = typographic(s.text);
          return href === undefined ? text : <ExternalLink key={i} href={href} text={text} />;
        }
        if (s.code) return <code key={i}>{s.text}</code>;
        const text = typographic(s.text);
        if (s.bold && s.italic)
          return (
            <strong key={i}>
              <em>{text}</em>
            </strong>
          );
        if (s.bold) return <strong key={i}>{text}</strong>;
        if (s.italic) return <em key={i}>{text}</em>;
        return text;
      })}
    </>
  );
}

export function ExternalLink({
  href,
  text,
}: {
  readonly href: string;
  readonly text: string;
}): ReactElement {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {text}
    </a>
  );
}

/** A link from a bare value such as "github.com/you", or plain text if it isn't one. */
export function MaybeLink({
  target,
  text,
}: {
  readonly target: string;
  readonly text: string;
}): ReactElement {
  const href = safeHref(target);
  return href === undefined ? <>{text}</> : <ExternalLink href={href} text={text} />;
}
