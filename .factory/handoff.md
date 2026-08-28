# Reading Sprint Rail — repair handoff

## Release repair

Repair commit: `fix: repair release QA findings` on 2026-08-28. This repair resolves every release-blocking finding in independent verification 2 for candidate `946c9618d3f771ff3dcc98d7cf049a79547f8585`.

- Import data is now fully parsed and structurally validated before the replacement confirmation or any IndexedDB write. A malformed document, note, setting, position, or export shape is rejected atomically.
- Startup validates stored documents and removes malformed records before rendering. The shelf remains usable and reports the recovery rather than blanking the app.
- EPUB and JSON file inputs keep native keyboard access while their visible labels receive the designed 3 px focus ring. All reported 390 px controls now have 44 × 44 px targets, including demo actions, shelf back, footer, and legal-header links.
- SPA navigation, Back, and the skip link move focus correctly; route changes focus the new h1 and announce the route title.
- `/`, `/demo`, `/privacy`, and `/terms` set their own canonical URL and description at runtime. Open Graph/Twitter metadata and an original 1200 × 630 social card are present. Footer build ID is `1.0.1`.
- Claims now cover local/no-account behavior, EPUB import, keyboard controls, saved preferences, and location-linked notes. The JSON export claim now mutates the shelf/settings before asserting a full restore. The unbounded document-count promise was qualified.

## Regression coverage

- Unit schema coverage rejects `paragraphs: null`, invalid settings, and out-of-range positions in `tests/unit/text.test.ts`.
- Browser coverage reproduces malformed import rejection, raw IndexedDB corruption recovery, proxy file-input focus, 390 px target sizes, route/back focus and announcements, social metadata, and true export restoration.
- Every claim has exactly one tagged Playwright test. From a clean `npm ci`, all nine commands listed in `.factory/claims.json` passed separately: `sample-demo`, `demo-isolation`, `local-reading-data`, `offline-reading`, `json-export`, `epub-local-extraction`, `keyboard-controls`, `reading-preferences`, and `location-notes`.

## Verification evidence

```text
npm ci                 PASS — 73 packages, 0 vulnerabilities
npm run typecheck      PASS
npm run lint           PASS
npm test               PASS — 4 Vitest + 18 Playwright tests
npm run build          PASS — dist/index.html produced
```

Production build sizes:

```text
entry JS     35.44 KB / 12.30 KB gzip
entry CSS    22.35 KB /  5.62 KB gzip
lazy JSZip   97.36 KB / 30.16 KB gzip (EPUB import only)
fonts        34.73 KB total
mobile hero  11.81 KB WebP
```

`verify-url.sh` against the built preview passed for `/` and `/demo`: HTTP 200, title, `lang=en`, one h1, main landmark, zero missing image alt attributes, zero unlabeled buttons, and zero console/page errors. Evidence is in `/work/reading-sprint-rail-repair-verify-BRFtrZ/`.

Playwright axe on `/`, `/demo`, `/privacy`, and `/terms` at 390 px reported zero serious/critical violations. The standalone `@axe-core/cli` was attempted but cannot launch this container's Playwright-only Chromium; the project’s Playwright axe integration was used instead. Browser tests cover desktop and 390 px, keyboard movement and note focus, offline reload, storage isolation, and service-worker shell use. The worker/update implementation is unchanged from the independently verified candidate.

The static deployment contract remains `npm ci && npm test && npm run build`, publishing `dist/`. `staticwebapp.config.json` continues to provide the existing CSP, permissions/referrer/frame/content-type headers, asset cache policy, route rewrites, and designed 404 response.

## Deployment and known gaps

Commit `d2f13ab04aff58e2120394a850635895f115ccee` was pushed to `origin/main`. The configured static release command completed locally and produced `dist/`. A live identity/header check immediately after push still served the prior `index-Bed8ETlT.js` deployment at 11:54 UTC, so the host’s static synchronization had not completed within the worker window. Its current response policy remains present (HSTS, CSP, permissions, referrer, frame, and content-type headers). No product gaps are known.

Lighthouse CLI was attempted with the installed Playwright Chromium but could not attach to it in this container; bundle budgets and all functional/accessibility checks pass. Verify live identity after the static host completes its normal push-triggered synchronization.
