# AXIOM-FE System-First Redesign

## Objective

Redesign the complete AXIOM frontend as a warm editorial intelligence workspace while preserving every existing mocked workflow, workflow outcome, control label required by tests, and API boundary. The result must support light and dark themes, fully functional mobile layouts, restrained cinematic motion, and a maintainable feature-oriented component structure.

## Product Direction

AXIOM remains an operational intelligence console from the first screen. The welcome state combines a cinematic editorial composition with a usable investigation composer rather than placing a marketing page in front of the product.

The visual character is warm editorial:

- Light mode uses ivory surfaces, carbon ink, muted stone, and cobalt accents.
- Dark mode uses charcoal surfaces, parchment text, softened steel borders, and the same cobalt accent.
- Status colors are semantic and limited to active, waiting, completed, warning, and failed states.
- Cabinet Grotesk is the selected typography stack for headings and interface text.
- Decorative purple washes, excessive rounding, ornamental badges, and generic dashboard styling are excluded.

## Deterministic Design Selection

The `gpt-taste` deterministic selection uses a prompt length of 158 as its seed and establishes the following constraints:

- Hero architecture: Editorial Split.
- Typography: Cabinet Grotesk.
- Component architectures: Inline Typography Images, Feedback/Testimonial Carousel, and Horizontal Accordions.
- GSAP paradigms: Scrubbing Text Reveals and Card Stacking.

These choices apply to the welcome experience without weakening the operational character of chat and ingestion screens.

## Information Architecture

The application uses one stable `AppShell` shared by chat and ingestion. The shell owns theme state, navigation expansion, top-level surface switching, responsive overlay behavior, and the ambient page treatment. Feature workflow state remains in the existing chat and ingestion model hooks.

The shell contains:

- A compact collapsible workspace rail on desktop.
- An expanded overlay rail for conversation history and secondary navigation.
- A compact command bar for surface context, theme control, and workspace actions.
- A shadcn Sheet navigation experience on mobile.
- A main canvas that resizes when the desktop evidence inspector opens.

The app remains a Vite single-page application. Introducing a routing library or changing mocked API contracts is outside this redesign.

## File And Component Boundaries

Application composition moves toward the documented feature-oriented target without restructuring unrelated model or API code.

- `src/app/` owns the root shell, theme provider, responsive navigation state, and application composition.
- `src/features/chat/` owns the welcome experience, investigation stages, chat workflow presentation, and evidence interaction.
- `src/features/ingestion/` owns all ingestion stages and stage-specific presentation.
- `src/shared/components/` owns cross-feature workspace components such as page headers, status treatments, inspector frames, and action bars.
- `src/components/ui/` contains generated shadcn primitives only.
- `src/styles/globals.css` owns Tailwind, shadcn, fonts, semantic theme tokens, and base styles.
- Feature-specific layout styles should be expressed through component classes and focused styles rather than extending the current monolithic prototype stylesheet indefinitely.

Generated shadcn primitives must not contain AXIOM-specific behavior. Feature components compose them using the aliases defined in `components.json`.

## AIDA Welcome Structure

The welcome experience follows AIDA while remaining functional:

### Navigation

The collapsible workspace rail and command bar expose conversations, ingestion, settings, theme selection, and account controls.

### Attention

An editorial split places the primary investigation heading on the left and a live artifact composition on the right. The heading uses `max-w-6xl w-full` and `clamp(3rem, 5vw, 5.5rem)` so it remains within two or three lines at desktop widths. A small inline image appears inside the heading. No stamps, raw statistics, or pill-tag clusters appear in the hero.

The investigation composer is immediately available. Data ingestion is the secondary action.

### Interest

A four-card bento communicates evidence, traceability, human approval, and indexed sources. The desktop grid uses twelve columns and two rows:

- Row one: seven columns plus five columns.
- Row two: four columns plus eight columns.
- Occupied cells: 7 + 5 + 4 + 8 = 24 of 24.
- `grid-flow-dense` is required.

The grid collapses into a complete single-column sequence on mobile.

A horizontal accordion presents the main workflow modes. It must be keyboard accessible and must not depend on hover to expose essential content.

### Desire

Reviewed outcomes appear in a compact feedback carousel using operator or source avatars and outcome commentary rather than marketing testimonials. Supporting narrative text uses the selected scrubbed reveal motion. Artifact cards use the selected stacking motion before resolving into stable readable positions.

### Action

The large investigation composer and direct ingestion action provide the primary conversion point. A restrained utility footer links to documentation, privacy, system status, and keyboard shortcuts.

## Chat And Evidence Workspace

The chat surface is a structured investigation canvas rather than an undifferentiated message feed. Existing states remain unchanged: welcome, pending understanding, editable intent review, processing, final result, and evidence review.

The current review presentation is divided into focused components:

- Understanding state with a stable skeleton and workflow context.
- Intent review using shadcn Field composition, Input, Textarea, explicit validation, reset, and approval controls.
- Processing state with a compact timeline, semantic progress, waiting/running/completed/failed states, and retry feedback.
- Final result with an executive answer, material metrics, flagged issues, evidence coverage, and actions.
- Historical investigations represented as concise artifact summaries.

Existing control labels used by automated tests must remain stable, including `Send`, `Approve & run`, `Reset changes`, `View evidence`, and `Close evidence`.

Evidence remains directly connected to claims:

- Desktop uses a docked inspector with source, artifact, and trace views.
- Opening the inspector shrinks the main canvas and never creates horizontal page overflow.
- Mobile uses a full-height Sheet.
- Citation controls expose selected state, keyboard focus, source name, and locator without relying on color alone.

The composer supports longer prompts, clear disabled and submission states, and persistent follow-up access when appropriate.

## Ingestion Workspace

The complete existing journey is preserved: source, connector catalog, MySQL configuration, upload, pipeline, profile, meaning, and index.

A stable workspace frame contains the stage navigator, page context, repository state, stage content, error feedback, and action bar. Desktop uses a compact horizontal stage navigator. Mobile uses a horizontally scrollable step control with the active stage centered. Navigation continues to respect the existing workflow state-machine rules.

Stage presentation requirements:

- Source selection uses a gapless connector grid with clear upload and database paths.
- Connector forms use shadcn FieldGroup, Field, Input, Select, descriptions, and accessible validation.
- Upload presents a structured queue, file metadata, selection state, and explicit ingestion action.
- Pipeline uses stable task cards, semantic progress, retry handling, and restrained stacking motion.
- Profile uses Table and selectable source summaries without duplicated metadata.
- Meaning uses Tabs or ToggleGroup for concepts and relationships with explicit revision and approval actions.
- Index uses a focused search surface, searchable-source status, and evidence-oriented results.

Desktop can use split layouts where comparison is important. Mobile places primary content first and moves supporting detail into Sheets or collapsible regions. No required action depends on hover.

## Theme System

Theme state supports `light`, `dark`, and initial system preference. A user selection persists locally and is applied before the first meaningful paint where practical to avoid flashing the wrong theme.

Feature components consume semantic tokens only. They must not add manual theme-specific color overrides. The token contract covers:

- Background, foreground, card, popover, muted, border, input, ring, primary, secondary, and accent.
- Sidebar and inspector surfaces.
- Status colors for waiting, active, complete, warning, and failed.
- Ambient grain, grid, shadow, and highlight treatments.

Both themes require visible keyboard focus and sufficient text, control, and status contrast.

## Motion System

GSAP is used only for the selected advanced paradigms:

- Scrubbing Text Reveals: welcome narrative words move from low opacity to full opacity as they enter view.
- Card Stacking: reviewed artifacts and selected pipeline presentations overlap briefly, then resolve into stable readable positions.

The rail, inspector, theme control, accordions, and buttons use short CSS transitions. Animation cannot delay input, alter mocked workflow timing, or conceal state. `prefers-reduced-motion` disables scrubbing and stacking and renders the final state immediately.

GSAP setup must register `ScrollTrigger` and use `@gsap/react` cleanup through scoped contexts. Mobile animation is reduced where stacking would compromise readability or performance.

## Responsive Behavior

The product is fully functional on mobile, tablet, and desktop.

- Desktop keeps the compact rail and supports a docked evidence inspector.
- Tablet may collapse the rail and reduce split-panel widths while preserving stage visibility.
- Mobile uses Sheets for navigation and evidence, stacks ingestion content, and retains every approval and retry action.
- Touch targets are at least 44 pixels where practical.
- Long labels and source names truncate or wrap without escaping controls.
- The root application uses `overflow-x-hidden w-full max-w-full` and off-screen animation is constrained to prevent horizontal scroll.

## Accessibility

- Icon-only controls have accessible names.
- Dialog, Sheet, and Drawer compositions include accessible titles.
- Forms have programmatic labels, descriptions, error messages, `data-invalid`, and `aria-invalid` where applicable.
- Status does not rely on color alone.
- Accordions, carousel controls, selectable cards, and stage navigation are keyboard operable.
- Focus remains visible in both themes.
- Reduced-motion preferences are respected.
- Decorative media has empty alternative text or is hidden from assistive technology.

## Error And Empty States

Existing mock API failures and retries remain behaviorally unchanged. Presentation uses consistent primitives:

- Alert for workflow and form failures.
- Skeleton for initial loading placeholders.
- Empty for unavailable evidence, history, connector results, or search results where applicable.
- Sonner for non-blocking confirmation feedback such as copied citations or saved preferences.
- Disabled controls with explicit progress text for async operations.

Errors stay near the affected workflow and preserve a direct recovery action when one exists.

## Dependencies And shadcn Components

Required runtime additions:

- `gsap`
- `@gsap/react`
- A package or checked-in asset providing Cabinet Grotesk

Expected shadcn additions from the official registry:

- `sheet`
- `dialog`
- `tooltip`
- `dropdown-menu`
- `tabs`
- `toggle-group`
- `avatar`
- `select`
- `sonner`

Existing checked-in primitives should be reused: alert, badge, button, card, checkbox, field, input, progress, scroll-area, separator, skeleton, table, and textarea.

Before installation, the shadcn CLI must be allowed to access its registry. Every added component must be read and checked for correct Base UI composition, current project aliases, Lucide icon usage, accessibility titles, and semantic styling.

## Testing And Verification

The existing eight Vitest tests are the behavioral baseline and currently pass. Implementation follows test-driven development for new behavior and structural refactors.

New tests cover:

- Theme persistence and system preference fallback.
- Desktop rail expansion and mobile navigation.
- Desktop docked evidence and mobile Sheet evidence behavior.
- Accessible horizontal accordion and carousel controls.
- Stable workflow control labels and approval behavior after component migration.
- Reduced-motion fallback where it can be asserted without testing implementation details.

Required verification:

- `npm run test`
- `npm run build`
- Manual inspection of welcome, active chat, evidence, source selection, connector catalog, MySQL form, upload, pipeline, profile, meaning, and index states at desktop and mobile widths when browser execution is available.

## Out Of Scope

- Backend or API contract changes.
- Changes to mocked workflow outcomes or timing unless required to preserve deterministic tests.
- Authentication implementation.
- Introducing a router solely for the redesign.
- Replacing the existing state machines with a different state-management library.
- Marketing pages, pricing pages, or a separate public website.
