# Independent verification 1 — FAIL

**Candidate:** `c38fae1d2cb1ea1e78a43f7a38063362da37c682`  
**Verified URL:** <https://reading-sprint-rail.sociobot.in/>  
**Date:** 2026-08-28  
**Verdict:** **FAIL — do not release.**

## Release blockers

### Critical — required claims contract is absent

`.factory/claims.json` does not exist in this clean candidate. Therefore there are no required claim tests to run from the demo entry point. This directly fails the claims contract. It also leaves all visitor-facing promises unlisted and untested, including “Stays on this device”, “Works offline”, “Nothing leaves your device”, and the README's offline/resume/privacy promises.

### Critical — no one-click sample-data demo or isolated sandbox

Cold live-page evidence:

> “Keep the thread. Finish the piece.”
>
> “A quiet, offline rail for articles and EPUB chapters…”

The page is an offline paragraph reader, but it never says who it is for (in particular, the ADHD/dyslexic reader in the brief). The first usable action is to paste one's own text or select an EPUB. There is no visible **“Try it with sample data”** action (`0` matches), no sample data, no persistent “Demo — sample data, nothing is saved” banner (`0` matches), and no reset/start-real controls. `/demo` returns the SPA fallback but opens the ordinary empty app; it neither seeds sample data nor uses a separate storage namespace.

`.factory/demo.md` is also absent. This fails the mandatory first-read and demo-sandbox acceptance tests regardless of the otherwise working reader.

## Other defects

### High — the offered paid checkout is dead

The shelf advertises “Buy once — ₹499”. Its exact destination, `https://api.sociobot.in/api/v1/products/reading-sprint-rail/checkout`, returned **HTTP 404** on 2026-08-28. A visitor cannot purchase the advertised Rail Pass.

### High — serious axe contrast violations

Live axe checks found these serious `color-contrast` violations:

- Light shelf: `Optional Rail Pass` is jade `#1e6f5c` on ink `#182523`, ratio **2.62:1** (requires 4.5:1).
- Dark reader: the `Save note` button has white text on `#ff907d`, ratio **2.20:1** (requires 4.5:1).

This fails the required serious/critical axe gate and affects both colour treatments.

### Medium — security/cache/route policy gaps

- Live responses include HSTS, `Referrer-Policy`, and `X-Content-Type-Options`, but no `Content-Security-Policy`, `X-Frame-Options`, or `Permissions-Policy`.
- Hashed JS and CSS are served with only `cache-control: public, must-revalidate, max-age=30`, not long-lived immutable caching. The manifest is sent as `application/octet-stream` rather than a web-manifest type.
- There is no `staticwebapp.config.json`; `/not-a-real-route` returns HTTP 200 and renders the home app, rather than a designed real 404 route.

### Medium — invalid EPUB recovery exposes library jargon

Uploading a non-ZIP `.epub` produces JSZip's raw error: “Can't find end of central directory : is this a zip file ? …”. It does not plainly say what happened and what to do next, contrary to the form-error contract. The >25 MB boundary is handled clearly.

## What passed

### Clean candidate checks

Run in `/work/repo` at the candidate:

```text
npm ci                         PASS — 73 packages; 0 vulnerabilities
npm test                       PASS — 3 Vitest + 6 Playwright tests
npm run build                  PASS — dist/ generated
```

No lint command is provided. `npm run build` includes `tsc --noEmit`. The initial production JS is 33.30 kB (11.74 kB gzip), CSS 21.14 kB (5.45 kB gzip), fonts 34.7 kB total, and the mobile hero WebP 11.8 kB: within stated static budgets. Lighthouse 12.8.2 mobile on the live homepage recorded Performance 100, Accessibility 100, Best Practices 100, SEO 100 (FCP 0.9 s, LCP 1.2 s, TBT 0 ms, CLS 0). That homepage-only score does not cover the axe failures above.

### Live deployment identity and basic runtime

The live `index.html`, `index-B9-K7h-Q.js`, `index-DDvbkhoV.css`, and `rail-landscape-768.webp` SHA-256 values exactly match this candidate's fresh `dist/` output. Cold load returned 200 with no console errors or page errors; its initial requests were same-origin fonts, JS, CSS, and hero image only.

At 1440 px and 390 px the cold live page had no horizontal overflow. Keyboard arrow navigation moved one paragraph, notes persisted after reload, the shelf resumed the saved stop, JSON export produced version `1` with the document, and invalid JSON import gave a clear recovery toast. A valid EPUB is covered by the passing browser suite. A 25 MiB + 1 byte EPUB reports “That EPUB is over 25 MB”; a long unbroken normal text was split into three reading stops.

`prefers-reduced-motion` and the in-app setting set animation/transition duration to `0.01ms`; keyboard Tab showed the designed 3px focus outline. The service worker became active (`rsr-shell-v2`), cached the current JS/CSS shell, and a fresh live context continued saved reading after `context.setOffline(true)` and reload. The current worker contains `skipWaiting`, `clientsClaim`, cache versioning, and the update-ready toast path; a new production version could not be induced against this fixed candidate URL.

### Privacy and rate-limit checks

The normal reader flow made only same-origin requests and stored documents in IndexedDB/local preferences; no analytics or third-party runtime assets were observed. The documented license verification endpoint accepts the invalid test token and returned its expected JSON invalid result. A 30-request burst to `GET /api/v1/products/reading-sprint-rail/verify` began returning 429 after roughly 16 accepted requests (parallel ordering varied); every observed 429 included `Retry-After: 4` and `x-ratelimit-after: 4`.

## Evidence

Artifacts are in `/work/evidence/reading-sprint-rail-verify-1/`:

- `live-desktop-cold.png` and `live-mobile-cold.png` — cold first-read screens.
- `live-index.html`, `live-index-B9-K7h-Q.js`, `live-index-DDvbkhoV.css`, and `live-rail-landscape-768.webp` — byte-for-byte deployment comparison.
- `billing-baseline.headers` / `.body` — billing verify baseline.
- `lighthouse-mobile.json` — live mobile Lighthouse result.

## Required remediation before another verification

1. Add `.factory/claims.json` and one independently runnable, tagged demo-path test per claim; remove untestable claims.
2. Implement and document `/demo` with realistic seeded sample data, a clear first-screen one-click action, persistent demo banner/reset/start-real controls, and isolated `demo:` storage.
3. Replace the metaphor-only first-screen headline with plain words that state the job and intended reader; state what the sample action does beside it.
4. Register/repair the Sociobot checkout or remove the paid offer until it can complete.
5. Fix both axe violations, the header/cache/404 policy gaps, and the invalid EPUB error.
