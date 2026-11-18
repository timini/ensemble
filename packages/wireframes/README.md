# Wireframes

Reference layouts for Ensemble AI after the M4 redesign: a landing page, one workspace screen and its sheets, the benchmarks page and the Pro account page. This is a standalone Next.js 15 app (React 19, Tailwind CSS 3.4). It is the UX source of truth for layout and flow; the real UI lives in `packages/component-library` and `packages/app`.

It uses the component library's visual system directly: `app/globals.css` imports `../component-library/src/styles/tokens.css` and `tailwind.config.ts` uses `../component-library/src/styles/tailwindPreset.ts`. Fonts (Geist, Geist Mono, Instrument Serif) load through `next/font`, as in the app. What you see here is the real palette, type and spacing, not a sketch.

The preset has no runtime imports, and `tsconfig.json` maps `tailwindcss` to this folder's copy, so the preset builds and type-checks with only this folder installed.

All data is static placeholder data (`lib/sample-run.ts`), not a real run; nothing calls a provider. The landing card carries a "Sample data" marker. The app shows a real recorded run in its place. Copy is English only; the app adds French.

It is not part of the root npm workspaces. Install and run it from this folder.

```bash
npm install
npm run dev          # http://localhost:3100
npm run build
npm run lint
npm run screenshot   # needs the dev server; writes screenshots/<page>-<width>-<theme>.png at 375, 768 and 1440 px
```

## Information architecture

| Route | Contents |
|-------|----------|
| `/` | Landing: one sentence, an example run with placeholder data (agreement score, consensus, three answers), three ways in (own keys, local models, Pro), what the score means, how it works. |
| `/workspace` | The one working screen. Composer on top (prompt, inline model chips, consensus method dropdown with calls and cost, a menu with manual answer, summarizer and save as preset). Agreement panel and consensus answer next, then the individual answers: columns from 768 px, swipeable tabs below. History and presets in a left sidebar from 1024 px, in a sheet below. |
| `/benchmarks` | Method and a results table with confidence intervals, with an honest "not run yet" state. |
| `/account` | Pro usage dashboard (FR-041) in the workspace frame: balance with buy buttons, usage by model over 30 days, purchases (refunds show as negative), recent runs. `?state=signedOut\|empty\|ready\|low\|negative`. |
| `/s/[id]` | A shared run, read-only, for a visitor who is not signed in: prompt, model count, share and expiry dates, agreement, consensus, every answer in full, and a way to ask your own question. `?state=missing` shows the expired or deleted link. |
| `/states` | Index of every page and workspace state, for reviewers. |
| `/config`, `/ensemble`, `/prompt`, `/review` | Redirect into the workspace with the matching panel open, as the app will. |

Workspace states are set in the URL so each has a link:

| Param | Values | Shows |
|-------|--------|-------|
| `state` | `new`, `ready`, `running`, `done` (default) | First visit (opens onboarding), empty composer, answers streaming, finished run |
| `sheet` | `onboarding`, `settings`, `manual`, `history`, `share` | Onboarding (keys, local or Pro; one key is enough, OpenRouter reaches every provider), settings (keys, local endpoints, embeddings provider, theme, language), manual answer, history on small screens, share a run as a link |
| `menu` | `models`, `method`, `options` | Model picker, consensus method dropdown, composer options |
| `path` | `keys`, `local` | Which onboarding option is selected |
| `share` | `create`, `ready` (default), `error`, `limit` | Share dialog: what the link shows before it is made, the link with copy and delete, could not create it, too many links |
| `signedIn` | `1` | Signed in: history syncs to the account and the header shows the account. Without it, history stays in this browser |
| `theme` | `light`, `dark` | Forces a theme; otherwise the system setting is used |

Sheets are side panels from 768 px and bottom sheets below.

## Layout

- `app/`: routes.
- `components/ui/`: small primitives (button, sheet, field, logo, model mark, agreement ring).
- `components/landing/`, `components/workspace/`, `components/sheets/`: page sections.
- `lib/params.ts`: reads and builds the workspace URL state.

Screenshots of the final wireframes and the app in the new visual system are in `packages/app/docs/screenshots/m4/`.
