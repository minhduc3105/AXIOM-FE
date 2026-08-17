# Organization Administration design specification

> Scope: `/organization`, `/organization/workspaces`, `/organization/members`, and `src/features/auth/components/OrganizationUsersPage.tsx`  
> Status: Feature specification  
> Foundation: [AXIOM Design System](../../design.md)

This document defines the organization-administration workflow. It extends the shared design system with feature-specific information architecture, permissions, and operational states; it does not override global tokens, primitives, spacing, typography, or accessibility rules.

## Purpose and access

Organization Administration is the organization-level control plane for people and workspace access. It is intentionally separate from personal Settings and Model Service:

- **Settings** contains personal account context and interface preferences.
- **Organization Administration** manages organization members and workspace membership.
- **Model Service** manages providers, models, and routing at `/models`; it is never represented as a tab here.

The surface is reached at `/organization`. Navigation only exposes it to `org_admin`. A member who enters the URL directly receives an explicit Access denied page with their organization, role, recovery guidance, and a return-to-workspace action. The server remains authoritative for permissions.

## Information architecture

Organization Administration has exactly three local views. Their order is fixed because it follows the administrator’s mental model from scope to access assignment.

| Tab | Job | Primary decision |
| --- | --- | --- |
| **Overview** | Establish organization context and access model. | Where should I manage members or workspaces? |
| **Workspaces** | Create/select a workspace and assign workspace roles. | Who can access this workspace, and at what role? |
| **Members** | Add people and manage organization roles. | Who is an organization admin or member? |

Do not add a Models tab, provider state, or model-assignment controls. Link or navigate to the separate Model Service surface when that work is required.

## Page composition

Use the same administration-shell structure as Model Service and Tools:

1. **Page container** — `max-w-6xl`, standard responsive page padding, and `gap-6` between major regions.
2. **Header card** — shared `Card` with organization-administration eyebrow, page title, concise purpose, current-user identity, and organization-admin badge.
3. **Persistent feedback** — load failures appear below the header without removing page context.
4. **Line tabs** — shared `TabsList variant="line"` with `Overview`, `Workspaces`, and `Members` only.
5. **Tab content** — shared operational cards with compact headers, card content, empty states, loading skeletons, and scoped actions.

The page title uses `text-2xl font-semibold tracking-tight`. Section titles stay compact (`text-base` or `text-lg`), supporting copy is `text-sm text-muted-foreground`, and identifiers use a technical treatment only where copying/scanning is useful.

## View specifications

### Overview

Overview is an operational summary, not a conceptual introduction. It presents member, workspace, and organization-admin counts; the current administrator list; and an explicit **Needs attention** card. The attention checks cover no members, no active workspaces, and a single-admin organization, with a direct action for each issue. Clear shortcuts lead to **Manage members** and **Manage workspaces**. The standardized organization-context card presents organization name, organization ID, and current role. Counts and administrator data use loading placeholders while data is being read rather than disappearing.

### Workspaces

Workspaces uses a master-detail layout on desktop and stacks on compact widths.

- The collection supports workspace creation, selection, and status scanning. Create and edit flows use labeled fields for name, slug, and description.
- A workspace item shows name, description or slug, default status when applicable, and an explicit status badge: Active, Archived, Updating, or Failed.
- The selected item uses `border-primary bg-primary/5`; unselected items remain neutral with `hover:border-border hover:bg-muted/50`.
- The detail card exposes workspace name, slug, technical ID, status, edit action, archive action, then assigns one workspace role per organization member: no access, viewer, editor, or workspace admin.
- After creation, keep the new workspace selected and show the next operational step: assign a workspace admin, then members. Do not redirect away from this assignment surface.
- Archive is a confirmation-gated, recoverable lifecycle action. Archived workspaces remain visible and their membership controls are read-only.
- A default workspace cannot be archived or deleted until another workspace has been selected as default. Archive requires typing the exact workspace name before confirmation.
- The frontend only exposes a permanent-delete action when the backend supplies both a dependency/data preflight and a permanent-delete endpoint. The current backend only supports archive. Likewise, a default-workspace control is shown only when a backend capability is available; the current default flag is read-only.
- Loading keeps both collection and membership-inspector geometry visible with skeletons.
- Empty state explains the next action: create a workspace, then assign access.

### Members

Members presents people and organization roles.

- Add member opens a labeled dialog for name, work email, temporary password, and organization role.
- Add Member and Create/Edit Workspace use the shared administration-dialog composition. Required field validation runs before mutation; email, workspace name, and slug errors appear beside their affected field. Slugs use lowercase letters, numbers, and single hyphens.
- The member list presents name, email, organization role, and a workspace-access summary. An explicit `No workspace assigned` state makes incomplete access assignment discoverable.
- Search matches name or email. Filters support organization role, a specific workspace, and members with no workspace assignment.
- Organization Admin changes are distinct from workspace role changes in labels and supporting copy: Organization Admin manages the organization; Workspace Admin manages access within one workspace.
- Each member has a Manage access dialog that grants, changes, or revokes their role in every active workspace. Archived workspace access remains visible and read-only.
- Selecting an organization or workspace role never applies it immediately. A confirmation dialog names the affected member, previous role, new role, and permission scope before mutation. It gives an explicit organization-wide warning when granting Organization Admin, and a destructive confirmation treatment when removing Organization Admin or revoking workspace access. The dialog keeps loading and success/failure feedback visible until the admin dismisses it.
- The last Organization Admin cannot be downgraded or removed. A user cannot lower their own organization-admin access unless another Organization Admin remains. These are UX guardrails only; the backend must enforce the same invariants for every mutation.
- The current user may lower their own Organization Admin role only when at least one other Organization Admin remains; otherwise the role is protected and explanatory metadata is shown.
- Member rows preserve avatar, display name, email, and accessible role selector placement across compact and desktop layouts.

## State, feedback, and destructive behavior

- Initial load uses skeletons in the content region; it does not replace the header or tabs.
- Errors use a section alert with a concise recovery message.
- Successful create/change operations use toasts naming the member or workspace affected.
- Saving blocks duplicate mutation and disables the relevant selector or submit control.
- Archive and access-revocation confirmations use the destructive dialog treatment: explicit affected scope, cancellation path, loading state, and a disabled confirm action until required confirmation text is valid.
- Access denied is a full-page state, not a toast or silent redirect.
- No member/workspace deletion action is implied by this surface; if introduced later, it requires an explicit confirmation explaining the affected access.

## Visual, responsive, and accessibility rules

- Compose shared `Card`, `Tabs`, `Badge`, `Alert`, `Dialog`, `Input`, `Textarea`, `Skeleton`, and `Button` primitives. Do not modify primitives for this feature.
- Use semantic classes only: `bg-card`, `text-card-foreground`, `border-border`, `border-input`, `text-muted-foreground`, `text-primary`, `bg-primary/5`, and `bg-muted/50`.
- Operational cards use `rounded-xl border bg-card shadow-sm`; compact selected rows and controls use `rounded-lg`; pills alone use `rounded-full`.
- Use the standard `gap-5` for local panels and `gap-6` for page regions. Card headers use `border-b` when separating actions from dense content.
- All selects, buttons, workspace choices, and dialogs have accessible names and visible keyboard focus. Selected workspace state must be communicated structurally, not by color alone.
- At widths below `md`, stack the workspace master-detail grid without changing action order or hiding role controls.

## Implementation ownership

- `OrganizationUsersPage` owns feature data loading, local tab state, dialogs, workspace selection, and authorization-aware UI guards.
- `src/features/auth/api/authApi.ts` owns organization-user requests.
- `src/features/auth/api/authzApi.ts` owns workspace and workspace-membership requests.
- Shared primitives remain in `src/components/ui`; reusable helpers remain outside this feature only when used by more than one feature.
