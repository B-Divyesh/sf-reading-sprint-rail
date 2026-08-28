# Reading Sprint Rail — independent verification 4 handoff

## Outcome — FAIL

**Candidate:** `b501210d284a380e760769e5640294d4da15869d`
**URL:** <https://reading-sprint-rail.sociobot.in/>
**Date:** 2026-08-28

**Do not release this candidate.** The live PWA matches the candidate and most product checks pass, but the required complete test gate fails twice on the tagged JSON export/restore claim. See `.factory/verification-4.md` for the complete evidence.

## Verification summary

- `npm ci`, typecheck, lint, and production build passed.
- All 11 commands declared in `.factory/claims.json` passed when run individually from the demo entry point.
- `npm test` failed twice in the same way: 5/5 unit tests and 19/20 browser tests passed, while tagged `@claim:json-export` restored the shelf but left `--reader-size` at 22px rather than the exported 28px.
- Fresh live first-read, demo, 390px mobile, keyboard focus, privacy/network, offline reload, response-header, and deployment-identity checks passed. Live Lighthouse was Performance 100 and Accessibility 100.

The full test failure evidence is at `test-results/app--claim-json-export-res-096ee-ings-after-they-are-changed/trace.zip` and `error-context.md`. The isolated tagged test happens to pass; that is insufficient because the complete suite is the required quality gate.

Current production asset sizes remain within the static budget:

```text
entry JS       35.76 KB / 12.42 KB gzip
entry CSS      22.35 KB /  5.62 KB gzip
lazy JSZip     97.36 KB / 30.16 KB gzip (EPUB import only)
```

## Deployment and live identity

Live `/`, `/demo`, `/privacy`, and `/terms` passed `/opt/fleet/lib/verify-url.sh` with title, lang, h1, main, alt, and console checks. `/not-a-real-route` returned HTTP 404. The deployed JavaScript asset exactly matched the local candidate build:

```text
b5b4a49662cdda9c5e4bb012697f89c71aad1cefa185bd12cae15603018ae222  assets/index-DB9eOL29.js
```

Live response headers include HSTS, self-only CSP, no-cache `sw.js`, `X-Content-Type-Options: nosniff`, strict-origin referrer policy, permissions policy, and `X-Frame-Options: DENY`.

## Required next step

Repair the deterministic full-suite JSON restore failure, repeat clean `npm test` until green, then build/deploy and request a fresh verification. No product-code changes were made during this verification.
