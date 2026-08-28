# Independent verification 2 — FAIL

**Candidate:** `946c9618d3f771ff3dcc98d7cf049a79547f8585`  
**Verified URL:** <https://reading-sprint-rail.sociobot.in/>  
**Date:** 2026-08-28  
**Verdict:** **FAIL — do not release.**

The live deployment matches the candidate and the normal reading/PWA flow is strong, but invalid import can persist corrupt data and blank the whole app. The claims manifest also does not cover all published claims, one listed restore claim is not fully proved by its tagged test, and required keyboard/touch/routing metadata checks fail.

## Mandatory gates

### Claims tests — commands all pass

`.factory/claims.json` exists. From the clean candidate after `npm ci`, every listed command was run separately through the production preview/demo entry point:

| Claim | Exact command | Result |
| --- | --- | --- |
| `sample-demo` | `npm run test:e2e -- --grep @claim:sample-demo` | PASS — 1 test, 12.9 s |
| `demo-isolation` | `npm run test:e2e -- --grep @claim:demo-isolation` | PASS — 1 test, 12.7 s |
| `local-reading-data` | `npm run test:e2e -- --grep @claim:local-reading-data` | PASS — 1 test, 12.6 s |
| `offline-reading` | `npm run test:e2e -- --grep @claim:offline-reading` | PASS — 1 test, 14.0 s |
| `json-export` | `npm run test:e2e -- --grep @claim:json-export` | PASS — 1 test, 14.0 s |

Passing commands do not make the claims contract complete. See the High claims finding below.

### Cold first read — PASS

At 1440 px and 390 px, a fresh live visit states:

> Finish reading without losing your place.

It says it is “For ADHD and dyslexic readers,” explains the one-paragraph reader, notes, and saved place, and shows **Try it with sample data** with “Opens a three-stop reading rail right away.” The action is on the first screen and opens `/demo` in one click. The destination immediately shows the persistent demo banner, a realistic titled sample, and Stop 1 of 3.

## Release-blocking findings

### High — a structurally invalid import poisons storage and blanks the app

The import checks only `version === 1` and that `documents` is an array. It writes document objects before validating their fields. Fresh live reproduction:

1. Open Shelf and import `{"version":1,"documents":[{"id":"crafted","title":"Crafted","source":"paste","paragraphs":null,"currentIndex":0,"notes":[],"createdAt":1,"updatedAt":1}],"settings":{}}`.
2. Accept the replacement confirmation.
3. The app says “That file is not a valid Reading Sprint Rail export,” but the invalid record has already been stored.
4. Reload.

The reload raises `TypeError: Cannot read properties of null (reading 'length')`; `#app` is empty, there is no h1, and no in-product recovery remains. The user must clear browser site data. This violates invalid-input recovery, state safety, and the core local-first job. Evidence: `live-invalid-import.json` and `live-invalid-import-blank.png`.

### High — published claims are absent from `.factory/claims.json`, and restore is not fully asserted

The manifest has five entries, but visitor-facing claims outside it include:

- README: standard non-DRM EPUB extraction; left/right and `N` keyboard controls; the full set of adjustable settings; save/delete notes; “Keep any number of documents”; and no accounts, feeds, analytics, third-party runtime scripts, or uploads.
- Live product/privacy copy: paste/EPUB processing in-browser; no advertising, behavioral analytics, tracking pixels, third-party fonts, or social SDKs.

These are statements a visitor can rely on but have no corresponding `@claim:<id>` entry. “Keep any number of documents” is also an unbounded quantitative promise that cannot literally hold under browser quota.

The `json-export` claim promises both export and restore. Its tagged test validates the downloaded fields, imports the same file over unchanged data, then checks only a success toast. It never clears or changes the source data and does not assert that documents, position, notes, and preferences were restored. Independent QA proved valid restoration does work, but the required claim test does not prove its entire claim.

### High — keyboard focus is invisible for both file-import actions

`#epub-file` and `#import-data` use `.visually-hidden`, remain in the Tab order, and receive focus after the visible action before them. The global `input { min-height: 48px }` overrides part of the hiding geometry while `clip: rect(0,0,0,0)` still clips the input and its outline. A sighted keyboard user reaches an invisible focused control; the visible **Open an EPUB** / **Import data** labels receive no focus treatment. This fails the non-negotiable visible-focus requirement and makes two core actions undiscoverable by keyboard.

## Other findings

### Medium — mobile touch targets are below 44 px

At 390 px, measured live targets include **Reset demo** and **Start for real** at 32 px high, the icon-only Shelf/back control at 35 px wide, and footer Privacy/Terms links at 16 px high. Legal-page header/contact links are also below 44 px high. There is no horizontal overflow, but these controls fail the required 44 × 44 CSS px target.

### Medium — client-side route changes do not move or announce focus

Keyboard activation of Privacy changes the page and title but leaves focus on `BODY`; Back does the same. No route announcement region contains the new title. The skip link scrolls to `#main` but also leaves focus on `BODY`. This fails the required focus-on-h1 and route announcement behavior. Native settings-dialog focus initially lands on **Close settings**, Escape restores the settings button, and no external interactive element was reachable while it was open.

### Medium — route/social metadata is incomplete

- `/demo`, `/privacy`, and `/terms` retain the homepage canonical URL. Lighthouse on `/demo` reports the canonical audit failure because it points to non-equivalent homepage content; SEO is 92.
- Open Graph and Twitter card metadata and the required 1200 × 630 product image are absent.
- The footer has no version/build identifier.

## What passed

### Clean local gates and build

```text
npm ci              PASS — 73 packages, 0 vulnerabilities
npm test            PASS — 3 Vitest + 14 Playwright tests
npm run typecheck   PASS
npm run lint        PASS (tsc --noEmit)
npm run build       PASS — dist/ generated
```

Initial production assets are within budget: JS 32.33 KB (11.36 KB gzip), CSS 21.94 KB (5.57 KB gzip), fonts 34.7 KB total, and the mobile hero WebP 11.8 KB. The 97.36 KB JSZip chunk is lazy-loaded only for EPUB import.

### Deployment identity and host policy

Live and local production hashes match exactly:

```text
index.html                    ed074d2cf7f9c561626d3adda0b9bfd43b6d76215931648c3b44861ccf251727
assets/index-Bed8ETlT.js      66b2526a984353f6bcef350df31fcb953b6d61ceb8c6925d1ad559ad710a2ea5
assets/index-CIccCDrI.css     20960e7ee6a518af811488eb3db1987e64c99d50f104c18b2768165b66125e14
```

`/`, `/demo`, `/privacy`, and `/terms` return 200; an unknown route returns the designed page with HTTP 404. CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and `X-Frame-Options: DENY` are present. Hashed assets return `Cache-Control: public, max-age=31536000, immutable`; `sw.js` is `no-cache`; the manifest has the correct web-manifest MIME type.

The factory `verify-url.sh` passes root and demo: title, `lang=en`, one h1, main, alt text, labeled buttons, screenshots, and no console/page errors.

### Functional product checks

- The sample is immediately usable; demo reset discards changes and reseeds Stop 1 of 3. Start for real clears the demo namespace, and claim coverage confirms the real database stays empty.
- Paste creates a rail; a long unbroken passage splits into five stops without script injection. Empty/whitespace input recovers with a plain error. Title input caps at 100 characters; notes cap at 160.
- Arrow navigation, `N` note focus (after the transition), note creation, deletion confirmation/cancel, shelf resume, and immediate reload persistence work.
- Empty titles become “Untitled reading”; a one-stop document disables both directions at 100%.
- A malformed EPUB and an over-25-MB EPUB get clear recovery messages. A valid EPUB passes the full suite.
- Word cue advances; a 15-minute sprint configured for five-minute breaks opens the pause dialog and resumes. Light/dark, contrast, type size, spacing, word cue, and reduced motion persist.
- A genuine export was independently created, its source document deleted, then imported. Stop 2 of 2, its note, and 28 px type setting were restored.

### Accessibility and responsive behavior

Playwright axe found no serious/critical violations on home, reader, shelf, privacy, terms, or 404. A fresh matrix of light/dark × normal/high-contrast at 1440 and 390 px also had zero serious/critical findings. The 390 px layouts have no horizontal overflow. Focus outlines are 3 px and clearly visible on ordinary controls. OS and in-product reduced-motion modes both reduce animation/transition duration to `0.01ms`. The settings dialog opens with controlled focus and closes with Escape.

The manual failures above remain despite the passing automated axe result.

### PWA, privacy, and runtime

The active worker is `/sw.js` with `updateViaCache: none`. `rsr-shell-v3` contains the current hashed JS/CSS, fonts, icons, manifest, fallback, and art. Stop 2 and a note saved while offline survived offline reload and reconnect with no errors. Against a disposable copy of the exact build, changing the worker version produced “An update is ready. Reload to use it.” and installed the new cache, confirming the update path.

All observed normal/demo/notes/offline requests were same-origin and GET-only. Source inspection found no analytics, third-party runtime scripts, document upload, billing, or authentication client. This is a static PWA with no product API endpoint, so the API burst/rate-limit and Entra sign-in checks are not applicable.

### Performance

Live mobile Lighthouse 12.8.2 on `/demo`:

| Category/metric | Result |
| --- | ---: |
| Performance | 99 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 92 (canonical failure) |
| FCP | 1.2 s |
| LCP | 1.3 s |
| TBT | 130 ms |
| CLS | 0 |
| Initial transfer | 65.1 KB |

INP is not produced by a single lab navigation; interactive browser flows remained responsive, and TBT is below the 200 ms interaction proxy budget.

## Evidence

Evidence is under `/work/evidence/reading-sprint-rail-verify-2/`, including cold desktop/mobile and demo screenshots, factory URL verification JSON, mobile target audit, confirmed offline flow, invalid-import reproduction, and `lighthouse-mobile.json`.

## Required before re-verification

1. Validate the complete import schema before mutating IndexedDB; reject atomically and retain a usable shelf. Add corruption recovery at startup and a regression test.
2. Add one adequate tagged test per published claim or remove/qualify the copy. Make the restore claim test delete/mutate data and assert restored content, position, notes, and settings.
3. Give file inputs a visible keyboard focus treatment through their visible labels.
4. Raise all touch targets to 44 × 44 px and test them at 390 px.
5. Move focus to and announce the new h1 on SPA route/back changes; make the skip target focusable.
6. Set route-correct canonicals, add required Open Graph/Twitter metadata and social image, and show a build identifier in the footer.
