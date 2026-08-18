# Model Service design specification

> Scope: `/models` and `src/features/models/`
> Status: Feature specification
> Foundation: [AXIOM Design System](../../design.md)

This specification adds Model Service workflow constraints to the global design system. `design.md` remains authoritative for tokens, typography, spacing, shape, responsive behavior, accessibility, and shared primitives.

## Purpose and permissions

Model Service is the organization control plane for provider connections, registered models, readiness, and workload defaults. It is a separate `/models` surface, not a tab of Organization Administration.

All authenticated users can inspect current assignments and available models. Only `org_admin` can create, edit, test, enable, disable, or delete organization providers, credentials, and models. Server authorization remains authoritative; the UI clearly communicates the available permission state before an action is attempted.

## Page composition

Use the standard operational page container with `gap-6`:

1. **Header card** — `Model Service` title, organization context, readiness badge, Refresh, and the admin-only Add provider action.
2. **Feedback region** — permission, registry-failure, and partial-inventory alerts remain below the header without replacing page context.
3. **Readiness next step** — setup notice appears before view navigation when the selected provider needs action.
4. **Workspace tabs** — `Assignments` and `Providers` use the shared Tabs/Card treatment. These tabs are local views, never global navigation.
5. **Dialogs and setup pipeline** — mutation, credential, assignment review, and destructive confirmation preserve selected-provider context.

## View specifications

### Assignments

Assignments answer “which model handles this capability now?” and are the default view.

- Show a stable capability row or card with current default, provider, readiness, and last-check context.
- Admins open an assignment picker and review outgoing/incoming models before changing the default.
- Members see the same assignment data without mutation affordances.
- Empty capabilities direct an admin to add a model rather than presenting a generic empty state.

### Providers

Providers use a master-detail relationship: selection remains visible while models and connection controls are inspected.

- Provider rows expose name, source, endpoint identity, status, and readiness.
- Credentials are never rendered after entry; the UI may only confirm that a credential is configured.
- Platform providers stay visible but read-only. Credentials and mutations only apply to organization-scoped providers.
- Model rows show capability, model ID, status, default state, and test result. Tests expose pending and failed states on the tested target.

## State and feedback

- Initial loading uses skeletons matching the final header, tabs, and collection geometry.
- Registry failures retain page context and provide Refresh/Retry where possible.
- Partial inventories identify the failed provider loads without invalidating displayed records.
- Test failures remain attached to the provider or model and retain the actionable message.
- Destructive actions require confirmation that names the affected provider/model and its consequence.
- Toasts acknowledge successful mutations; alerts communicate persistent permission or review states.

## Visual, responsive, and accessibility rules

- Compose shared `Card`, `Tabs`, `Badge`, `Alert`, `Dialog`, and `Button`; do not modify primitives or add feature-local colour values.
- Use `text-2xl font-semibold tracking-tight` for the page title; keep panel headings compact.
- Readiness always has a textual label plus icon/badge; color is supporting information only.
- On narrow screens, stack header actions and provider detail content without losing selection context. Only code-like or dense table regions may scroll horizontally inside their own boundary.

## Implementation ownership

- `OrganizationModelRegistry` owns loading, selection, authorization-aware mutations, dialogs, and setup-pipeline state.
- `ModelServiceAssignments` and `ModelServiceProviders` own their views.
- `modelServiceUi` owns readiness vocabulary and semantic presentation mappings.
- API contracts stay in `src/features/models/api`; reusable state remains in `src/features/models/model`.
