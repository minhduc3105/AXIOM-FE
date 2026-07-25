---
name: axiom-fe-design
description: Use when designing, reviewing, or implementing AXIOM-FE user interface work, including chat workflows, ingestion flows, evidence review, shadcn/ui migration, Tailwind tokens, responsive states, and Figma fidelity.
---

# AXIOM-FE Design

## Overview

AXIOM-FE is a work-focused intelligence interface for investigating data, approving plans, and reviewing evidence. The UI should feel precise, calm, and operational: dense enough for repeated expert use, but clear enough that every stage and decision point is obvious.

## When to Use

Use this skill before changing AXIOM-FE screens, layout, styling, shared components, shadcn primitives, workflow states, evidence views, or responsive behavior.

Do not use this for backend-only AXIOM work or SDK changes without a frontend surface.

## Product Character

- Make AXIOM feel like an intelligence console, not a marketing site.
- Prioritize scanability, stage clarity, review gates, and provenance.
- Keep the visual language restrained: white surfaces, crisp borders, soft slate text, AXIOM blue accents, and purposeful status color.
- Avoid decorative hero sections, oversized marketing cards, gradient ornaments, and one-note purple/blue washes.
- Preserve the Figma prototype's important interaction model: chat in the main work area, review surfaces in stable cards, detail inspection beside the work when comparison matters, ingestion as a staged workspace.

## Design Skill Protocol

- If the user invokes `gpt-taste` or `design-taste-frontend`, read that named skill first, then adapt it to AXIOM's product-workflow context.
- Treat AXIOM as a multi-step product UI, not a landing page. Do not force AIDA, footer CTAs, cinematic hero sections, or portfolio-style composition onto workflow screens.
- Use `design-taste-frontend` mainly for anti-slop checks: brief inference, design-system discipline, shape consistency, copy audit, button contrast, and avoiding generic AI tells.
- Use `gpt-taste` mainly for deliberate layout variation, restrained GSAP/hover motion, and pre-flight rigor. Only use motion when it clarifies hierarchy, sequence, or state transitions.
- Before editing a visually criticized screen, state the UX diagnosis: what decision is unclear, what context is detached, what element has the wrong hierarchy, or what state is missing.

## UX Architecture Rules

- Fix UX before visual polish. If a screen feels bad, first check information architecture, workflow sequence, affordance, hierarchy, and comparison context.
- Prefer master-detail layouts for review tasks. When users need to verify an answer against sources, keep the answer and evidence inspector in the same grid so claim and source can be compared without context switching.
- Do not make evidence, trace, or review details a detached full-height overlay on desktop unless it is a global utility. Product inspectors should usually be sticky inside the workflow region.
- Right-side inspectors may widen the workspace container, but they should not create a hard page split, horizontal scroll, or a blank wall unrelated to the main card.
- Keep close buttons, tabs, and coverage summaries inside the inspector header area. Controls should not float in a screen corner away from the panel they affect.
- For source selection, use decision-card patterns: comparable choices, clear primary/secondary hierarchy, concise feature rows, and one obvious next action per choice. Avoid oversized marketing cards for operational choices.
- For sidebars and rails, decide whether the component is a pane, rail, sheet, or card. Do not mix those metaphors in one component.

## Layout Rules

- Do not create landing pages for product workflows; the first screen should be the actual usable AXIOM surface.
- Keep operational pages full-height and stable. Sidebars, rails, toolbars, inspectors, and stage lists should not jump as content changes.
- Inspectors must stay visually and structurally connected to the content they explain. Use in-flow sticky inspectors for claim/source review, and reserve viewport-docked inspectors for global utilities.
- Use compact typography inside panels. Reserve large headings for page-level titles or the welcome prompt.
- Use stable dimensions for rails, icon buttons, stage pills, counters, review cards, and connector tiles.
- Verify desktop and tablet behavior. The sidebar may collapse into a rail, and ingestion grids should stack gracefully on narrower screens.

## Interaction Rules

- Every workflow stage must expose its status: waiting, active, completed, failed, or ready for review.
- Review actions should open real detail, not explanatory placeholder text.
- Approval buttons should be explicit about the user decision: approve spec, continue to execute, approve meaning, export result.
- Use direct controls: tabs for views, toggles for binary state, inputs for form data, menus for option sets, and icon buttons for tool actions when the icon is familiar.
- Avoid visible in-app instructions that explain the interface. Good labels and state should carry the workflow.

## Component Placement

- Put feature-owned UI in `src/features/<feature>/components`.
- Put feature state machines, workflow hooks, and domain types in `src/features/<feature>/model`.
- Put feature API mocks or clients in `src/features/<feature>/api`.
- Keep `src/components` reserved for `src/components/ui` shadcn primitives only.
- Put layout-only shell pieces in `src/layout` when they are not feature-owned.
- Put shared cross-feature application components in `src/shared/components`.
- Put cross-feature helpers in `src/shared/lib`, with `cn` at `src/shared/lib/utils`.
- Put shared API clients and gateway helpers in `src/shared/lib`; do not keep fetch functions inside shared components.
- Put shared API/domain response types in `src/shared/types`; keep component files free of reusable backend contracts.
- Use `src/app` for providers, routing, layouts, and root app wiring once the app grows beyond the current `src/App.tsx` shell.

## shadcn And Tailwind

- Match the aliases in `components.json`: `@/components`, `@/components/ui`, `@/shared/hooks`, `@/shared/lib`, and `@/shared/lib/utils`.
- Do not edit generated shadcn primitives for feature-specific behavior. Wrap them in feature or shared components.
- Treat files in `src/components/ui` as registry-owned primitives. Do not hand-modify them for screen-specific fixes, including `marker.tsx`.
- When a shadcn primitive such as `Marker` is needed, add it from the registry, then customize usage from feature components with composition and `className` only.
- Keep Tailwind, shadcn, font, and theme token imports in `src/styles/globals.css`.
- Put presentation on components with Tailwind-style utility classes in JSX; do not reintroduce prototype layout stylesheets or component-specific CSS files.
- Keep AXIOM tokens semantic: brand, brand-strong, line, muted, text-secondary, soft, app-bg, status colors.
- After adding shadcn or Tailwind, update `README.md`, `package.json` scripts, and validation commands together.

## Screenshot Feedback Protocol

- Treat screenshots as bug reports. Identify the component, the broken UX relationship, and the smallest set of files that own it.
- Patch utility classes and component structure directly. Do not add `style.css`, `styles.css`, or custom selector styling to solve one-off layout problems.
- Prefer structural fixes over color tweaks: move detached controls into their panel, align related labels with their action, convert overlays into master-detail when comparison is the task, and reduce content that competes for attention.
- After a screenshot-driven fix, run `npm run build`. If the user asked not to create tests, do not add new test files, but still preserve existing accessible names and workflow behavior.

## Accessibility And QA

- Forms need labels, useful error states, and keyboard focus styles.
- Buttons that open inspectors or select entities should expose state with labels or ARIA where needed.
- Do not let text overflow buttons, tiles, cards, or rail items at desktop or tablet widths.
- Before shipping UI changes, run `npm run build` and relevant Vitest tests.
- For visual work, manually inspect chat welcome, chat with inspector open, ingestion source/catalog, MySQL form, pipeline, profile, meaning, and index states.

## Common Mistakes

- Adding a new global component when it belongs to one feature.
- Putting non-primitive application UI into `src/components/ui`.
- Making the interface look like a SaaS landing page instead of an operational tool.
- Applying taste-skill landing-page rules literally to a dashboard or workflow screen.
- Hiding evidence or trace context behind vague summaries.
- Letting the inspector, sidebar, or ingestion progress rail resize unpredictably.
- Making evidence review a detached overlay when the user needs side-by-side claim verification.
- Treating screenshot feedback as color polish when the actual issue is workflow architecture.
- Updating the stack README without changing the actual installed tooling.
