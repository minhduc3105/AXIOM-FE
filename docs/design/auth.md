# Auth Experience

> Status: Canonical feature specification
> Parent: [AXIOM Design System](../../design.md)
> Implementation area: `src/features/auth`
> Current capabilities: sign in, organization registration, session restore, session expiry, and sign out

This document extends the AXIOM Design System with rules that are specific to authentication. Read and apply `design.md` first. It remains the only source of truth for product character, tokens, typography, spacing, shape, elevation, motion, shared primitives, theme, responsive foundations, accessibility, and general interaction behavior.

This document defines only Auth layout, workflows, routes, session behavior, API-facing interfaces, error ownership, Auth copy, and approved exceptions. It must not duplicate the parent design system. If a rule becomes useful across features, move it to `design.md` and remove it here.

## 1. Capability boundary

The supported Auth experience currently includes:

- Email and password sign-in.
- Two-step creation of an organization and its first administrator.
- Restoration of a stored AXIOM session.
- Safe handling of expired, invalid, and revoked sessions.
- Sign-out from the authenticated application.

Password recovery and password reset are **blocked by the backend contract**. Do not add recovery routes, forms, mock success states, or API calls until the backend defines request-reset, confirm-reset, token expiry, token reuse, and email-delivery behavior. The future recovery response must not reveal whether an account exists.

Before implementing another Auth capability, such as MFA, SSO, invitations, or email verification, update this document with its approved product and backend contract. Do not infer missing Auth states from a generic provider implementation.

## 2. Auth composition

All unauthenticated routes and session restoration use one `AuthShell`. Route content changes within the shell; each route must not create a separate visual foundation. Auth is an operational entry point to the AXIOM Intelligence Console, not a marketing page.

### 2.1 Shell layout

At `md` and above:

- Use a centered `max-w-5xl` two-column grid: `md:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]`.
- The left region contains restrained, route-independent brand and access context with no CTA.
- The right region contains one focused form panel; form content stays between 360 and 440 px.
- Vertically center only when the complete workflow fits. The shell must remain usable on short viewports.

Below `md`:

- Collapse to one column with the form task first.
- Replace the desktop context region with a compact AXIOM brand header.
- Use `min-h-[100dvh]` and vertical scrolling so browser chrome, a mobile keyboard, or a long error cannot hide the active step or submit action.
- Reuse the same form component, state, field order, and actions as desktop.

The desktop context uses this canonical content:

| Element | Content |
| --- | --- |
| Brand | AXIOM |
| Product label | Intelligence Console |
| Context label | Organization-scoped access |
| Heading | Work within your organization's intelligence workspace. |
| Supporting copy | Your account and active organization determine the data, tools, and workspaces you can access. |

Keep the context visually quieter than the form. Copy may change with product terminology, but it must remain factual, route-independent, and no longer than the canonical version.

### 2.2 Form order

Render applicable content in this order:

1. Compact brand header below `md`.
2. Task heading and one supporting sentence.
3. Session or form-level alert.
4. Step indicator for a multi-step flow.
5. Fields and their messages.
6. Route-specific supporting action.
7. Primary submit action.
8. Link to the related Auth route.
9. Required legal or security note.

Keep one primary task per form panel. Auth feedback must remain close to the form or field that owns it and must not cause disruptive layout movement.

### 2.3 Feature components

| Component | Responsibility | Must not own |
| --- | --- | --- |
| `AuthShell` | Responsive brand/context shell and form panel | Route decisions, API calls, or route-specific validation |
| `AuthFormField` | Compose the shared field primitives with Auth hint/error state | API parsing or cross-field workflow state |
| `PasswordField` | Password input and visibility control as one group | Password policy beyond supplied hint/error data |

These are feature components under `src/features/auth/components`; they compose the shared primitives governed by `design.md`.

### 2.4 Auth field and submission behavior

- Sign-in email uses `type="email"`, `inputMode="email"`, and `autoComplete="email"`.
- Sign-in password uses `autoComplete="current-password"`; registration passwords use `autoComplete="new-password"`.
- The password visibility button changes its accessible name between “Show password” and “Hide password” and preserves value, focus, selection, validation state, autofill, and password-manager behavior.
- Validate after meaningful interaction or submission, not on initial render. Submission focuses the first invalid field in form order.
- Editing the field that owns a server error clears that stale error. Editing an unrelated field must not erase an actionable message.
- While submitting, block duplicate click and Enter paths, preserve input, and use the applicable label: “Signing in…”, “Continuing…”, or “Creating account…”.

All other field, button, focus, loading, and accessibility behavior comes from `design.md`.

## 3. Routing and navigation

### 3.1 Public routes

- `/login` renders sign-in.
- `/register` renders organization registration.
- Password recovery and reset routes do not exist until their backend contract is approved.

Unauthenticated access to a protected route replaces the current history entry with `/login` and carries the original destination in `returnTo`. Links between login and registration preserve the same safe `returnTo`.

Successful sign-in or registration navigates to the safe destination, or `/` when none exists. An authenticated user visiting an Auth route is redirected to `/` with history replacement. Browser Back and Forward must not expose stale Auth forms or create redirect loops.

### 3.2 Safe `returnTo`

Use an encoded application path:

```text
/login?returnTo=%2Fdata%2Fingestion%3Fconnector%3Ds3
```

Accept `returnTo` only when it:

- Begins with exactly one `/` and contains no control character or backslash-based prefix.
- Has no scheme, host, or protocol-relative prefix.
- Resolves against `window.location.origin` to the same origin.
- Does not resolve to `/login` or `/register`.

Preserve an accepted path's query and hash. Reject invalid, empty, external, and Auth-route destinations and fall back to `/`. Decode with `URLSearchParams`; do not repeatedly decode user-controlled values.

### 3.3 Session reason

An expired, revoked, or invalid refresh session uses the allowlisted query value `reason=session-expired` and this alert:

> Your session expired. Sign in again to continue.

Do not place arbitrary backend messages, tokens, email addresses, or reason strings in the URL. Explicit sign-out does not use the expiry reason.

## 4. Sign-in contract

| Element | Content |
| --- | --- |
| Heading | Sign in to AXIOM |
| Supporting copy | Use your account to access its organizations. |
| Primary action | Sign in |
| Related route link | Create an account |

Fields appear in this order: email, then current password with its visibility control.

The project intentionally prefills `admin@axiom.local` and `password` for local workflow convenience. This is an approved Auth exception. Do not render a “Default local account” note, credential callout, or other developer-facing explanation in the UI.

On submit, trim and lowercase email and preserve the password exactly. Invalid credentials produce one form-level message without identifying which credential failed. Preserve the in-page values through recoverable failures, but never persist the password to application storage.

## 5. Organization registration contract

Registration creates an organization and its first administrator, then establishes the session from the successful registration response. It is one `/register` route with persistent form state across two steps.

### 5.1 Step 1 — Organization

| Element | Contract |
| --- | --- |
| Step label | Step 1 of 2 |
| Heading | Set up your organization |
| Organization name | Required; trim; 1–255 characters after trimming |
| Organization slug | Required; editable; trim and lowercase; 1–128 characters after normalization |
| Primary action | Continue |
| Related route link | Sign in instead |

The UI may suggest a slug from the organization name until the user edits the slug. Manual editing permanently stops automatic updates for that form session. Do not enforce a stricter slug character policy until it exists in the backend contract.

### 5.2 Step 2 — Administrator

| Element | Contract |
| --- | --- |
| Step label | Step 2 of 2 |
| Heading | Create your admin account |
| Display name | Required; trim; 1–255 characters after trimming |
| Email | Required; valid email input; trim and lowercase; 3–320 characters |
| Password | Required; at least 8 characters; do not transform |
| Confirm password | Required; exact client-side match; never sent |
| Supporting action | Back |
| Primary action | Create account |

Back returns to Step 1 without clearing either step. A submission error returns to the step that owns the actionable field. A slug conflict focuses Step 1; an email conflict focuses Step 2. Preserve the complete in-page form state while correcting either conflict.

Map the frontend input to `POST /api/v1/orgs/register`:

| Frontend | API field |
| --- | --- |
| `organizationName` | `organization_name` |
| `organizationSlug` | `organization_slug` |
| `adminDisplayName` | `admin_display_name` |
| `adminEmail` | `admin_email` |
| `adminPassword` | `admin_password` |

On success, establish the session with the returned access token, refresh token, and user through the same update path as sign-in. Do not issue a second login request.

## 6. Auth provider and public types

The Auth context must expose this contract while retaining its existing organization and session operations:

```ts
type AuthContextValue = {
  status: 'restoring' | 'authenticated' | 'unauthenticated'
  user: AuthUser | null
  accessToken: string | null
  login(email: string, password: string): Promise<void>
  register(input: RegisterOrganizationInput): Promise<void>
  createOrganization(input: CreateOrganizationInput): Promise<void>
  switchOrganization(organizationId: string): Promise<void>
  logout(): Promise<void>
  refresh(): Promise<boolean>
  restoreError: AuthError | null
  sessionEndReason: 'session-expired' | null
  retryRestore(): Promise<void>
}

type RegisterOrganizationInput = {
  organizationName: string
  organizationSlug: string
  adminDisplayName: string
  adminEmail: string
  adminPassword: string
}
```

`register` resolves only after it has established the authenticated session. UI components do not write session storage or interpret raw API responses.

## 7. Error contract

Normalize API and transport failures before they reach form components:

```ts
type AuthErrorKind =
  | 'field'
  | 'credentials'
  | 'account'
  | 'session'
  | 'network'
  | 'service'
  | 'unknown'

type AuthField =
  | 'email'
  | 'password'
  | 'organizationName'
  | 'organizationSlug'
  | 'adminDisplayName'
  | 'adminEmail'
  | 'adminPassword'
  | 'confirmPassword'
  | null

type AuthError = {
  kind: AuthErrorKind
  code: string | null
  status: number | null
  field: AuthField
  userMessage: string
}
```

Parse both Auth error envelopes:

```json
{ "code": "USER_EMAIL_EXISTS", "message": "User email already exists." }
```

```json
{ "detail": { "code": "USER_EMAIL_EXISTS", "message": "User email already exists." } }
```

Malformed JSON, string details, HTML, empty bodies, and unknown shapes use safe status-based fallback copy. Never display raw server messages automatically.

| Condition | Owner | Required result |
| --- | --- | --- |
| `ORGANIZATION_SLUG_EXISTS` | Organization slug | “This organization slug is already in use.” Return to and focus Step 1. |
| `USER_EMAIL_EXISTS` | Admin email | “An account already uses this email.” Return to and focus Step 2. |
| `ORGANIZATION_REGISTRATION_CONFLICT` | Registration form | Ask the user to review slug and email without exposing raw details. |
| `INVALID_CREDENTIALS` or login `401` | Sign-in form | “We couldn't sign you in. Check your details and try again.” |
| `USER_DISABLED` | Sign-in form | “This account is unavailable. Contact your organization administrator.” |
| `TOKEN_EXPIRED`, `SESSION_REVOKED`, `INVALID_REFRESH_TOKEN`, or restore-time `INVALID_TOKEN` | Session | Clear the unusable session and use the session-expired route state. |
| Request cannot reach Auth | Form alert | “We couldn't reach AXIOM Auth. Check your connection and try again.” |
| `502`, `503`, or `504` | Form alert | “AXIOM Auth is temporarily unavailable. Try again in a moment.” |
| Other `5xx` or unknown failure | Form alert | “Something went wrong. Try again in a moment.” |

Field errors render at their owning field. Route-wide, session, network, and service failures render in the form alert. A submitted field error receives focus; otherwise the newly rendered alert is announced and focused. Never present connectivity or service failure as invalid credentials.

## 8. Session lifecycle

### 8.1 Restoration

- While `status === 'restoring'`, use `AuthShell` with the status “Restoring your AXIOM session…” and a progress indicator.
- Do not render the application before restoration succeeds or login before restoration confirms no usable session. This prevents an app/login flash.
- Network or service failure retains the stored session, exposes the normalized `restoreError`, and remains in the AuthShell with `Retry` and `Sign in instead`. The latter performs explicit local logout; only it discards the stored session.
- `retryRestore` repeats the restoration check without requiring the user to re-enter credentials.

### 8.2 Expiry and revocation

- When refresh proves a session expired, invalid, or revoked, clear the unusable local session once and redirect to login with `reason=session-expired` and the current safe protected path as `returnTo`.
- Coalesce concurrent unauthorized responses so they do not trigger repeated refreshes or redirects.
- A network or service failure during refresh returns the original unauthorized response but does not clear the stored session or redirect to login.
- Successful sign-in consumes the reason by continuing to the safe destination.

## 9. Auth-specific verification

Every Auth implementation or material change must pass the global review in `design.md` plus these Auth scenarios:

| Area | Required scenarios |
| --- | --- |
| Navigation | Direct `/login` and `/register`; protected redirect; safe, invalid, and external `returnTo`; authenticated Auth-route redirect; Back and Forward without loops |
| Sign-in | Approved prefill without credential note; password toggle; invalid credentials; disabled account; network failure; service failure; duplicate submission; successful return |
| Registration | Both steps; suggested then manually edited slug; validation; Back persistence; password mismatch; slug conflict; email conflict; one registration request; session established on success |
| Session | No stored session; successful restore; expired or revoked refresh; unavailable service during restore; concurrent unauthorized responses; no Auth/app flash |
| Auth reflow | Complete login and both registration steps at 360, 768, 1280, and 1440 px; 200% zoom; short viewport; mobile keyboard; long error copy |
| Auth interaction | Enter submits once; Back preserves state; password toggle preserves value/selection; autofill and password-manager input remain usable; step and loading status are announced |

Automated tests cover route parsing and navigation, `returnTo` validation, error normalization and mapping, registration normalization, step persistence, duplicate submission, and session establishment. Manual review covers the complete Auth flows, mobile keyboard, password managers, short viewports, and the parent design system's visual and accessibility requirements.

## 10. Maintaining this specification

Update this document before implementation when a change affects an Auth capability, route, workflow step, field or validation contract, session lifecycle, public Auth interface, error envelope/code, security disclosure, or user-facing recovery behavior.

Do not update this document for backend refactors, storage changes, query optimizations, logging changes, or other internal work that leaves the frontend contract and user experience unchanged.

When an Auth-specific rule becomes a reusable AXIOM-FE rule, move it to `design.md` and replace it here with inheritance. When the backend introduces a new Auth contract, document only the resulting Auth behavior here; do not copy backend implementation details.
