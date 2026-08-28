# Independent verification 4 — FAIL

**Candidate:** `b501210d284a380e760769e5640294d4da15869d` (`b501210`)
**Verified URL:** <https://reading-sprint-rail.sociobot.in/>
**Date:** 2026-08-28
**Verdict:** **FAIL — do not release.**

The deployed static PWA matches this candidate byte-for-byte and the product is clear, private, accessible, and usable in normal flows. It cannot pass release because the complete required test suite fails consistently on the tagged JSON restore claim.

## Mandatory first checks

### Claims manifest and demo-path commands

`.factory/claims.json` exists and declares eleven demo-path claims. After `npm ci` in this clean checkout, every exact command declared by the manifest was run separately against Playwright's production-preview entry point. All passed:

| Claim | Result |
| --- | --- |
| `sample-demo` | PASS — one test |
| `demo-isolation` | PASS — one test |
| `local-reading-data` | PASS — one test |
| `offline-reading` | PASS — one test |
| `json-export` | PASS — one test |
| `epub-local-extraction` | PASS — one test |
| `keyboard-controls` | PASS — one test |
| `shelf-resume` | PASS — one test |
| `pwa-install` | PASS — one test |
| `reading-preferences` | PASS — one test |
| `location-notes` | PASS — one test |

That isolated result does not make the candidate releasable: the same tagged `@claim:json-export` test fails in the ordinary full suite order (details below), twice in this verification.

### Cold first read — PASS

A new live browser context showed the plain first screen:

> **Finish reading without losing your place.** For ADHD and dyslexic readers: read one adjustable paragraph at a time, keep a note beside it, and return to the exact stop.

It plainly says what it does, names whom it is for, and presents **Try it with sample data** with the adjacent outcome **“Opens a three-stop reading rail right away.”** The one-click action opened `/demo` directly into the realistic three-stop rail. The persistent banner reads **“Demo — sample data, nothing is saved”** and includes **Reset demo** and **Start for real**.

## Release-blocking finding

### High — `npm test` deterministically fails the JSON export/restore claim in suite order

Two fresh serial executions of `npm test` produced the same result: 5/5 Vitest tests passed and 19/20 Playwright tests passed, but `tests/e2e/app.spec.ts:99` (`@claim:json-export`) failed.

After the import confirmation and the observable **“Shelf restored from export.”** toast, the test waits five seconds for the restored preference. It receives `--reader-size: 22px`, not the exported `28px`:

```text
Expected: "28px"
Received: "22px"
at tests/e2e/app.spec.ts:132
```

The focused command happens to pass, but full-suite failures were repeated twice. This violates both the factory quality gate (`npm test` must pass) and the claims contract (a tagged claim cannot be accepted when its normal suite execution fails). It is also an observable core-data failure risk: export/restore promises preferences as well as documents, notes, and position.

Evidence from the latest failed run is retained at:

- `test-results/app--claim-json-export-res-096ee-ings-after-they-are-changed/error-context.md`
- `test-results/app--claim-json-export-res-096ee-ings-after-they-are-changed/trace.zip`

Required repair: find the order/state dependency in export/import settings restoration, add or retain a deterministic regression, and show repeated green full `npm test` runs before re-verification.

## Local gates and product QA

| Check | Result / evidence |
| --- | --- |
| Locked install | `npm ci` PASS — 73 packages, 0 vulnerabilities |
| Type check and lint | `npm run typecheck` PASS; `npm run lint` PASS |
| Production build | `npm run build` PASS; `dist/` produced |
| Full tests | **FAIL twice** — 5 unit tests passed; 19/20 E2E passed; JSON restore claim failed as above |
| Build budget | entry JS 35.76 KB / 12.42 KB gzip; CSS 22.35 KB / 5.62 KB gzip; lazy JSZip 97.36 KB / 30.16 KB gzip. Initial JS is well below 200 KB. |
| Live Lighthouse 12.2.1 | mobile Performance 100, Accessibility 100; LCP 1.2 s, TBT 90 ms, CLS 0, total transfer 67 KiB |

The passing browser coverage exercised representative pasted text, three-stop navigation, saved local notes, shelf resume, arrow keys and `N`, settings, valid EPUB extraction, malformed EPUB recovery, empty-text recovery, invalid JSON recovery, corrupted-storage recovery, 390 px layout, light/dark axe checks, offline reload, and PWA manifest/service-worker activation. The attached suite’s axe scans found no serious or critical issues.

Independent live mobile QA at 390×844 found no horizontal overflow, a visible 3 px focus outline on the keyboard-reached skip link, no console/page errors, no cross-origin requests, and no serious/critical axe findings. A live offline reload after service-worker activation showed **“Offline — your reading and notes still work.”**

Service-worker update implementation was also checked in source: versioned shell/runtime caches, `skipWaiting`, `clients.claim`, `updateViaCache: 'none'`, and an `updatefound` handler that announces **“An update is ready. Reload to use it.”** are present. A synthetic remote worker revision was not served during this verification; the live offline/activation behavior was directly exercised.

## Accessibility, privacy, and response policy

`/opt/fleet/lib/verify-url.sh` passed against live `/`, `/demo`, `/privacy`, and `/terms`. Each was HTTP 200, had its route-appropriate title, `lang="en"`, exactly one h1, a main landmark, no missing image alt text, no unlabeled buttons, and no console/page errors. Evidence: `/tmp/rsr-verify.PURuCi/`.

The live cold and demo flows requested only same-origin GET resources (document, hashed JS/CSS, self-hosted fonts, and product image). No account fields, analytics, third-party scripts, upload requests, API client, sign-in, or billing code is present. Data remains in local IndexedDB/localStorage under real and `demo:` namespaces. This is a static PWA with no server-side product endpoint, so burst rate-limit/`Retry-After` and Entra tenant checks are not applicable.

Live headers include a self-only CSP, HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, restrictive Permissions-Policy, and `X-Frame-Options: DENY`. Hashed JS/CSS/fonts use one-year immutable caching; `sw.js` is `no-cache`; the manifest has a one-day cache policy. `/not-a-real-route` returns the intended HTTP 404.

## Deployment identity

The live output matches the locally built candidate exactly:

```text
4dcc885ea602cff2a0ed5c9ece892b0dd90faefb9ccea3dbd22003f11a379df3  index.html
b5b4a49662cdda9c5e4bb012697f89c71aad1cefa185bd12cae15603018ae222  assets/index-DB9eOL29.js
52135ebdecdf26216523de7ec2b9269ddfbeb4e83677c8da2254f979c8d11ea0  assets/index-CaPeYANC.css
1d45bb7314ffe96b181c7fe05bbbab691c2b93cd69baf9a19fdb87027e9a4eb0  sw.js
```

The build footer identifies version 1.0.1, matching `package.json`.

## Required before re-verification

1. Repair the JSON import/export preference restoration or the state/order defect causing `@claim:json-export` to retain 22 px.
2. Run the entire clean `npm test` suite repeatedly, not only the isolated grep command, until it is reliably green.
3. Build and redeploy, then repeat claim, offline, and live identity checks.
