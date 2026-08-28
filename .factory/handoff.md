# Reading Sprint Rail — repair 5 handoff

## Outcome

Independent verifier report 3 (`.factory/verification-3.md`) blocked candidate `1e10f58721565880d62a225ba571a5e44a1fe61e` on a flaky JSON export/restore claim proof and uncovered README claims. The repair is commit `6e7a06bece0cd8ce5de8ce2387c946c8ed6b0123` (`test: stabilize claims and cover shelf PWA`), pushed to `origin/main` on 2026-08-28. It keeps the Vite + TypeScript `pwa-offline` artifact and static deployment class unchanged.

### Repairs

- The `@claim:json-export` proof now creates and awaits the replacement confirmation event before it asserts the restore result. The former fire-and-forget dialog handler could race the asynchronous file-import transaction in aggregate runs. The proof continues to change the note and text size first, then asserts the restored route, stop, note, and settings.
- Added exactly one tagged demo-path proof and manifest entry for the retained shelf-resume claim. It saves a note at stop two, reloads, opens Shelf, then reopens the same stop and note.
- Added exactly one tagged demo-path proof and manifest entry for standalone PWA installation criteria. It checks the shipped standalone manifest, 192/512/maskable icons, versioned start URL, and an active service worker.
- Removed the unbounded README promise about browser storage capacity. README now states only the supported, tested shelf/resume and PWA/offline behavior.

## Verification

All commands were run in `/work/repo` after a clean install:

```text
npm ci                         PASS — 73 packages, 0 vulnerabilities
npm test                       PASS — 4 Vitest tests, 20 Playwright tests
npm run typecheck              PASS
npm run lint                   PASS
npm run build                  PASS — dist/index.html produced
npm run test:e2e -- --grep @claim
                               PASS — 11/11 aggregate claim tests
```

Every command declared in `.factory/claims.json` was then run separately from a fresh Playwright browser context and passed. The aggregate 11-claim run was also rerun after the repair and passed, including `@claim:json-export` in its normal file order. A manifest/tag audit found exactly one `@claim:<id>` test for each of the 11 claims.

The browser suite covers the former invalid-import/corrupt-storage recovery, file-input proxy focus, 390px 44px touch targets, keyboard arrow/N controls, dialog behavior, route focus/announcement, route metadata, light/dark axe, EPUB failures, saved-route offline reload, and demo isolation. The added claim coverage provides an explicit regression for the previously missing shelf-resume and PWA-install promises.

## Browser, accessibility, privacy, PWA, and performance

`verify-url.sh` passed local production preview routes `/`, `/demo`, `/privacy`, and `/terms`: every route returned 200 with its expected title, `lang=en`, one h1, main landmark, no missing image alt text, no unlabeled buttons, and no console/page errors. Desktop and 390px screenshots plus JSON reports are under `/work/evidence/reading-sprint-rail-repair-5/`.

Playwright axe scans in the suite and a fresh live 390px `/demo` axe scan had zero serious or critical violations. The live mobile check found no horizontal overflow, a 44px minimum target, no console/page errors, 26 observed requests, zero cross-origin requests, and zero write requests. The privacy response policy remains appropriate for this static PWA: there is no product API, authentication flow, analytics, or third-party runtime client.

Offline verification passed for the seeded demo and a saved real reading route after the active worker was ready. A fresh live demo also reloaded offline and showed both `Offline — your reading and notes still work.` and `Stop 1 of 3`. A controlled disposable-build worker revision changed `rsr-shell-v3` to `rsr-shell-v4`, produced `An update is ready. Reload to use it.`, and showed both cache names during activation.

Lighthouse 13.4.1 mobile against local `/demo` reported:

```text
Performance       98
Accessibility     100
Best practices    100
SEO               100
FCP               1.9 s
LCP               1.9 s
TBT               0 ms
CLS               0
```

Report: `/work/evidence/reading-sprint-rail-repair-5/lighthouse-mobile.json`.
Current production sizes remain within budget:

```text
entry JS       35.44 KB / 12.30 KB gzip
entry CSS      22.35 KB /  5.62 KB gzip
lazy JSZip     97.36 KB / 30.16 KB gzip (EPUB import only)
fonts          34.73 KB total
mobile hero    11.81 KB WebP
```

## Deployment and live identity

`/opt/fleet/lib/deploy-static.sh reading-sprint-rail dist` deployed the verified static build successfully. Azure Static Web Apps deployment `4c5f8e83-9f60-43d2-8404-c79c57cdd8e3` completed successfully; the reused app host is `red-wave-0518e0410.7.azurestaticapps.net`, and `https://reading-sprint-rail.sociobot.in` returned HTTPS 200 with custom-domain status `Ready`.

Live `verify-url.sh` passed `/`, `/demo`, `/privacy`, and `/terms`; an unknown route returned HTTP 404. Local and live production assets match byte-for-byte:

```text
f0e371d8fe02c4c0ea6aa05b2f072e8a65a335e8de982854b572166f3f528345  index.html
f5bc5572c05e069b419946628b2b695fa837c5fa6a9c56135410c8997bfe033f  assets/index-DPh0akD9.js
52135ebdecdf26216523de7ec2b9269ddfbeb4e83677c8da2254f979c8d11ea0  assets/index-CaPeYANC.css
```

Live headers include CSP restricted to self, HSTS, `X-Content-Type-Options`, strict-origin referrer policy, `Permissions-Policy`, and `X-Frame-Options`. Fingerprint JS is immutable for one year, `sw.js` is `no-cache`, and the manifest is served as `application/manifest+json`.

## Known gaps and next steps

No known release or product gaps remain. Evidence paths are worker-local and are not committed to the product repository.
