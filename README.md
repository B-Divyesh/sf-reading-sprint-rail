# Reading Sprint Rail

Finish an article or EPUB chapter one adjustable paragraph at a time. Reading Sprint Rail is for ADHD and dyslexic readers who want to keep their place and notes together.

Live product: <https://reading-sprint-rail.sociobot.in>

## What v1 includes

- Try the complete reader at [`/demo`](https://reading-sprint-rail.sociobot.in/demo). The three-stop sample is isolated from real reading data.
- Paste plain text or extract readable text from a standard, non-DRM EPUB.
- Resume the last paragraph from a local document shelf.
- Move one paragraph with controls or the left/right arrow keys; press `N` to focus the note field.
- Adjust typeface, 17–32 px text, line spacing, theme, contrast, reduced motion, sprint length, break cadence, word-cue speed, and word cue visibility.
- Save and delete one-line notes tied to a paragraph.
- Export and restore all documents, positions, notes, and preferences as JSON.
- Install as a PWA and continue saved reading offline after the first visit.
- Keep any number of documents in the local shelf.

Documents and notes remain in browser storage. There are no accounts, feeds, behavioral analytics, third-party runtime scripts, or cloud document uploads.

The claims and executable demo-path proof are listed in [`.factory/claims.json`](.factory/claims.json). Demo setup and storage isolation are documented in [`.factory/demo.md`](.factory/demo.md).

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

## Architecture

Vite and vanilla TypeScript keep the initial bundle small. IndexedDB stores reading documents and notes, local storage keeps preferences, JSZip is loaded only when an EPUB is opened, and a hand-written service worker precaches the shell and caches same-origin assets. `/demo`, `/privacy`, and `/terms` are client-rendered routes with static-host routing and a designed 404 response.

The visual system and generated-asset provenance are documented in [`.factory/design.md`](.factory/design.md). Build verification and current constraints are recorded in [`.factory/handoff.md`](.factory/handoff.md).

## License

MIT. See [LICENSE](LICENSE).
