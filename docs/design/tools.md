# Tools design specification

> Scope: `/tools`, `/tools/:toolName`, and `src/features/tools/`
> Status: Feature specification
> Foundation: [AXIOM Design System](../../design.md)

This document specifies the Tools workflow. It adds page-specific behavior to the shared design system; it never overrides shared tokens, primitives, spacing, typography, or accessibility rules.

## Purpose and scope

Tools is the live Methods-Hub catalog for the active process. It answers: which tools are available to the current organization/workspace, what a tool accepts and does, and whether it is enabled for the current Methods-Hub process.

Availability is process-scoped: enabling or disabling a tool affects the current Methods-Hub process and resets on restart. The interface must say this when visibility is changed or reviewed; it must not present tool availability as a durable organization policy or a health signal.

## Routes and page hierarchy

| Route | Page | Primary job |
| --- | --- | --- |
| `/tools` | Tools catalog | Discover, filter, inspect, and change process-scoped availability. |
| `/tools/:toolName` | Tool detail | Review one tool's metadata and input contract. |

The catalog preserves filter, sort, and view state when a user opens a detail page and returns. Detail always provides an explicit Back to Tools action.

## Tools catalog (`/tools`)

### Composition

1. **Header** — standard operational header: `Tools` title, live-catalog context, refresh action, and organization/workspace scope.
2. **Controls** — search, status/type filters, sort/view controls, active-filter summary, and bulk actions when they have a clear outcome.
3. **Collection** — compact grid or list of feature-owned ToolCards.
4. **Feedback** — errors, empty catalog, and no-results states stay in the collection region so controls and scope remain visible.
5. **Bulk confirmation** — dialog states the exact affected count and process-scoped consequence before applying.

### ToolCard contract

Cards use this scan order:

1. Tool-kind icon
2. Display name
3. Technical tool ID
4. Clamped description
5. Kind badge and parameter count
6. Availability control

Titles clamp to two lines and descriptions to three lines. Cards remain neutral; primary color is reserved for focus and selected state. `ToolStatusSwitch` is feature-owned but composes shared Switch and Badge primitives.

### Catalog states

- Loading uses skeleton cards matching the selected view geometry.
- Methods-Hub failures preserve controls and explain a recovery action.
- “No registered tools” is distinct from “No tools match the filters”.
- Toggles and bulk actions prevent duplicate updates, expose progress, and restore the prior state on failure.
- Active/disabled labels describe availability only, not service health.

## Tool detail (`/tools/:toolName`)

### Composition

1. **Back action** — returns to the catalog with its preserved state.
2. **Tool header card** — kind icon, display name, technical ID, kind, description, scope, live-catalog label, and availability toggle.
3. **Process-scope alert** — explains visibility lifetime before operational metadata.
4. **Overview card** — kind, status, availability/workspace scope, organization scope, implementation identity, and supported datasets when supplied.
5. **Input parameters card** — Name, Type, Required, Default value, and Description table.

Technical identifiers and default values use monospace. Long values wrap or scroll inside their local cell/region; they never widen the page. A tool with no parameters keeps the parameters card and shows a scoped empty state.

### Detail states

- Skeletons mirror header and content-card geometry.
- Not found, Methods-Hub unavailable, and generic load failures use different recovery copy.
- Availability update failure appears next to the switch with the restored state and retry action.
- Detail must not silently change availability after a refresh or navigation.

## Visual, responsive, and accessibility rules

- Use standard page container, `gap-6` rhythm, `rounded-xl border bg-card shadow-sm` cards, `rounded-lg` inner groups, and semantic token boundaries from `design.md`.
- Use semantic status tokens only; never add a Tools-only colour value.
- Search/filter controls need visible labels or accessible names. Icon-only controls need `aria-label` and a tooltip when necessary.
- List/grid selection and availability controls expose current state programmatically.
- At tablet width controls wrap with search before filters/actions. On mobile cards stack; parameter tables scroll only within their own region.

## Implementation ownership

- `ToolsPage` owns catalog composition, filters, bulk workflow, and view state.
- `ToolDetailPage` owns detail composition and process-scoped availability feedback.
- `ToolCard`, `ToolCatalogSkeleton`, `ToolKindIcon`, and `ToolStatusSwitch` own feature presentation.
- `ToolsProvider`, `useToolCatalog`, and `useToolDetail` own state and request lifecycle.
- `src/features/tools/api` owns Methods-Hub contracts and requests.
