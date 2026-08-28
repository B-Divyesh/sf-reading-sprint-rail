# Reading Sprint Rail — repair 6 handoff

## Outcome

Repair 6 fixes the shelf-resume failure from candidate `a57699f7a6331dce5d063e255b7c5f0d07c4772d` while retaining the Vite + TypeScript offline PWA and static deployment class.

The root cause was twofold: reader edits mutated `current` immediately but refreshed the shelf only after an unqueued IndexedDB read, and the same mutable document object could cross overlapping asynchronous writes. A rapid move followed by a note could therefore leave the shelf read model stale or allow an older snapshot to overtake a newer one.

## Repair

- Added `src/documents.ts`, the single source for immutable document copies, ordered in-memory shelf upserts, and the derived shelf progress label.
- `persistCurrent()` now snapshots a reader edit, updates the shelf read model synchronously, and serializes IndexedDB writes. The shelf therefore derives `Stop 2 of 3 · 1 note` from exactly the current saved snapshot rather than a later database refresh.
- Added a unit regression proving a stale shelf copy is replaced by stop two plus its one note.
- Strengthened the single `@claim:shelf-resume` browser proof: it now checks the shelf immediately after note save (before the asynchronous storage queue resolves), then reloads and reopens the saved stop and note. It passed five consecutive serial repetitions.

## Verification

The required clean build command from the work order was run:

```text
npm ci && npm test && npm run build
PASS — 73 packages installed, 5 Vitest tests and 20 Playwright tests passed, dist/index.html produced
```

Additional checks:

```text
npm run build
PASS — TypeScript check and Vite build

npm run test:e2e -- --grep @claim
PASS — 11/11 declared claims

npm run test:e2e -- --grep @claim:shelf-resume --repeat-each=5 --workers=1
PASS — 5/5 serial repetitions
```

The full browser suite covers the product flow, imported EPUB and recovery errors, 390px layout and 44px targets, keyboard arrows/N, route focus and announcement, light/dark axe scans, demo isolation, privacy request policy, offline reload, PWA manifest/worker, and local export/import. It has no serious or critical axe violations on the home, reader, or dark reader views.

`verify-url.sh` passed against the production build preview for `/`, `/demo`, `/privacy`, and `/terms`. All returned 200 and reported one h1, a main landmark, `lang=en`, title, zero missing image alt attributes, zero unlabeled buttons, and zero page/console errors. Evidence is under `/work/evidence/reading-sprint-rail-repair-6/`.

A disposable copy of the built PWA changed the service-worker revision from `v3` to `v4`; a controlled `registration.update()` displayed `An update is ready. Reload to use it.`. The standard `@axe-core/cli` binary could not launch Chrome in this container even with the bundled Chromium path, so no CLI result is claimed; its Playwright `@axe-core/playwright` equivalent is part of the passing full suite.

Current production asset sizes are within the static budget:

```text
entry JS       35.76 KB / 12.42 KB gzip
entry CSS      22.35 KB /  5.62 KB gzip
lazy JSZip     97.36 KB / 30.16 KB gzip (EPUB import only)
```

## Deployment and live identity

`/opt/fleet/lib/deploy-static.sh reading-sprint-rail dist` deployed the verified build successfully on 2026-08-28. Azure Static Web Apps deployment `a8c8e6ce-3151-4138-abc7-5ae6888994d2` completed successfully on the reused Central US app host `red-wave-0518e0410.7.azurestaticapps.net`; the custom domain is Ready and `https://reading-sprint-rail.sociobot.in` returned HTTPS 200.

Post-deploy `verify-url.sh` passed live `/`, `/demo`, `/privacy`, and `/terms` with the same semantic/a11y and zero-console-error results as preview. `/not-a-real-route` returned HTTP 404. The deployed JavaScript asset exactly matched the local verified build:

```text
b5b4a49662cdda9c5e4bb012697f89c71aad1cefa185bd12cae15603018ae222  assets/index-DB9eOL29.js
```

Live response headers include HSTS, self-only CSP, no-cache `sw.js`, `X-Content-Type-Options: nosniff`, strict-origin referrer policy, permissions policy, and `X-Frame-Options: DENY`.

## Known gaps

No product or repair gaps are known. The only environment limitation was the standalone axe CLI Chrome launcher; equivalent in-repository Playwright axe coverage passed.
