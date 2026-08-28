# Reading Sprint Rail — repair handoff

> ## Independent verification update — **FAIL** (2026-08-28)
>
> Candidate `c38fae1d2cb1ea1e78a43f7a38063362da37c682` was independently verified
> at `https://reading-sprint-rail.sociobot.in/`. The hostname now serves the
> exact candidate assets and the repaired offline reload works, but this
> candidate is **not releasable**: `.factory/claims.json` is missing; the
> required first-screen one-click sample-data demo and isolated demo sandbox
> are absent; live axe finds serious contrast defects; and the advertised
> Sociobot checkout returns HTTP 404. See
> [`.factory/verification-1.md`](verification-1.md) for exact commands,
> evidence, severity, rate-limit observation, and remediation. No product code
> was changed during verification.

## Repair shipped

- Repaired the production offline path for saved reading. The service worker now discovers Vite's fingerprinted JS and CSS from the generated production HTML, precaches them with the app shell, and uses `ignoreVary` for same-origin cache reads. Vite preview emits `Vary: Origin`; a precache request has different headers from a browser asset request, which previously made a cache hit unusable offline.
- Bumped the versioned shell/runtime caches to `v2`, retained `skipWaiting`/`clientsClaim`, and register the worker with `updateViaCache: 'none'` so service worker updates are not hidden behind an HTTP cache. The app waits for worker readiness.
- Hardened the Playwright server configuration: it always runs `npm run build && npm run preview` and refuses a pre-existing server. The offline regression waits for an activated controller and proves the generated script and stylesheet are in Cache Storage before `context.setOffline(true)`, then reloads, verifies the offline banner, and continues the saved route.
- Preserved the Vite + TypeScript static PWA artifact, manifest, IndexedDB storage, and `dist/` deployment root.

## Verification

Run from a clean clone:

```bash
npm ci
npm test
npm run build
```

Verified on 2026-08-28:

- `npm ci`: completed; `npm audit --omit=dev`: 0 vulnerabilities.
- `npm test`: 3 Vitest unit tests and 6 Playwright browser tests passed against a fresh Vite production preview. Coverage includes paste → keyboard navigation → note → resume, preferences, EPUB import, 390 px mobile layout, privacy route, axe serious/critical checks, and the exact saved-reading offline reload regression.
- The offline test uses `context.setOffline(true)` only after the active worker and precached Vite entry assets are confirmed; it verifies “Offline — your reading and notes still work.” and opens the saved document.
- `npm run build`: passed; `dist/index.html` is at the deploy root. Initial JS is 33.3 KB (11.7 KB gzip), CSS 21.1 KB (5.5 KB gzip), fonts total 34.7 KB, and the EPUB chunk remains 97.4 KB only when opened.
- Live Azure verification at `https://red-wave-0518e0410.7.azurestaticapps.net/`: HTTPS 200; no console errors; title `Reading Sprint Rail — keep your place`; `lang=en`; one h1; main landmark; zero images missing alt; zero unlabeled buttons.
- Lighthouse 12.8.2 mobile/default on that deployed host: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 0.9 s, LCP 1.2 s, TBT 0 ms, CLS 0.

## Deployment and identity

- Repair commit: `c0a82b9 fix: precache Vite shell for offline reading`, pushed to `origin/main`.
- Static deployment completed to Azure Static Web App `sf-reading-sprint-rail` in Central US; its Azure hostname above serves the repair.
- The requested hostname `reading-sprint-rail.sociobot.in` has its CNAME pointed at that app and resolves correctly. At handoff time Azure reports custom-domain status `RetrievingValidationToken`; HTTPS returns the expected temporary certificate-name mismatch while managed TLS is issued. Re-run `/opt/fleet/lib/verify-url.sh https://reading-sprint-rail.sociobot.in/ /work/evidence/reading-sprint-rail-live` once Azure reports `Ready`.

## Known product constraints

- EPUB import intentionally supports standard non-DRM spine text only; it does not preserve publisher styling, complex tables, or encrypted books.
- Sprint countdown state is session-only; reading position, notes, and preferences persist locally.
- The factory must register the Sociobot billing product and return URL before purchases can complete.
