# AXIOM Design System

> Status: Canonical
> Scope: All AXIOM-FE product interfaces
> Implementation source: `src/styles/globals.css`

This document defines AXIOM's shared visual language and interaction baseline. It is the first reference for UI review and implementation. Feature documents may add constraints for a workflow, but they must not redefine the foundations here.

## 1. How to use this system

Read this document before designing or changing AXIOM-FE UI. Then read the relevant feature specification when one exists:

- [Auth Experience](docs/design/auth.md)
- [Data Management](docs/design/data-management.md)
- [Model Service](docs/design/model-service.md)

When guidance conflicts, this document wins for tokens, typography, spacing, radius, elevation, accessibility, responsive behavior, and shared component semantics. A feature document wins only for feature-specific layout, states, copy, and permissions.

The implementation hierarchy is:

1. Semantic tokens in `src/styles/globals.css`
2. Shared primitives in `src/components/ui`
3. Reusable product patterns
4. Feature composition

Do not modify a shadcn primitive to solve a single screen. Compose or wrap it at the feature layer instead.

## 2. Product character

AXIOM is a technical workspace for building, inspecting, and operating AI systems. Its interface should feel:

- Precise: hierarchy and state are immediately legible.
- Calm: neutral surfaces carry most of the interface; strong color is purposeful.
- Dense but breathable: complex work fits on screen without becoming cramped.
- Trustworthy: system status, permissions, destructive effects, and next actions are explicit.
- Tool-like: controls optimize repeated use without resembling a generic admin template.

The visual signature is warm neutral surfaces, ink-like text, restrained cobalt action color, thin borders, compact controls, and occasional editorial typography for page-level moments. Avoid decorative gradients, glass effects, oversized marketing headings inside the product, excessive rounding, and color used without meaning.

## 3. Color system

### 3.1 Semantic tokens

Components must consume semantic classes backed by `globals.css`. Never add a one-off hex value to a product component.

| Intent | Background or surface | Foreground | Typical use |
| --- | --- | --- | --- |
| App canvas | `bg-background` | `text-foreground` | Page background |
| Raised surface | `bg-card` | `text-card-foreground` | Panels, cards, dialogs |
| Quiet surface | `bg-muted` | `text-muted-foreground` | Secondary groups, metadata |
| Primary action | `bg-primary` | `text-primary-foreground` | Main action, active emphasis |
| Secondary action | `bg-secondary` | `text-secondary-foreground` | Supporting action |
| Contextual emphasis | `bg-accent` | `text-accent-foreground` | Selected or highlighted regions |
| Destructive | `bg-destructive` | `text-destructive-foreground` | Irreversible or dangerous action |
| Success | `bg-success` | `text-success-foreground` | Completed, healthy, available |
| Warning | `bg-warning` | `text-warning-foreground` | Attention or degraded state |
| Information | `bg-info` | `text-info-foreground` | Neutral operational notice |
| Boundary | `border-border` | - | Structural separation |
| Control boundary | `border-input` | - | Inputs and interactive outlines |
| Focus | `ring-ring` | - | Keyboard focus indicator |

Status color supports meaning; it does not replace a label or icon. Use destructive only for failure or destructive intent, not merely to attract attention.

### 3.2 Composition recipes

- Default panel: `bg-card text-card-foreground border-border`.
- Subtle inset: `bg-muted/50 border-border`.
- Selected row: `bg-accent text-accent-foreground` with a visible structural marker when selection matters.
- Primary CTA: `bg-primary text-primary-foreground`.
- Focused control: normal border plus `ring-ring`; do not swap to an arbitrary brand shade.
- Status message: semantic status color plus readable text and an explicit state label.

## 4. Typography

Geist Sans is the product interface family; Geist Mono is reserved for identifiers, code, schema, paths, model names, and aligned numeric data.

Use the following hierarchy as a target, adjusting only when the density of a component requires it:

| Role | Suggested treatment |
| --- | --- |
| Page title | `text-2xl font-semibold tracking-tight` |
| Section title | `text-lg font-semibold tracking-tight` |
| Card title | `text-sm font-semibold` or `text-base font-semibold` |
| Body | `text-sm leading-6` |
| Supporting text | `text-sm text-muted-foreground` |
| Metadata | `text-xs text-muted-foreground` |
| Technical value | `font-mono text-xs` or `font-mono text-sm` |

Use sentence case for headings, labels, buttons, and navigation. Reserve uppercase for very short machine-like metadata, never for paragraphs. A page should normally have one dominant title; do not manufacture hierarchy using many font sizes and weights.

## 5. Spacing and layout

AXIOM uses Tailwind's spacing scale. Prefer the sequence `1, 1.5, 2, 3, 4, 6, 8, 12, 16` and avoid arbitrary pixel spacing.

- `gap-1` to `gap-2`: icon-label and tightly related content.
- `gap-3` to `gap-4`: field groups, list items, and card internals.
- `gap-6` to `gap-8`: sections and major panel groups.
- `gap-12` to `gap-16`: large page regions when space allows.
- Product page padding: `p-4` on compact screens, usually `p-6` on desktop.
- Reading or form width: keep lines and controls constrained; do not stretch them merely because a viewport is wide.

Use CSS grid for page-level relationships and flexbox for one-dimensional alignment. Content determines breakpoints, but `768px` (`md`) is the default transition between compact and desktop composition. Below it, preserve task order and collapse multi-column layouts to one column.

## 6. Shape, border, and elevation

The global `--radius` token controls shared curvature. Prefer:

- `rounded-md` for controls and compact interactive elements.
- `rounded-lg` for cards, panels, popovers, and dialogs.
- `rounded-full` only for avatars, indicators, pills, and true capsule controls.

Borders establish most hierarchy. Use shadows sparingly:

- No shadow for ordinary inline sections and table rows.
- `shadow-sm` for a raised card that needs separation.
- `shadow-md` for floating menus, popovers, and dialogs.
- Avoid stacked heavy shadows and blurred glow effects.

## 7. Icons and motion

Use Lucide icons through the existing icon system. Default inline icons are `size-4`; use `size-3.5` in dense metadata and `size-5` only when the control needs stronger emphasis. An icon-only control must have an accessible name and usually a tooltip.

Motion explains state change. Keep routine transitions between 150 and 250 ms, animate opacity and transform where possible, and respect reduced-motion preferences. Do not animate layout continuously or delay access to primary content.

## 8. Shared component language

### Buttons

- One clearly dominant action per local decision area.
- Use secondary, outline, or ghost treatments for supporting actions.
- Destructive actions require destructive semantics and confirmation proportional to impact.
- A loading button keeps a stable width, communicates progress, and blocks duplicate submission.
- Disabled controls remain legible and must not be the only explanation of why an action is unavailable.

### Fields

- A visible label is the default; placeholder text is an example or hint, never the label.
- Supporting text comes before an error. When invalid, the error replaces or follows the helper without causing a confusing jump.
- Focus uses the shared ring. Error adds destructive semantics without removing the focus indicator.
- Disabled and read-only are distinct: disabled cannot be acted on; read-only may still be selected or copied.

### Feedback

- Use inline feedback when the message belongs to a field or local action.
- Use an alert when a section or workflow needs attention.
- Use a toast for brief confirmation that does not require a decision.
- Use a dialog when the user must decide before continuing.
- Loading, empty, error, and success states must preserve context and provide a next step where one exists.

### Data-dense surfaces

- Keep column meaning stable across states.
- Put bulk actions near selection state, not in an unrelated page region.
- Use monospace only for genuinely technical values.
- Prefer master-detail layouts when users repeatedly scan a collection and inspect one item.
- Preserve filters and selection where returning to the same work context is expected.

## 9. Theme rules

Light and dark themes express the same hierarchy; dark mode is not a different brand. Every new semantic role requires both light and dark values in `globals.css` and must be reviewed for readable text, visible boundaries, focus, hover, selected, disabled, and status states.

Do not use `dark:` variants to invent feature colors. First ask whether the role belongs in the semantic token layer. Images, charts, editors, and third-party canvases may need localized theme adapters, but surrounding product UI still uses shared tokens.

## 10. Accessibility baseline

- All workflows are operable with a keyboard in a logical order.
- Focus is always visible and is not conveyed by color alone.
- Interactive targets should be at least 40 by 40 CSS pixels; use 44 by 44 for primary touch actions where layout permits.
- Text contrast targets WCAG AA: 4.5:1 for normal text and 3:1 for large text and meaningful UI boundaries.
- Every field has an accessible name; errors are programmatically associated with the relevant control.
- Icon-only buttons, status icons, charts, and non-text controls have accessible alternatives.
- Do not rely on placeholder text, hover, gesture, or color alone to communicate required information.
- Respect zoom, text scaling, reduced motion, and content reflow at narrow widths.

## 11. UI copy

Write concise, direct language that names the object and next action.

- Buttons use verbs: “Create project”, “Test connection”, “Save changes”.
- Headings describe the place or task, not generic encouragement.
- Errors say what happened and how to recover when recovery is known.
- Empty states distinguish “nothing exists” from “nothing matches”.
- Keep product terms consistent. Do not alternate between synonyms for the same concept.
- Avoid blame, jokes in failure states, filler descriptions, and unexplained technical codes.

## 12. Do / Don't

| Do | Don't |
| --- | --- |
| Use semantic tokens from `globals.css` | Add a one-off hex or palette color to a product component |
| Compose shared primitives at feature level | Patch a shadcn primitive for one screen |
| Make hierarchy with spacing, type, and borders | Add shadows, gradients, or colored cards everywhere |
| Label status with text and, where useful, an icon | Communicate status with color alone |
| Design loading, empty, error, disabled, and success states | Treat the happy path as the complete UI |
| Collapse layouts around task order below `md` | Shrink a desktop layout until it technically fits |
| Keep one dominant action per decision area | Give several actions identical visual priority |
| Extend this system through semantic roles | Create feature-specific visual foundations |

## 13. Review checklist

- [ ] The feature follows this document and its applicable feature specification.
- [ ] Product components contain no one-off hex colors.
- [ ] New colors, if any, are semantic tokens with light and dark values.
- [ ] Shared primitives were composed rather than changed for one screen.
- [ ] Keyboard, focus, contrast, accessible names, and error associations were checked.
- [ ] Compact and desktop layouts preserve the same task order and capability.
- [ ] Loading, empty, error, disabled, and success states are intentional.
- [ ] Copy is consistent, actionable, and names the affected object.

Update this document when a rule truly applies across AXIOM-FE. Put workflow-specific decisions in a feature document under `docs/design/`.
