# Lucarne Claude Integration Asset Pack

Created: 2026-05-25

This pack contains 10 high-quality Lucarne visuals for Claude to integrate into
the current web app. Each asset has:

- SVG source: `svg/*.svg`
- PNG export: `png/*.png`
- Size: `1600x1000`
- Style: dark premium stadium, glass UI, pitch green, World Cup gold, no emoji

## Asset List

1. `01-dashboard-today-command` — dashboard / TodayPanel
2. `02-predict-groups-board` — predict page, group phase
3. `03-knockout-scenario-tree` — predict page, final bracket
4. `04-live-match-center` — live scores page
5. `05-news-hermes-feed` — news and Hermes feed
6. `06-private-league-room` — private leagues
7. `07-buy-in-gold-seat` — buy-in and payment
8. `08-mobile-quick-bet` — mobile quick bet
9. `09-admin-ops-panel` — admin surfaces
10. `10-wallet-prize-pool` — wallet and prize pool

## Integration Example

```tsx
import Image from "next/image";

<Image
  src="/assets/lucarne/claude-pack-20260525/svg/01-dashboard-today-command.svg"
  alt=""
  width={1600}
  height={1000}
  className="rounded-[12px] border border-white/[0.1]"
/>
```

Prefer SVG for in-app UI. Use PNG for social previews, external documents, or
places where the platform does not support SVG.
