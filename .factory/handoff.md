# Reading Sprint Rail — independent verification handoff

## Verdict: FAIL — do not release

Candidate `946c9618d3f771ff3dcc98d7cf049a79547f8585` was independently tested on 2026-08-28 against <https://reading-sprint-rail.sociobot.in/>. The deployment bytes match the candidate, all five claim commands pass, the cold first-read/demo gate passes, the full local suite/build passes, and normal/offline use works. Release is blocked by:

1. **High:** a structurally invalid version-1 JSON import is persisted before validation. Reload then throws on `paragraphs: null` and renders a blank app with no recovery except clearing site data.
2. **High:** published README/live/privacy claims are missing from `.factory/claims.json`; the tagged export/restore test checks a toast rather than proving restoration after data removal or mutation.
3. **High:** the visually hidden EPUB and JSON file inputs remain in the keyboard Tab order with no visible focus indication.
4. **Medium:** several 390 px targets are under 44 px; SPA route/back changes and the skip link leave focus on `BODY`; route canonicals/social metadata/build identity are incomplete.

Full evidence, exact reproduction, passing checks, hashes, performance numbers, and remediation are in [`.factory/verification-2.md`](verification-2.md).

## Verification summary

```text
npm ci               PASS — 73 packages, 0 vulnerabilities
all five claim runs  PASS
npm test             PASS — 3 unit + 14 browser tests
npm run typecheck    PASS
npm run lint         PASS
npm run build        PASS — dist/ generated
live byte identity   PASS — HTML, JS, and CSS SHA-256 match
first-read/demo      PASS
offline/update       PASS
axe serious/critical PASS across routes and theme/contrast matrix
Lighthouse mobile   99 performance / 100 accessibility / 100 best practices / 92 SEO
overall release      FAIL
```

## Evidence and rerun

Evidence: `/work/evidence/reading-sprint-rail-verify-2/`.

```bash
npm ci
npm run test:e2e -- --grep @claim:sample-demo
npm run test:e2e -- --grep @claim:demo-isolation
npm run test:e2e -- --grep @claim:local-reading-data
npm run test:e2e -- --grep @claim:offline-reading
npm run test:e2e -- --grep @claim:json-export
npm test
npm run typecheck
npm run lint
npm run build
```

No product code was modified. The repository changes are this verifier report and handoff only.
