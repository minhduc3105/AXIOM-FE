# AXIOM Frontend Design System

## Shared foundations

- Use the semantic Tailwind tokens exposed by `src/styles/globals.css`: `background`, `foreground`, `card`, `muted`, `primary`, `destructive`, `border`, and `ring`.
- Use shadcn primitives from `src/components/ui`. Feature code composes primitives; it does not modify them or introduce feature-local colour hex values.
- Use the standard radius scale (`rounded-md`, `rounded-lg`, `rounded-xl`) and spacing scale. Avoid arbitrary visual values unless a layout constraint cannot be represented by the scale.
- A standard operational surface is `rounded-xl border bg-card text-card-foreground shadow-sm`.

## Actions

- Primary action: `Button` default variant. One primary action per local decision area.
- Secondary action: `Button variant="outline"`.
- Destructive action: `DropdownMenuItem variant="destructive"` or `Button variant="destructive"` only after an explicit confirmation.
- Icon-only action: `Button size="icon-sm" variant="ghost"` with an accessible `aria-label`.
- Disabled actions must have a nearby explanation of the missing permission or prerequisite.

## Tools

- Compose the Tools page from shared `Card`, `Input`, `Button`, `Badge`, `Alert`, `Dialog`, and `Switch` primitives. Use Tabs or Select only when the task has true view navigation or a compact option set; do not add either solely for visual consistency.
- Keep page and card surfaces to `rounded-xl border bg-card shadow-sm`. Use `rounded-lg` for compact icon containers and `rounded-full` only for pills, compact filters, and status counts. Do not introduce feature-local radii, borders, shadows, or colour hex values.
- `ToolCard` is feature-owned. Every card uses this order: kind icon, display name, technical tool ID, clamped description, kind badge, parameter count, then status control. Clamp the title to two lines and the description to three lines so cards in a row remain equal height.
- Tool state is expressed with the feature-owned `ToolStatusSwitch`, composed from the shared `Switch` and `Badge` primitives. Active uses `status-success`; inactive uses neutral `line`, `soft`, and `muted-foreground` tokens. Card borders stay neutral, with `brand` reserved for keyboard focus or selection.
- Bulk enable/disable is an explicit `Dialog` confirmation. Its copy must state the number of affected tools and that visibility is process-scoped until Methods-Hub restarts.

## Model Service

Model Service uses feature-owned components under `src/features/models/components`:

- `OrganizationModelRegistry` owns data loading, authorization-aware mutations, and view/dialog state.
- `ModelServiceAssignments`, `ModelServiceCatalog`, and `ModelServiceProviders` render their respective workspaces.
- `ModelServiceDialogs` owns provider, credential, model, assignment-picker, and default-review dialogs.
- `modelServiceUi` centralizes Model Service semantic presentation classes and capability/readiness vocabulary.

The page header uses the shared operational surface and semantic status badges. Assignments, Model Catalog, and Providers share the same Tabs/Card treatment. Provider administration remains admin-only; members see only assignments and available models. API authorization remains server-side, while these UI guards communicate available actions.
