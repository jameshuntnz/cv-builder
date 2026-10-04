import type { ReactElement } from "react";
import type { Contact, CV, Entry } from "../model";
import { HEADLINE_KEYS } from "../ops";
import type { BlockAttrs } from "./blocks";
import { typographic } from "../inline";
import { Inline, MaybeLink } from "./Inline";

const LINK_KEYS = ["Website", "Portfolio", "LinkedIn", "GitHub"];
const CONTACT_ORDER = [...LINK_KEYS, "Email", "Phone"];

function ContactItem({ c }: { readonly c: Contact }): ReactElement {
  if (c.key === "Email") return <MaybeLink target={`mailto:${c.value}`} text={c.value} />;
  if (c.key === "Phone")
    return <MaybeLink target={`tel:${c.value.replace(/\s/g, "")}`} text={c.value} />;
  return <MaybeLink target={c.value} text={c.value} />;
}

export function Header({
  cv,
  attrs,
}: {
  readonly cv: CV;
  readonly attrs: BlockAttrs;
}): ReactElement {
  const filled = cv.contact.filter((c) => c.value.trim() !== "");
  const headline = filled.find((c) => HEADLINE_KEYS.includes(c.key));
  const rest = filled.filter((c) => !HEADLINE_KEYS.includes(c.key));
  const location = rest.find((c) => c.key === "Location");
  const listed = rest
    .filter((c) => CONTACT_ORDER.includes(c.key))
    .sort((a, b) => CONTACT_ORDER.indexOf(a.key) - CONTACT_ORDER.indexOf(b.key));
  const other = rest.filter((c) => c.key !== "Location" && !CONTACT_ORDER.includes(c.key));
  const items = listed.map((c) => <ContactItem key={c.id} c={c} />);
  if (location && other.length === 0) {
    items.push(<span key={location.id}>{typographic(location.value)}</span>);
  }
  return (
    <header className="cv-header" {...attrs}>
      <h1 className="cv-name">{typographic(cv.name)}</h1>
      {headline && <p className="cv-headline">{typographic(headline.value)}</p>}
      {items.length > 0 && (
        // Each item stays whole; a long line breaks after a separator, never inside an item.
        <div className="cv-contact">
          <p className="cv-lines">
            {items.map((item, i) => (
              <span key={item.key}>
                {i > 0 && (
                  <>
                    <span className="sep">|</span>
                    <wbr />
                  </>
                )}
                <span className="cv-item">{item}</span>
              </span>
            ))}
          </p>
        </div>
      )}
      {other.map((c, i) => (
        <div className="cv-extra" key={c.id}>
          <p className="cv-lines">
            {typographic(i === 0 && location ? `${location.value} · ${c.value}` : c.value)}
          </p>
        </div>
      ))}
    </header>
  );
}

export function EntryHead({
  e,
  attrs,
}: {
  readonly e: Entry;
  readonly attrs: BlockAttrs;
}): ReactElement {
  const blurbLink = e.link !== "" && e.dates !== "";
  return (
    <div className="cv-entry" {...attrs}>
      <div className="cv-row">
        <span>
          <strong className="cv-org">
            <Inline text={e.name} />
          </strong>
          {e.location !== "" && `, ${typographic(e.location)}`}
        </span>
        <span className="cv-right">
          {e.dates !== "" ? typographic(e.dates) : <MaybeLink target={e.link} text={e.link} />}
        </span>
      </div>
      {(e.blurb !== "" || blurbLink) && (
        <div className="cv-blurb">
          <p className="cv-lines">
            <Inline text={e.blurb} />
            {e.blurb !== "" && blurbLink && " · "}
            {blurbLink && <MaybeLink target={e.link} text={e.link} />}
          </p>
        </div>
      )}
    </div>
  );
}
