# Lucarne Asset Pack

Created on 2026-05-22 for the Lucarne web app.

## Logo

- `logo/lucarne-mark-pro.svg` — square app icon / favicon source.
- `logo/lucarne-logo-horizontal.svg` — wide brand lockup for landing, docs, decks.
- `logo/lucarne-badge-gold.svg` — World Cup / trophy mode badge.

## Icons

- `icons/trophy-gold.svg`
- `icons/orbit-ball.svg`
- `icons/stadium-beam.svg`
- `icons/bracket-network.svg`
- `icons/bet-ticket.svg`
- `icons/live-console.svg`

## Images

- `images/dashboard-command-center.svg` — wide hero/dashboard visual, 16:9.
- `images/stadium-night-poster.svg` — atmospheric stadium poster, 16:9.
- `images/social-preview.svg` — Open Graph/social preview, 1200x630.
- `images/empty-state-stadium.svg` — premium empty-state illustration, 3:2.

## PNG Exports

The `exports/` folder contains PNG renders of every SVG asset for platforms
that do not accept SVG.

- Logos: 512px, 1024px, and 1600x420.
- Icons: 256px.
- Images: 1200x630, 1200x800, and 1920x1080.

## Usage

Use with Next static paths, for example:

```tsx
<Image
  src="/assets/lucarne/images/dashboard-command-center.svg"
  alt=""
  width={1920}
  height={1080}
/>
```

The assets are SVG, so they stay crisp at high resolution and can be converted to PNG/WebP when needed for external platforms.
