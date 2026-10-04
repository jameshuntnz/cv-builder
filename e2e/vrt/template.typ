// The reference CV template for the visual regression test (e2e/vrt). It is the Typst
// original the builder's paper is matched against: Charter, all black, bold section headings
// over a rule, bold company and italic title, 10pt body. scripts/to-typst.ts writes documents
// that call the functions below.

#let body-font = ("Charter", "Georgia", "Times New Roman")
#let body-size = 10pt          // LaTeX \small at 11pt base
#let name-size = 17pt          // larger than LaTeX's \Large
#let heading-size = 12pt       // \large
#let headline-size = 13pt      // the headline under the name
#let paper = "a4"              // "us-letter" for US applications
#let margin = 1.27cm           // 0.5in, as in the LaTeX original
#let ink = rgb("#1a1a1a")
#let muted = ink
#let rule = ink

// compact: tighter margins and vertical spacing, same type size.
#let cv(name: "", contact: (), compact: false, body) = {
  set document(title: name + " – CV", author: name)
  set page(
    paper: paper,
    margin: if compact { 1.05cm } else { margin },
    // Name + page number on continuation pages only; nothing an ATS needs lives here.
    footer: context if counter(page).get().first() > 1 {
      set text(size: 8pt, fill: muted)
      grid(columns: (1fr, auto), name, [Page #counter(page).display() of #counter(page).final().first()])
    },
  )
  set text(font: body-font, size: body-size, fill: ink)
  set par(justify: false, leading: if compact { 0.38em } else { 0.42em }, spacing: if compact { 0.45em } else { 0.5em })
  set list(indent: 0.9em, body-indent: 0.5em, spacing: if compact { 0.42em } else { 0.62em }, marker: [•])

  // Section headings: bold with a rule underneath (Charter has no small caps).
  // Typst adds its own heading spacing; set it explicitly instead of stacking v() on top.
  show heading.where(level: 1): set block(above: if compact { 0.85em } else { 1.1em }, below: if compact { 0.35em } else { 0.45em })
  show heading.where(level: 1): it => block(
    width: 100%,
    stroke: (bottom: 0.5pt + rule),
    inset: (bottom: 0.3em),
    text(size: heading-size, weight: "bold", it.body),
  )

  // Header: name + headline on the left, contact on the right (the LaTeX tabular* layout).
  let headline = contact.filter(((k, v)) => k in ("Title", "Headline"))
  let rest = contact.filter(((k, v)) => k not in ("Title", "Headline"))
  // Links are real PDF link annotations; the underline is only so readers know to click.
  let ul = (it) => underline(stroke: 0.3pt + ink, offset: 2pt, it)
  let render = ((k, v)) => {
    if k == "Email" { ul(link("mailto:" + v, v)) }
    else if k == "Phone" { link("tel:" + v.replace(" ", ""), v) }
    else if k in ("LinkedIn", "GitHub", "Website", "Portfolio") { ul(link("https://" + v.replace("https://", ""), v)) }
    else { v }
  }
  let identity = rest.filter(((k, v)) => k in ("Email", "Phone"))
  let links = rest.filter(((k, v)) => k in ("LinkedIn", "GitHub", "Website", "Portfolio"))
  let location = rest.filter(((k, v)) => k == "Location")
  let other = rest.filter(((k, v)) => k not in ("Email", "Phone", "LinkedIn", "GitHub", "Website", "Portfolio", "Location"))
  let sep = [#h(0.45em)|#h(0.45em)]
  let loc = if location.len() > 0 { location.at(0).at(1) } else { none }
  block(spacing: 0pt)[
    #set par(leading: 0.75em)
    #text(size: name-size, weight: "bold", name) \
    // Headline on its own line. Location moves to the first extra line, or to the contact line
    // when there is none.
    #if headline.len() > 0 [#text(size: headline-size, headline.at(0).at(1)) \ ]
    #let order = ("Website", "Portfolio", "LinkedIn", "GitHub", "Email", "Phone")
    #let contact-items = (links + identity).sorted(key: ((k, v)) => order.position(x => x == k)).map(x => box(render(x)))
    #if loc != none and other.len() == 0 { contact-items.push(box(loc)) }
    #text(size: body-size - 0.5pt, contact-items.join(sep))
  ]
  for (i, (k, val)) in other.enumerate() {
    v(0.35em)
    if i == 0 and loc != none { text(style: "italic", loc + " · " + val) } else { text(style: "italic", val) }
  }
  v(0.3em)

  body
}

// Employer / project / degree: bold name left, dates (or link) right; optional italic blurb.
#let entry(name: [], location: [], dates: [], link: "", blurb: []) = {
  v(0.45em)
  grid(
    columns: (1fr, auto),
    align: (left, right),
    [#text(weight: "bold", size: body-size + 1pt)[#name]#if location != [] [, #location]],
    if dates != [] { dates } else if link != "" { underline(stroke: 0.3pt + ink, offset: 2pt, std.link("https://" + link.replace("https://", ""), link)) },
  )
  if blurb != [] or (link != "" and dates != []) {
    v(0.1em)
    text(style: "italic", size: 9.5pt)[
      #blurb#if link != "" and dates != [] [#if blurb != [] [ · ]#std.link("https://" + link.replace("https://", ""), link)]
    ]
  }
}

// Job title within an entry: italic title left, italic dates right. `tight` closes the gap when this
// title is stacked directly under an earlier title with no bullets of its own (promotions sharing one
// set of bullets), so the stack reads as one block.
#let role(title, dates, tight: false) = {
  v(if tight { 0.02em } else { 0.35em })
  grid(
    columns: (1fr, auto),
    align: (left, right),
    text(style: "italic", title),
    text(style: "italic", dates),
  )
}

#let bullets(..items) = {
  v(0.05em)
  list(..items.pos())
}

// Skills-style "Category: a, b, c" rows as run-in paragraphs ("**Languages:** Java, …").
// Any aligned label column, even one paragraph per row, makes PDF text extractors read
// all labels before any value — which is what an ATS then indexes. Run-in labels don't.
#let kvlist(..pairs) = {
  for (k, v) in pairs.pos() {
    par(spacing: 0.45em)[#text(weight: "bold")[#k:] #v]
  }
}
