# Reading Sprint Rail — visual thesis

## Direction: generative geometry as a place-keeping system

The product is a quiet stretch of track through a document, not a library, feed, or dashboard. Its geometry is made from offset rails, numbered stops, cropped circles, and paper-like planes. These forms explain the experience: one paragraph is the current station; neighboring paragraphs remain visible but recede; progress advances along a finite route. The visual system avoids medical symbolism and gamified rewards.

## Palette

The light treatment resembles an annotated paperback under a warm lamp. The dark treatment resembles graphite paper rather than a glowing black screen.

| Token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| paper/background | `#F4F0E6` | `#171A1D` | Low-glare reading field |
| surface | `#FFFCF4` | `#22272B` | Reader planes and controls |
| ink/text | `#182523` | `#F4F0E6` | Primary copy, ≥4.5:1 |
| muted | `#56625E` | `#B8C1BC` | Secondary copy, ≥4.5:1 |
| rail | `#1E6F5C` | `#79D4B7` | Position, completion, focus |
| signal | `#BA3F30` | `#FF907D` | Current station and primary action |
| amber | `#B36A16` | `#F0B766` | Breaks and warnings |
| danger | `#A53232` | `#FF8B8B` | Destructive/error feedback |
| focus | `#4B45D6` | `#AFAAFF` | Keyboard focus, visually distinct |

High-contrast mode collapses the palette to near-white/near-black with bright yellow focus and underlined actionable text. Color is always paired with text, shape, or position.

## Typography

- Interface: `Atkinson Hyperlegible Next`, regular and bold, self-hosted WOFF2. Its differentiated glyphs suit the product without making efficacy claims.
- Reading rail: user-selectable between the same humanist face, a system serif stack, and a system sans stack. Body starts at 20px with 1.65 leading and a 62-character measure.
- Scale: 14, 16, 20, 25, 32, and fluid 40–64px. Tabular figures are used for time and position.

## Spacing and shape

- 4px base rhythm; common steps: 8, 12, 16, 24, 32, 48, 72.
- Controls are at least 44px high with 10px radii. Reading planes use clipped 18px corners, never stacks of generic cards.
- Desktop is an asymmetric 5/7 split while importing, then a focused centered rail with a slim tools edge. At 390px controls stack and nonessential illustration detail drops.

## Interaction grammar

- **Lay a route:** import creates a short rail preview before opening the first paragraph.
- **Move one stop:** Previous/Next and arrow keys move exactly one paragraph. Progress and location update together.
- **Capture beside the stop:** a note drawer originates from the rail marker and saves against the current paragraph.
- **Pause without punishment:** micro-breaks are a calm, dismissible interruption. There are no streaks, scores, or overdue states.
- Primary actions are coral filled shapes; secondary actions are ink outlines; quiet actions are text/rail color.

## Motion policy

Paragraph transitions use 180ms opacity plus an 8px horizontal translation matching travel direction. Drawers use 220ms transform. The progress marker uses 180ms transform. Nothing loops. With `prefers-reduced-motion` or the in-product reduced-motion setting, transforms and smooth scrolling are removed and state changes are instant with a short opacity crossfade only. The decorative hero route is static in all modes.

## Asset plan and provenance

### Generated hero: `assets/src/rail-landscape.png`

- Subject: an abstract reading route formed from paper planes, one coral paragraph slab, a jade rail, and numbered circular stops.
- World/materials: cut paper, graphite grain, subtle letterpress ink, precise generative geometry.
- Light/lens: warm raking desk light, orthographic editorial composition, no photorealistic depth.
- Palette words: oat paper, midnight green ink, oxidized jade, signal coral, restrained amber.
- Negative list: no people, hands, books with legible text, letters, words, logos, UI screenshot, watermark, gradients, neon, medical symbols, branded objects.
- Exact prompt is stored in `assets/src/rail-landscape.json`.
- Generator: OpenAI image model via Azure AI Foundry, deployment `factory-image`; generated 2026-08-28. Original asset for this product. The shipped WebP is optimized to ≤300 KB.
- `public/assets/social-card.png` is a 1200 × 630 crop derived from that original hero asset for Open Graph and Twitter previews; it contains no added text or third-party imagery.

### Authored assets

App icons and small rail marks are hand-authored SVG geometry using the same route/station language. They contain no third-party artwork. The generated-image disclosure appears in the footer.
