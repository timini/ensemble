# Wireframes

Clickable wireframes for the Ensemble AI workflow. This is a standalone Next.js 15 app (React 19, Tailwind CSS 3.4, shadcn/ui-style components), first generated with v0. It is the UX reference for layout and flow; the real UI lives in `packages/component-library` and `packages/app`.

It is not part of the root npm workspaces and its `package.json` still has the v0 default name `my-v0-project`. Install and run it from this folder.

## Pages

| Route | Contents |
|-------|----------|
| `/` | Redirects to `/config` |
| `/config` | Mode selection and API key entry |
| `/ensemble` | Model and summarizer selection |
| `/prompt` | Prompt entry |
| `/review` | Responses, agreement and consensus layout |

Pages are in `app/`. Shared pieces (`ensemble-header`, `footer`, `progress-steps`) are in `components/`, with primitives in `components/ui/`. All data is static; nothing calls a provider.

## Scripts

```bash
npm install
npm run dev          # http://localhost:3000
npm run build
npm run start
npm run lint
npm run screenshot   # needs the dev server running; writes screenshots/*-Page.png
```

`screenshots/` holds the current captures of the four pages.

Colours in the wireframes use raw Tailwind palette classes (for example `bg-blue-600`). The component library uses semantic tokens instead; see [packages/component-library/docs/TAILWIND_DESIGN_SYSTEM.md](../component-library/docs/TAILWIND_DESIGN_SYSTEM.md).
