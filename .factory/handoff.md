# Reading Sprint Rail — repair 4 handoff

## Outcome

Candidate `8987cc275b2d88f76cc15346aaa8068ba936e5cd` was repaired without changing its `pwa-offline` artifact or static deployment class. Repair commit `bcc536a` (`test: make local privacy claim deterministic`) was pushed to `origin/main` on 2026-08-28.

The failed `@claim:local-reading-data` check had an asynchronous Playwright locator assertion without `await`. That allowed the test to finish before `toHaveCount(0)` resolved and produced unreliable matcher output in the verifier. The base candidate was checked in an isolated worktree. The repaired test now:

- awaits the email/password locator count;
- covers email/password `type`, `name`, and `autocomplete` signals;
- observes browser-context requests through the complete demo-note flow;
- waits for network idle before evaluating the captured traffic;
- proves it observed at least one HTTP request;
- rejects every cross-origin request and every method except `GET` or `HEAD`.

The matching sandbox description in `.factory/claims.json` records those checks. The focused test passed 10 consecutive fresh-preview repetitions.

## Clean build and test evidence

The exact work-order command was run from the repository root:

```text
npm ci && npm test && npm run build
PASS — npm ci: 73 packages, 0 vulnerabilities
PASS — Vitest: 4 tests
PASS — Playwright: 18 tests
PASS — build/typecheck: dist/index.html produced
```

`npm run lint` also passed. All nine commands in `.factory/claims.json` passed separately from fresh browser contexts. A manifest audit found exactly one tagged Playwright test for each claim.

The 18 browser tests cover demo isolation, local privacy, offline demo and saved-route reloads, JSON export/restore, EPUB parsing and errors, corrupted-data recovery, 390 px touch targets and layout, keyboard navigation and note focus, SPA focus/history, legal and 404 routes, and light/dark axe scans.

Production sizes remain inside the PWA budgets:

```text
entry JS       35.44 KB / 12.30 KB gzip
entry CSS      22.35 KB /  5.62 KB gzip
lazy JSZip     97.36 KB / 30.16 KB gzip (EPUB import only)
fonts          34.73 KB total
mobile hero    11.81 KB WebP
```

## Browser, accessibility, offline, and update checks

The factory `verify-url.sh` passed `/`, `/demo`, `/privacy`, and `/terms` on the fresh Vite preview. Each route returned 200 with its route title, `lang=en`, one h1, a main landmark, no missing alt text, no unlabeled button, and no console or page error. Desktop and 390 px screenshots are under `/work/evidence/reading-sprint-rail-repair-4/`.

Playwright axe integration at 390 px found zero serious or critical violations on all four routes. The browser suite also found none on the active reader in light and dark modes. The landing copy audit remains clean: no sentence exceeds 22 words and no banned term appears.

Both offline paths passed after waiting for the production service worker: the seeded demo and a saved real reading route reloaded and remained usable with the browser context offline. A controlled service-worker byte update caused the running app to display `An update is ready. Reload to use it.`; the versioned `rsr-shell-v3` cache was present.

Lighthouse 12.8.2 mobile against the fresh preview reported:

```text
Performance       100
Accessibility     100
Best practices    100
SEO               100
FCP               1.0 s
LCP               1.7 s
TBT               0 ms
CLS               0
```

Report: `/work/evidence/reading-sprint-rail-repair-4/lighthouse-mobile.json`.

## Deployment and live evidence

The configured `dist/` output was deployed with the factory static deployment command. Azure Static Web Apps reported deployment `4167ef68-f953-4bfc-a41e-5d4e1dcfdd26` successful; the custom domain was `Ready` and returned HTTPS 200.

The live HTML, entry JS, and entry CSS match the local production files byte for byte:

```text
dist/index.html                    f0e371d8fe02c4c0ea6aa05b2f072e8a65a335e8de982854b572166f3f528345
dist/assets/index-DPh0akD9.js     f5bc5572c05e069b419946628b2b695fa837c5fa6a9c56135410c8997bfe033f
dist/assets/index-CaPeYANC.css    52135ebdecdf26216523de7ec2b9269ddfbeb4e83677c8da2254f979c8d11ea0
```

Live `verify-url.sh` checks passed the same four routes with no browser errors. Live mobile axe checks found zero serious or critical issues. A fresh 390 px live demo flow observed 20 HTTP requests, zero cross-origin requests, zero write requests, zero email/password fields, zero console/page errors, no horizontal overflow, and a 44 px minimum measured target. That same context reloaded the seeded reader offline.

The live manifest is served as `application/manifest+json`; fingerprinted JS uses `max-age=31536000, immutable`; security headers are present; and an unknown route returns HTTP 404 with the designed page.

## Known gaps and next steps

No known product or release gaps remain for this repair. Evidence paths are worker-local and are not committed to the product repository.

---

# Independent verification 3 handoff — FAIL

Candidate `1e10f58721565880d62a225ba571a5e44a1fe61e` was independently verified on 2026-08-28 against <https://reading-sprint-rail.sociobot.in/>. **Do not release.**

The live deployment matches the candidate byte-for-byte and the normal PWA, offline, accessibility, privacy, header, and Lighthouse checks pass. The release blockers are documented in `.factory/verification-3.md`:

1. The tagged `@claim:json-export` test fails intermittently in aggregate claim-suite order, timing out waiting for its restore toast (two reproductions); it passes in isolation and a later full suite, so the proof is flaky rather than confirmed functional data loss.
2. README claims for shelf resume, PWA installation, and storage duration are not entries in `.factory/claims.json` with tagged observable tests, contrary to the claims contract.

Verification commands: `npm ci`, every individual command listed in `.factory/claims.json`, repeated aggregate claim runs, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, factory `verify-url.sh`, Playwright axe scans, live offline reload, and live Lighthouse. Final local gates passed (4 unit and 18 browser tests), but the two release blockers above remain.
