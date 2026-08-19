# Data Management design specification

> Scope: `/data`, the Data sources and Ingestion jobs views, and the file inspection workspace
> Status: Feature specification
> Foundation: [AXIOM Design System](../../design.md)

This document defines the Data Management experience for monitoring workspace data, operating data sources, finding files, reviewing ingestion activity, and comparing source documents with parsed results. It extends the shared design system with feature-specific information architecture, states, and interaction rules. It does not redefine global tokens, typography, spacing, radius, elevation, responsive behavior, accessibility, or shared primitive semantics.

## Purpose and boundaries

Data Management is the operational inventory for the active workspace. It should answer four questions without forcing the user to change context:

1. What data is available, processing, ready, or failed?
2. Which source owns the data, and what can be done with that source?
3. Which files or ingestion jobs need attention?
4. Does the parsed result accurately correspond to the source document?

The application shell owns the global workspace switcher. Data Management consumes that active workspace and must not render a second workspace-switching control in its page header. It does not manage workspace creation, membership, or permissions. **Upload data** and source connection actions may enter the Data Ingestion workflow at `/data/ingestion`; this specification does not redefine that staged workflow. Backend authorization and supported connector capabilities remain authoritative.

Data Management is an intelligence console, not a landing page. The first viewport must expose inventory context and usable controls. Do not use a decorative hero, oversized title, editorial image, remote placeholder image, ornamental gradient, glass treatment, or promotional content to establish hierarchy.

## Information architecture

The page keeps the following order across loading, success, partial-failure, and empty states:

1. **Operational header** — page identity, read-only active-workspace context, Upload data, and Refresh.
2. **Persistent feedback** — workspace, inventory, or partial-service errors without removing page context.
3. **Health summary** — All files, Ready, Processing, and Failed counts that also filter the current inventory.
4. **Local views** — Data sources and Ingestion jobs.
5. **Active workspace** — the selected source and its files, the jobs collection, or the file inspection workspace.

The two local views are stable:

| View | Primary job | Primary decision |
| --- | --- | --- |
| **Data sources** | Select a source, understand its scope, and inspect its files. | Which source or file should I operate on? |
| **Ingestion jobs** | Review ingestion activity, progress, failures, and generated files. | Which run needs review or recovery? |

Changing the workspace through the global app-shell switcher reloads Data Management's workspace-scoped data and clears selections that no longer exist. Returning from a file inspector preserves the source, health filter, search, sort, page size, and pagination whenever the selected workspace has not changed.

## Page composition

### Operational header

Use the standard AXIOM product-page container, responsive page padding, and `gap-6` between major regions. The header is a compact operational surface, not a separate visual campaign.

- Use one page title, **Data management**, with concise workspace context beneath or beside it.
- Show the current workspace as read-only context when it helps orient the user. Do not duplicate the global workspace switcher or make the context look interactive.
- A missing workspace is an explicit page state, not a blank label or silent disabled page. Recovery directs the user to the global switcher.
- **Upload data** is the dominant action. **Refresh** is supporting and shows progress without changing width or duplicating the request.
- Disable workspace-scoped actions when no workspace is available and explain the unavailable state in persistent feedback.
- Keep actions aligned and stable while counts or workspace labels load. Long workspace names truncate with a full accessible name or tooltip.

### Health summary

The summary is a compact control group, not a row of decorative dashboard cards.

- Present All files, Ready, Processing, and Failed with a stable label, count, optional concise explanation, and status icon.
- Selecting a metric filters the visible file inventory. The active filter must be communicated structurally and programmatically, not through color alone.
- Use neutral presentation for All files, success semantics for Ready, information semantics for Processing, and destructive semantics for Failed.
- Counts use tabular numerals. Loading skeletons preserve the final geometry.
- Status icons, labels, and help text share the same placement and scale across all four metrics.
- If a metric cannot be applied in the current view, retain its summary meaning without presenting a false interactive affordance.

## Data sources workspace

Data sources use a master-detail relationship on desktop. The source collection remains visible while the selected source and file inventory are inspected.

### Source collection

- Each source item uses the same compact row pattern: connector icon, display name, connector type or supporting context, file count when available, and selected state.
- Source icons come from the shared Lucide/connector icon language and occupy a stable icon container. Do not use photographs or connector-specific card compositions.
- The selected source has a visible boundary or marker in addition to semantic emphasis. Hover, focus, selected, loading, and disabled states retain the same dimensions.
- The collection has one clear add-source affordance. It may open a menu when more than one connector is available.
- A long source list scrolls inside its pane without moving the page header or changing the detail width.
- On compact screens, replace the persistent source pane with a labeled selector or collapsible panel. Preserve the current selection and file count.

### Source detail and actions

The detail header identifies the selected source before presenting files. It may show source name, connector type, last activity, reconnect availability, and file count when those values are supplied.

- **Upload files** or the connector-specific ingestion action is primary.
- **View jobs** and **Reconnect** are supporting actions.
- **Forget settings** is destructive in presentation and separated from routine actions.
- Forgetting settings requires a confirmation dialog that names the saved profile and states the real consequence: saved non-secret reconnect settings are removed from the browser, while the backend data source, files, and ingestion history remain available.
- Actions that are unavailable for a source are omitted or disabled with an explanation; do not render controls that imply an unsupported backend capability.

### File inventory

The file inventory is optimized for both small collections and large paginated sources.

- Keep search, active health filter, sort state, result count, page size, and pagination in one coherent control system.
- Search matches the complete file name. Distinguish an empty source from a valid source with no search/filter matches.
- Preserve stable columns for file name/type, processing status, updated time, size, and contextual actions. Use technical typography only where the value benefits from it.
- The table header remains visible inside a long scrolling collection. Horizontal scrolling, when unavoidable, is confined to the table boundary.
- The complete row is an accessible selection target when inspection is available. Embedded actions such as Download remain independent and must not accidentally open the inspector.
- Keyboard users can focus a row and open it with Enter or Space. The row exposes whether inspection is unavailable and why.
- Long file names truncate without changing row height and expose the complete value through a tooltip or accessible description.
- Sorting has an explicit direction and `aria-sort`. Pagination and page-size changes preserve compatible search and filter state.
- Loading uses table-shaped skeletons. Refreshing existing results keeps the current geometry and communicates busy state without clearing usable context.

## Ingestion jobs workspace

Ingestion jobs remain a local Data Management view rather than becoming a separate dashboard.

- Each row presents source, connector type, status, records or objects processed when available, created/updated time, and a direct action to inspect generated files.
- Waiting, active, completed, failed, and partially available states use the shared status vocabulary and always include a text label.
- Selecting a job reveals its generated files in an in-flow detail region that remains connected to the selected row. Avoid a detached full-height overlay.
- A failed job keeps its actionable error near the job. Do not reduce failures to color or a generic toast.
- Empty jobs and no matching jobs use distinct recovery copy. A first-ingestion action is shown only when the active workspace supports it.

## File inspection workspace

File inspection is a comparison task. It keeps the source and parsed result visible together rather than stacking two long documents or opening a detached overlay.

### Composition and navigation

- A sticky workspace header contains **Back to files**, the complete file identity, processing status, block count, and actions owned by the file.
- On desktop, place **Source preview** on the left and **Parsed content** on the right in one bounded grid. Both panes use the same header height, border treatment, and viewport-aware content height, and scroll independently.
- The divider may resize the panes within useful minimum widths. It must not create page-level horizontal scrolling, collapse either pane, or persist an unusable ratio.
- At tablet and mobile widths, use Source and Parsed content tabs instead of compressing both panes. Switching tabs preserves the active page, block, filters, and viewer position.
- Returning to the inventory restores the prior source and list context.

### Source preview

- Use one stable toolbar for page navigation, zoom out/in, zoom percentage, fit width, reset zoom, and bounding-box visibility where supported.
- Icon-only tools use familiar Lucide icons, accessible names, visible focus, and tooltips where the action is not self-evident.
- The toolbar and file name never overflow their pane. Less frequent actions may move into an overflow menu on compact widths.
- Selecting a parsed block activates its matching source region and navigates to its page. Selecting a source bounding box activates and reveals the corresponding parsed block.
- Preserve page and zoom while moving between blocks in the same file. Reset them to safe defaults when a different file opens.
- Load heavy PDF or spreadsheet viewers only after inspection is requested. Supported preview types, unsupported format, loading, render failure, expired resource, and Retry are distinct states.
- Preview errors do not hide successfully parsed content.

### Parsed content

- Keep Rendered and JSON as direct tabs. Rendered is for visual review of extracted blocks; JSON is for inspecting the structured processing result.
- Provide page and block-type filters above the block collection. Filters preserve the active mode where possible and clearly state when no blocks match.
- Every block uses one compact information order: sequence, block type, page, boxed state, component ID, then content.
- Active, hover, and focus states retain the same block geometry. Active state is structural and programmatically exposed.
- Component IDs and JSON use Geist Mono. Technical values wrap or scroll only within their local region.
- Tables wider than a parsed block scroll horizontally inside that block and never widen the inspector or page.
- JSON is formatted for scanning and has a Copy action with success and failure feedback. Copy does not change the selected block or scroll position.

## Component consistency contract

Data Management must look and behave like adjacent AXIOM operational surfaces. Feature components compose registry-owned primitives; they do not create a parallel component system.

| Element | Required shared pattern | Data Management rule |
| --- | --- | --- |
| Page actions | `Button` | Use existing size and variant props; do not add per-instance height, padding, radius, or shadow recipes. Primary and supporting actions within one header share a control height. |
| Dense actions | `Button` compact/icon variants | Table, source-row, and viewer-toolbar actions use one compact scale per local toolbar. Do not mix default, large, and compact controls in the same group. |
| Panels | `Card` | Use default cards for page regions and `size="sm"` only for intentionally dense repeated items. Equivalent sibling panels use the same size, padding, border, and header height. |
| Navigation | `Tabs`, `TabsList`, `TabsTrigger` | Use line tabs for page-level Data sources/Ingestion jobs navigation and the shared compact tabs for Rendered/JSON or compact Source/Parsed switching. |
| Status | `Badge` plus a feature-owned status mapping | All instances of the same data status use the same label, icon, semantic role, and badge size. |
| Fields | Shared `Input`, menu/select, and field primitives | Search, filters, page size, and source selectors align to the same control height within a toolbar. Placeholder text never replaces an accessible label. |
| Feedback | `Alert`, `Skeleton`, `Dialog`, and toast | Use each primitive according to `design.md`; do not create Data-only warning boxes, loaders, or confirmation shells. |
| Icons | Lucide and existing connector icons | Default inline icons follow the global icon scale. A local control does not enlarge its icon to create emphasis. |

Do not override primitive dimensions merely to match an isolated legacy element. Normalize the surrounding feature composition to the shared primitive scale. Avoid arbitrary radii such as one value for the header, another for metric cards, and another for the inventory container. Pills are reserved for true pills, badges, and capsule controls.

## State, feedback, and destructive behavior

- Initial loading preserves the header, summary, view navigation, source pane, and table/inspector geometry with appropriate skeletons.
- Refresh retains existing usable content, marks the affected region busy, and blocks duplicate refresh requests.
- Workspace, inventory, profile, preview, and parsing errors remain attached to their owning region. A partial service failure does not invalidate data that loaded successfully.
- Success toasts name the affected source, file, profile, or action. Persistent conditions use inline feedback or alerts instead of repeated toasts.
- Empty states distinguish no workspace, no sources, no files, no jobs, no parsed blocks, and no filter results. Each offers only a recovery action that is actually available.
- Destructive dialogs name the affected object, describe the consequence, retain a cancellation path, and prevent duplicate confirmation while pending.
- Status changes and asynchronous updates do not cause cards, rows, toolbars, or actions to resize unexpectedly.

## Visual, responsive, and accessibility rules

- Use semantic token classes from `design.md` and `src/styles/globals.css`. Do not add Data-only hex colors, palette colors, gradients, glows, backdrop treatments, or theme branches.
- Establish hierarchy with standard page spacing, compact typography, thin boundaries, and restrained elevation. Ordinary table rows, metric controls, source rows, and inspector blocks do not need independent shadows.
- Keep one dominant action per local decision area. Selected, focused, disabled, processing, and failed states must remain legible in light and dark themes.
- Page-level headings follow the global type hierarchy; panel headings stay compact. Do not use display-sized text inside the operational workspace.
- Below the content-driven desktop breakpoint, stack regions in task order. Below `md`, controls wrap without reordering the primary action, source selection becomes compact, and the inspector becomes tabbed.
- All source choices, metric filters, rows, tabs, viewer controls, block cards, menus, and dialogs are keyboard operable with visible focus.
- Status and selection use text or structure in addition to color. Counts and icons have accessible context; icon-only controls have accessible names.
- Text scaling and long workspace, source, file, status, and component identifiers must not overflow controls or force page-level horizontal scrolling.

## Implementation ownership

- `src/features/data` owns page composition, workspace-scoped dashboard state, summary filters, source selection, inventories, job detail, dialogs, and the file-inspector entry.
- `src/shared/components/document-results` owns the reusable source/parsed comparison viewer, format adapters, block synchronization, and viewer controls used by Data Management and ingestion review.
- Feature API contracts remain in `src/features/data/api`; feature workflow state and domain types remain in `src/features/data/model`.
- Shared primitives remain in `src/components/ui`. Do not modify them for a Data Management-only visual correction.

## Review checklist

- [ ] The first viewport is operational and contains no hero, decorative imagery, or remote placeholder media.
- [ ] Header, metric controls, source rows, table controls, inspector panes, and statuses use a consistent shared component scale.
- [ ] Data sources, ingestion jobs, and file inspection preserve scope and return context.
- [ ] Search, filter, sort, selection, pagination, and file inspection are keyboard accessible.
- [ ] Source and parsed content remain comparable on desktop and usable as tabs on compact screens.
- [ ] Loading, refresh, empty, no-results, partial-error, unsupported-preview, failure, and destructive states are intentional.
- [ ] No feature-local color, radius, shadow, typography, or primitive override conflicts with `design.md`.
