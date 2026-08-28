# Reading Sprint Rail — repair handoff

## Release repair complete

Repair commit: `76ce92a fix: add isolated demo and release QA repairs`.

- Added `/demo` and the first-screen **Try it with sample data** action. It opens a realistic three-stop reading sample immediately, includes a location-linked sample note, and has a persistent **Demo — sample data, nothing is saved** banner with Reset demo and Start for real controls.
- Demo data is stored only in IndexedDB `demo:reading-sprint-rail`; demo preferences use `demo:` local-storage keys. Start for real clears the demo namespace before opening the real reader.
- Added `.factory/claims.json`, `.factory/demo.md`, and five independently runnable demo-path claim tests: sample reader, isolation, local-only requests, offline reload, and JSON export/restore.
- Rewrote the landing headline and action in plain language for ADHD and dyslexic readers. `.factory/copy-audit.md` records the landing-copy check.
- Removed the unavailable ₹499 Rail Pass offer, its dead checkout link, its three-document limit, and its unused billing client. The shelf is now fully local and unlimited.
- Corrected contrast: dark primary buttons use dark ink on coral, and the failing paid-shelf label no longer exists. Axe serious/critical checks pass for home, reader, and forced dark reader.
- Replaced JSZip’s raw invalid-file message with: “This file is not a readable EPUB. Choose a standard .epub file and try again.”
- Added static-host policy in `public/staticwebapp.config.json`: CSP, `X-Frame-Options: DENY`, Permissions-Policy, immutable `/assets/*` cache, manifest MIME mapping, explicit SPA routes, and a designed HTTP 404 page.

## Verification

Run from a clean clone:

```bash
npm ci
npm test
npm run lint
npm run build
```

Executed on 2026-08-28:

- `npm ci`: passed, 73 packages installed, 0 vulnerabilities.
- `npm test`: passed — 3 Vitest tests and 14 Playwright tests. The suite covers desktop workflow, 390 px layout, keyboard movement, notes and resume, settings, valid and invalid EPUB handling, JSON export/import, dark and light axe checks, real 404 UI, demo isolation, and offline reload.
- Every command in `.factory/claims.json` passed. The five tagged claim tests were also run independently from the demo path.
- `npm run lint` (`tsc --noEmit`) and `npm run build` passed. `dist/index.html` is at the deployment root. Initial JS is 32.33 KB (11.36 KB gzip), CSS is 21.94 KB (5.57 KB gzip); the lazy EPUB chunk is 97.36 KB.
- Local and live `verify-url.sh` checks passed for `/demo`: title, `lang`, one h1, main landmark, image alt text, labeled buttons, desktop and 390 px screenshots, and zero console/page errors. Evidence is in `/work/evidence/reading-sprint-rail-repair-2-live/`.
- Playwright axe integration found no serious or critical issues in the home, reader, or dark reader. The standalone axe CLI could not locate Chrome in this container; the required equivalent Playwright axe checks passed.
- Live PWA check: after service-worker activation at `/demo`, an offline reload showed the offline banner and seeded Stop 1 of 3 with zero console errors.
- Live Lighthouse performance run on `/demo`: Performance 98; FCP 2.0 s, LCP 2.0 s, TBT 0 ms, CLS 0. Full Lighthouse rerun was unstable in this container; automated axe coverage supplied the accessibility gate.

## Deployment and live identity

- Static deployment completed to Azure Static Web App `sf-reading-sprint-rail` in Central US: <https://red-wave-0518e0410.7.azurestaticapps.net>
- Production custom domain is live: <https://reading-sprint-rail.sociobot.in/demo>
- The live `index.html` SHA-256 is `ed074d2cf7f9c561626d3adda0b9bfd43b6d76215931648c3b44861ccf251727`, exactly matching `dist/index.html`. The live app JS SHA-256 is `66b2526a984353f6bcef350df31fcb953b6d61ceb8c6925d1ad559ad710a2ea5`, exactly matching `dist/assets/index-Bed8ETlT.js`.
- Live `/`, `/demo`, `/privacy`, and `/terms` return 200. An unknown route returns the designed 404 page with HTTP 404. Live headers include CSP, Permissions-Policy, `X-Frame-Options: DENY`, and immutable cache control for hashed assets. `/manifest.webmanifest` returns `application/manifest+json`.

## Known limits

- EPUB import intentionally supports standard non-DRM spine text. It does not preserve publisher styling, complex tables, or encrypted books.
- Sprint countdown state is session-only; documents, positions, notes, and preferences persist locally.
- There is currently no paid tier. The former checkout was removed because its Sociobot product endpoint returned 404; do not restore a purchase offer until the factory registers a working billing product and return URL.
