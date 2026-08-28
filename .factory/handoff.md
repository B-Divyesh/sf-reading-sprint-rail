# Reading Sprint Rail — handoff

## Shipped

- A complete Vite + TypeScript offline PWA in `dist/` after build.
- Pasted-text and local EPUB import with friendly empty, invalid-file, size-limit, and storage-unavailable states.
- A paragraph-by-paragraph reading rail with neighboring context, exact IndexedDB resume, buttons and arrow-key navigation, responsive 390 px layout, and a completion endpoint.
- Adjustable font family, size, line height, light/dark/system appearance, high contrast, reduced motion, optional paced word cue, 5/15/25-minute sprints, and optional 5/10-minute micro-breaks.
- One-line notes attached to source paragraphs, confirmed deletion, document shelf, confirmed document deletion, and complete JSON export/import.
- Local-only data storage, offline banner/fallback, versioned service-worker caches, app manifest, install icons, and an update-available toast.
- A useful free tier (3 saved documents) and a ₹499 one-time Rail Pass for unlimited documents/future visual presets. Checkout, returned-token capture, daily cached verification, optimistic offline unlock, invalid-license handling, and paste-to-restore follow the Sociobot billing contract. No product ID or payment provider is embedded.
- Privacy and terms routes, self-hosted fonts, original authored icons, and a generated/optimized responsive hero with prompt and provenance.

## Verification

Run from a clean clone:

```bash
npm install
npm test
npm run build
```

Verified 2026-08-28:

- `npm test`: 3 unit tests and 6 Playwright tests passed.
- Browser coverage: paste → read → keyboard move → note → refresh/resume; preference persistence; actual in-memory EPUB import; 390 px layout; privacy route; service-worker offline reload with saved reading; axe scan on home and reader.
- Axe 4.10: zero serious or critical violations, including color contrast checks.
- `npm audit`: 0 vulnerabilities.
- Production build: initial app JS 33.2 KB (11.7 KB gzip), CSS 21.1 KB (5.5 KB gzip); EPUB parser chunk 97.4 KB (30.2 KB gzip) loaded on demand; two fonts total 35 KB; responsive hero WebP 12 KB/40 KB. All are inside the factory budgets.
- Lighthouse 12.8.2, mobile defaults against local production preview: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 0.9 s, LCP 1.5 s, TBT 0 ms, CLS 0.
- Manual visual review at desktop, 390×844 reader, and 390×844 landing page completed. No horizontal overflow or browser console errors observed.
- `dist/index.html` exists at the deploy root.

## Known constraints and next steps

- EPUB support intentionally reads standard, non-DRM spine content. It does not preserve illustrations, complex tables, footnote popovers, or publisher styling; encrypted/DRM books are unsupported and reported honestly.
- Sprint countdown state is session-only and resets after a full page reload; reading position and notes persist.
- The factory must register the `reading-sprint-rail` billing product and configure its return URL before live purchases can complete. Use `VITE_BILLING_API=https://pilot-api.sociobot.in/api/v1` for staging.
- Static hosting must rewrite `/privacy` and `/terms` to `index.html`. The service worker already handles those routes after installation.
