#import "../template.typ": *

#show: cv.with(
  name: "Morgan Tate",
  contact: (("Title", "Product Engineer"), ("Location", "Dunedin, NZ"), ("Email", "morgan.tate@example.com"), ("Phone", "+64 21 555 0199"), ("LinkedIn", "linkedin.com/in/example-person"), ("GitHub", "github.com/example-person"), ("Website", "example-person.dev"),),
)

= Experience


#block(breakable: false)[
#entry(
  name: [Harbour Lights Ltd],
  location: [Dunedin, NZ],
  dates: [Mar 2022 – Present],
  link: "",
  blurb: [Shipping logistics software for ports and their customers, from berth booking to the gate, used across four regional ports.],
)
#role([Lead Engineer], [Jan 2025 – Present])
#bullets(
  [Moved berth booking to a queue.],
)
]

#bullets(
  [Rewrote the gate scheduling service so trucks book a slot ahead and wait times fell across every port that uses it.],
  [Ran the weekly design review.],
  [Added load tests to the release checks.],
  [Replaced the nightly export with a live feed the customs team reads directly, ending a manual reconciliation each morning.],
  [Wrote the on-call guide.],
)

#role([Engineer], [Mar 2022 – Dec 2024])

#bullets(
  [Built the customer portal for container tracking.],
)

#role([Junior Engineer], [Mar 2021 – Feb 2022])

#block(breakable: false)[
#entry(
  name: [Lantern Street Bakery],
  location: [Dunedin, NZ],
  dates: [Jan 2018 – Feb 2021],
  link: "",
  blurb: [Family bakery with three shops and a wholesale round to cafés across the city.],
)
#role([Developer], [Jan 2018 – Feb 2021])
#bullets(
  [Built the ordering site cafés use to place their wholesale orders each evening for the next morning’s delivery round.],
)
]

#bullets(
  [Moved the shops’ till exports into one nightly report.],
  [Wrote the route planner the drivers use, which orders stops by opening time and keeps hot bread on the van for the shortest time.],
  [Set up backups for the order database.],
  [Replaced paper stock sheets with a tablet form the bakers fill in at the end of each shift, so the morning team sees what “sold out” means before opening.],
  [Trained two new starters on the ordering system.],
)

#block(breakable: false)[
#entry(
  name: [Tidewater Games],
  location: [],
  dates: [],
  link: "tidewater.example",
  blurb: [Small studio making ocean-themed puzzle games for phones and tablets, with a long-running daily puzzle and a weekly challenge mode.],
)
#bullets(
  [Wrote the level editor the designers used for three released games and a dozen seasonal events over two years.],
)
]

#bullets(
  [Fixed dropped frames on older phones.],
)

= Skills

#kvlist(
  ([Languages], [TypeScript, Go, SQL]),
  ([Platforms], [PostgreSQL, Kafka, AWS, Docker, Kubernetes, Terraform, GitHub Actions, Grafana, Prometheus, OpenTelemetry, Redis]),
)


= Summary

Builds calm, reliable software for operations teams who work through the night and need things to just work when they arrive.

Short line.


= Education

#bullets(
  [BSc Computer Science, Example University, 2020],
  [Certificate in Data Analytics (part-time), Southern Institute, 2023],
)

= Interests

Sea kayaking, restoring old bicycles, and the city's \"Pancake Tuesday\" fun run.


