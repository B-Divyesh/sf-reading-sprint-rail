# Independent verification 3 — FAIL

**Candidate:** `1e10f58721565880d62a225ba571a5e44a1fe61e` (`1e10f58`)  
**Verified URL:** <https://reading-sprint-rail.sociobot.in/>  
**Date:** 2026-08-28  
**Verdict:** **FAIL — do not release.**

The deployed static PWA is byte-identical to this candidate and its normal product flow is good. Release is blocked by a flaky tagged claim test and by published README claims that are not listed in the required claims manifest. The claims contract makes either condition a failure.

## Mandatory first checks

### Claims manifest and demo-path tests

`.factory/claims.json` exists and declares nine demo-path claims. After `npm ci` from this clean candidate, each declared command was run separately against the repository's Playwright production-preview entry point; each passed once:

| Claim | Declared command | Independent result |
| --- | --- | --- |
| `sample-demo` | `npm run test:e2e -- --grep @claim:sample-demo` | PASS — 1 test |
| `demo-isolation` | `npm run test:e2e -- --grep @claim:demo-isolation` | PASS — 1 test |
| `local-reading-data` | `npm run test:e2e -- --grep @claim:local-reading-data` | PASS — 1 test |
| `offline-reading` | `npm run test:e2e -- --grep @claim:offline-reading` | PASS — 1 test |
| `json-export` | `npm run test:e2e -- --grep @claim:json-export` | PASS — 1 test (13.2 s) |
| `epub-local-extraction` | `npm run test:e2e -- --grep @claim:epub-local-extraction` | PASS — 1 test |
| `keyboard-controls` | `npm run test:e2e -- --grep @claim:keyboard-controls` | PASS — 1 test |
| `reading-preferences` | `npm run test:e2e -- --grep @claim:reading-preferences` | PASS — 1 test |
| `location-notes` | `npm run test:e2e -- --grep @claim:location-notes` | PASS — 1 test |

That is not reliable enough to accept: two consecutive aggregate executions of `npm run test:e2e -- --grep @claim` failed the same tagged `@claim:json-export` test. Both timed out at `tests/e2e/app.spec.ts:127` waiting for **“Shelf restored from export.”** after its JSON file input was set. A focused rerun passed, and a later full `npm test` passed, so this is an order/timing flake rather than a confirmed product-data loss. It is nevertheless a failing claim test from this candidate and therefore release-blocking.

### Cold first read — PASS

A fresh live desktop visit plainly says **“Finish reading without losing your place.”** It names “ADHD and dyslexic readers,” says it shows one adjustable paragraph with a note beside it and returns to the exact stop, and presents **Try it with sample data** with the adjacent explanation **“Opens a three-stop reading rail right away.”** One click opens `/demo`, immediately showing the three-stop sample and the persistent **“Demo — sample data, nothing is saved”** banner with Reset demo and Start for real.

## Release-blocking findings

### High — JSON export/restore claim test is flaky in the normal claim-suite order

The exact `@claim:json-export` test passed alone, but failed twice when all claims were run together in their normal file order. It reaches the Shelf with the expected one document at Stop 2 of 3 and one note, then does not receive the expected restore toast within five seconds after `#import-data.setInputFiles(...)`. The focused command then passes, and the final full suite passes. A visitor cannot rely on a claim whose required observable-proof test intermittently fails.

Required repair: make the import/confirmation test deterministic and investigate the ordering dependency. Keep a full claim-suite run green repeatedly, not merely the isolated grep.

### High — README contains visitor-facing claims absent from `.factory/claims.json`

The claims skill requires every visitor-reliant statement in the live copy or README to be declared and proved by a tagged demo-path test. These README statements have no matching manifest claim:

- “Resume the last paragraph from a local document shelf.”
- “Install as a PWA …”
- “Keep documents in a local shelf until browser storage is full.”

The existing keyboard claim's test incidentally exercises a reload/shelf, but its declared claim only promises arrow navigation and `N` focus. No manifest entry promises, names, and proves resume. The PWA manifest and service worker were manually verified, but that is not a tagged claims-manifest test. The storage-full statement is an unbounded promise and should be removed or qualified rather than claimed.

Required repair: add one manifest entry and one `@claim:<id>` test for each retained claim (including observable resume and installability/manifest criteria), or remove/qualify the sentences.

## What passed

### Clean local gates

```text
npm ci             PASS — 73 packages, 0 vulnerabilities
npm test           PASS on final clean run — 4 Vitest + 18 Playwright tests
npm run typecheck  PASS
npm run lint       PASS
npm run build      PASS — dist/ produced
```

Production build sizes are within the static-PWA budgets: entry JS 35.44 KB (12.30 KB gzip), CSS 22.35 KB (5.62 KB gzip), self-hosted fonts 34.73 KB total, and the lazy EPUB JSZip chunk 97.36 KB (30.16 KB gzip).

### Functional, accessibility, and responsive checks

- Paste, the representative three-stop rail, arrow navigation, `N` note focus, location notes, delete confirmation, saved-position reload, settings, word cue, micro-breaks, valid EPUB, malformed EPUB, over-limit EPUB, invalid JSON import, and corrupted-storage recovery are covered by the browser suite. Empty text produces the clear “Paste at least one paragraph to begin” recovery message.
- The factory `verify-url.sh` passed local and live `/`, `/demo`, `/privacy`, and `/terms`: each has a title, `lang=en`, one h1, a main landmark, image alt text, labeled buttons, and no console/page errors.
- Fresh live 390 px axe scans of `/`, `/demo`, `/privacy`, `/terms`, and the designed 404 had zero serious or critical violations and no horizontal overflow. The expected HTTP 404 navigation itself is logged by Chromium as a failed resource; normal routes have no console/page errors.
- The suite checks file-input proxy focus, 44 px mobile targets, dialog focus/Escape, route focus/announcement, keyboard controls, light/dark accessibility, and reduced-motion settings. The product has a skip link, route-specific titles/canonicals/social metadata, and a designed 404.

### PWA, privacy, and host policy

- On the live deployment, after activation, a fresh `/demo` reloaded while the browser context was offline and showed both **Offline — your reading and notes still work** and **Stop 1 of 3**.
- A controlled local update simulation served the same built application with only the worker cache version changed. The active `rsr-shell-v3` worker updated to `rsr-shell-v4`, deleted the old cache, and displayed **“An update is ready. Reload to use it.”**
- The manifest is valid (`standalone`, versioned installed `start_url`, 192/512/maskable icons). The worker is `no-cache`; hashed JS/CSS are `max-age=31536000, immutable`.
- The privacy claim test observes only same-origin GET/HEAD requests while creating a demo note, with no account fields. Source review found no API client, analytics, authentication, billing, or third-party runtime script. This static PWA exposes no server-side product endpoint, so API burst/rate-limit and Entra checks are not applicable.
- Live headers include CSP restricted to `self`, HSTS, `X-Content-Type-Options: nosniff`, strict-origin referrer policy, Permissions-Policy, and `X-Frame-Options: DENY`. `/`, `/demo`, `/privacy`, and `/terms` return 200; the designed unknown route returns HTTP 404.

### Deployment identity and performance

Live and local production files match byte for byte:

```text
f0e371d8fe02c4c0ea6aa05b2f072e8a65a335e8de982854b572166f3f528345  index.html
f5bc5572c05e069b419946628b2b695fa837c5fa6a9c56135410c8997bfe033f  assets/index-DPh0akD9.js
52135ebdecdf26216523de7ec2b9269ddfbeb4e83677c8da2254f979c8d11ea0  assets/index-CaPeYANC.css
```

Live mobile Lighthouse 12.8.2 on `/demo`: Performance 94, Accessibility 100, Best Practices 100, SEO 100; FCP 1.1 s, LCP 1.2 s, TBT 290 ms, CLS 0. This meets the stated Lighthouse-category gates; the one-run TBT is noted for follow-up but is not a categorical failure.

## Evidence

Worker-local evidence includes `/tmp/rsr-live-cold.png`, `/tmp/rsr-live-headers.txt`, `/tmp/rsr-lighthouse-live.json`, `/tmp/rsr-verify-url/`, and `/tmp/rsr-live-verify/`. The two failing aggregate claim runs reported the same Playwright assertion at `tests/e2e/app.spec.ts:127`; the subsequent focused and full-suite reruns are recorded above.

## Required before re-verification

1. Fix and repeat the aggregate claim suite until JSON restore proof is stable.
2. Bring README claims into `.factory/claims.json` with exactly one tagged demo-path proof each, or remove/qualify them.
3. Rerun all declared commands, `npm test`, build, and deployed verification after the repair.
