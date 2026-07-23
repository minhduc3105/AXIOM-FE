# AXIOM-FE

AXIOM-FE is the frontend prototype for AXIOM's intelligence and ingestion workflows. It implements the Page 1 screens from the [AXIOM Figma file](https://www.figma.com/design/nNbY7RhnQZgXU1tpkWNVzi/AXIOM?node-id=84-12) as a Vite + React + TypeScript app.

The current app is an interaction-rich prototype with mocked async APIs. The target frontend direction is a feature-oriented Vite React codebase using shadcn/ui primitives, Tailwind CSS theme tokens, and strict placement rules for shared UI.

## Stack

- Vite 8
- React 19
- TypeScript 7
- Vitest + Testing Library
- Tailwind CSS 4 via `@tailwindcss/vite`
- shadcn/ui Base UI with the Nova preset
- Tailwind-style utility classes in React components with shared tokens in `src/styles/globals.css`

## Requirements

Use Node.js 20.19+ or 22.12+.

```bash
node --version
npm --version
```

## Getting Started

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

Build and preview production output:

```bash
npm run build
npm run preview
```

## Scripts

```bash
npm run dev      # Start the Vite dev server
npm run build    # Type-check and build for production
npm run preview  # Preview the production build
npm run test     # Run Vitest tests
```

When linting or formatting scripts are added, keep the README and `package.json` scripts in sync.

## Current Smoke Flows

- Chat: Welcome -> submit question -> Intent & Spec -> Approve -> Planner & Code -> Continue to execute -> Execute & Validate -> Result & Evidence.
- Chat evidence inspector: click `View evidence` to compare the final answer with claim-level source cards in a master-detail review layout. On mobile, evidence opens in a sheet.
- Data ingestion: Choose source -> Browse connectors -> select MySQL -> fill form -> Test connection -> Save connection -> Upload files -> Start ingestion -> Indexed.
- Ingestion review: Pipeline -> Profile -> Meaning -> Index, with mocked delays and review gates.
- Responsive behavior: desktop and tablet layouts are supported; the sidebar collapses into a rail, ingestion grids stack, and inspectors stay connected to the work area without horizontal page scroll.

## Project Structure

```text
AXIOM-FE/
├── index.html
├── package.json
├── tsconfig*.json
├── vite.config.ts
├── README.md
├── skills/
│   └── axiom-fe-design/
│       └── SKILL.md         # AXIOM-FE design guidance for future agents
└── src/
    ├── main.tsx             # Vite React entry point
    ├── App.tsx              # Current app shell and surface switching
    ├── assets.ts            # Figma asset URLs used by the prototype
    ├── components/
    │   └── ui/              # shadcn/ui primitives only; no app components here
    ├── features/
    │   ├── chat/
    │   │   ├── ChatPage.tsx
    │   │   ├── api/
    │   │   └── model/
    │   └── ingestion/
    │       ├── IngestionPage.tsx
    │       ├── api/
    │       ├── components/
    │       ├── data/
    │       └── model/
    ├── shared/
    │   ├── components/      # Cross-feature workspace components
    │   ├── hooks/
    │   └── lib/             # Shared helpers such as cn
    ├── layout/              # Legacy or layout-only shell components
    ├── styles/
    │   └── globals.css      # Tailwind, shadcn, font, and theme token imports
    └── test/
```

## Project Skills

Project-local agent skills live under `skills/<skill-name>/SKILL.md` so the `skills/` folder can contain many skills over time.

Current skills:

- `skills/axiom-fe-design/SKILL.md`: use before AXIOM-FE UI, UX, layout, evidence review, ingestion, shadcn/ui, Tailwind, or screenshot-driven design work.

When adding another skill, use this structure:

```text
skills/
└── <skill-name>/
    ├── SKILL.md
    ├── scripts/      # Optional executable helpers
    ├── references/   # Optional supporting docs
    └── assets/       # Optional templates or resources
```

## Target Structure For New Work

As AXIOM-FE moves toward the shadcn/Tailwind template, use this placement model for new modules and migrations:

```text
src/
├── app/                     # App composition: providers, layouts, routes, root wiring
├── pages/                   # Route-level screens
├── features/                # Domain modules such as chat, ingestion, evidence, reports
│   └── <feature>/
│       ├── components/      # Feature-only components
│       ├── api/             # Feature API calls and request helpers
│       ├── hooks/           # Feature-specific hooks
│       ├── types/           # Feature-specific types
│       └── utils/           # Feature-only utilities
├── shared/                  # Reusable cross-feature code
│   ├── components/          # Shared non-shadcn components
│   ├── api/                 # API client, interceptors, shared API types
│   ├── hooks/               # Generic reusable hooks
│   ├── lib/                 # Generic utilities such as cn
│   └── types/               # Shared TypeScript types
├── components/
│   └── ui/                  # shadcn/ui primitives only; never app-specific UI
├── layout/                  # Layout-only shell pieces that are not feature-owned
├── styles/                  # Tailwind entry and theme tokens after migration
└── main.tsx
```

## Code Placement Guide

- Use `src/features/<feature>/` for workflow-specific screens, components, API mocks, model hooks, and types.
- Keep `src/components/` reserved for `src/components/ui/` shadcn primitives only.
- Put layout-only shell pieces in `src/layout/` when they are not feature-owned.
- Use `src/shared/` for reusable utilities and non-domain code once the app grows beyond the current prototype shell.
- Keep API contracts in `features/*/api` stable so mocks can be replaced with real AXIOM services without rewriting UI components.
- Keep workflow state machines in `features/*/model`; route and layout composition belongs in `src/app/` once routing is introduced.

## shadcn/ui Notes

The project uses this alias shape in `components.json`:

```json
{
  "components": "@/components",
  "hooks": "@/shared/hooks",
  "lib": "@/shared/lib",
  "utils": "@/shared/lib/utils",
  "ui": "@/components/ui"
}
```

Use `@/shared/lib/utils` for shared helpers such as `cn`, and keep generated UI primitives in `src/components/ui/`.

Currently installed primitives:

- `alert`
- `avatar`
- `badge`
- `button`
- `card`
- `checkbox`
- `dialog`
- `dropdown-menu`
- `field`
- `input`
- `label`
- `progress`
- `scroll-area`
- `select`
- `separator`
- `sheet`
- `skeleton`
- `sonner`
- `table`
- `tabs`
- `textarea`
- `toggle`
- `toggle-group`
- `tooltip`

Install more shadcn components from the project root:

```bash
npx shadcn@latest add card input label form button dialog tabs tooltip
```

If the CLI asks about overwriting files, only accept when intentionally replacing an existing primitive.

## Asset Notes

Some icons and avatars currently reference Figma export URLs to preserve prototype fidelity. Figma asset URLs can expire; before production, download required assets into `public/assets` or replace them with an internal CDN path.

## Validate Before Shipping

```bash
npm run build
npm run test
```

Add lint, typecheck, and format validation here when those scripts are introduced.
