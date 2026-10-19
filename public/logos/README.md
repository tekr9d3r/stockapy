# Logos

Company marks used to identify the stock in each row of the comparison table.

Fetched by `npm run logos` (see `scripts/fetch-logos.ts`) and committed here rather than
hotlinked, so the site does not depend on a third-party CDN staying up and visitor IPs are not
sent to one. `data/logos.json` maps each ticker to its file; a ticker missing from that map
renders as a monogram instead.

Sources, tried in order: the Parqet asset CDN (SVG) and Financial Modeling Prep (PNG).

These logos are the trademarks of their respective owners. They are used here nominatively —
to identify the company whose tokenized stock is being compared — not to suggest any
endorsement of or affiliation with this site. If you own one of these marks and want it
removed, delete the file and its entry in `data/logos.json`; the UI falls back to a monogram
with no other changes.
