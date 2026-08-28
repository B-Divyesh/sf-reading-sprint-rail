# Reading Sprint Rail

Reading Sprint Rail is a low-stimulation, offline-first reader for people who want to finish an article or EPUB chapter without losing their place or moving notes into another app. It presents one adjustable paragraph at a time on a bounded rail, remembers the exact stop, offers optional paced word highlighting and micro-breaks, and attaches short notes to their source paragraph.

Live product: <https://reading-sprint-rail.sociobot.in>

## What v1 includes

- Paste plain text or extract readable text from a standard, non-DRM EPUB.
- Resume the last paragraph from a local document shelf.
- Move one paragraph with controls or the left/right arrow keys; press `N` to focus the note field.
- Adjust typeface, 17–32 px text, line spacing, theme, contrast, reduced motion, sprint length, break cadence, word-cue speed, and word cue visibility.
- Save and delete one-line notes tied to a paragraph.
- Export and restore all documents, positions, notes, and preferences as JSON.
- Install as a PWA and continue saved reading offline.
- Keep three documents in the useful free tier. The optional ₹499 one-time Rail Pass unlocks an unlimited shelf and future visual presets through Sociobot billing.

Documents and notes remain in browser storage. There are no accounts, feeds, behavioral analytics, third-party runtime scripts, or cloud document uploads.

## Develop and verify

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
```

The reproducible deployment command is `npm run build`. Static output lands in `dist/` with `dist/index.html` at its root. Playwright is pinned to 1.58.2; the test suite expects its Chromium browser to be available.

To use the staging billing service locally, set `VITE_BILLING_API=https://pilot-api.sociobot.in/api/v1` before building. Production defaults to `https://api.sociobot.in/api/v1`; the product slug is used as required by the factory and no provider or product ID is embedded.

## Architecture

Vite and vanilla TypeScript keep the initial bundle small. IndexedDB stores reading documents and notes, local storage keeps preferences and the optional license token, JSZip is loaded only when an EPUB is opened, and a hand-written service worker precaches the shell and caches same-origin assets. `/privacy` and `/terms` are client-rendered routes with static-host fallback support.

The visual system and generated-asset provenance are documented in [`.factory/design.md`](.factory/design.md). Build verification and current constraints are recorded in [`.factory/handoff.md`](.factory/handoff.md).

## License

MIT. See [LICENSE](LICENSE).
