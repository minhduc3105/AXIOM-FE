# Auth Experience

> Status: Feature specification
> Parent: [AXIOM Design System](../../design.md)
> Scope: Sign in, sign up, password recovery, password reset, and related authentication states

This document defines the Auth Experience without creating a second visual system. All foundations, tokens, accessibility rules, and shared component semantics are inherited from the parent document. If guidance conflicts, the parent design system wins.

## 1. Experience principles

- Make the current task and next action obvious within one glance.
- Keep the form calm and short; explain only what helps completion or recovery.
- Preserve user input through recoverable failures whenever it is safe to do so.
- Never reveal whether an account exists when doing so would weaken security.
- Treat authentication as part of the product, not a detached marketing page.

## 2. Auth shell

### Desktop at `md` and above

- Use a two-column grid inside a centered `max-w-5xl` container.
- Recommended grid: `md:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]`.
- The context column communicates AXIOM's product character with restrained product copy or a real product cue.
- The form column contains one focused card or panel.
- Keep the primary form within approximately 440 px; do not stretch fields across the page.

### Compact below `md`

- Collapse to one column with the form first.
- Replace the large context panel with a compact brand header or remove it when it adds no task value.
- Use `min-h-[100dvh]` and allow vertical scrolling; do not vertically center content that can be clipped by the keyboard.
- Use `p-4`, increasing to `p-6` when the viewport permits.

The same route and form component serve both layouts. Do not build separate mobile and desktop forms.

## 3. Form anatomy

Use this order when a step contains the relevant element:

1. Product or organization context
2. Task heading
3. Short supporting copy
4. Form-level alert
5. Fields
6. Password recovery link, when relevant
7. Primary submit action
8. Alternate authentication action
9. Link to the related auth route
10. Legal or security note, when required

Keep one primary task per card. Do not place sign-in and sign-up forms side by side.

## 4. Field contract

Auth fields are composed from the shared Label, Input, and message primitives. A reusable Auth field should accept `id`, `name`, visible `label`, `type`, autocomplete purpose, optional `hint`, optional `error`, and the required interaction states.

- Connect label, helper, and error using stable IDs, `htmlFor`, `aria-describedby`, and `aria-invalid`.
- Email uses `type="email"`, `inputMode="email"`, and the correct `autocomplete` value.
- Password uses `current-password` or `new-password` according to the route.
- Required state is conveyed programmatically and visibly when ambiguity is possible.
- Validate after meaningful interaction or submission, not on initial render.
- Clear stale field errors as soon as corrected validity is known.
- Preserve valid values after a failed request.

## 5. Password field

Password input and visibility toggle form one control group.

- The toggle is a real button with `type="button"`.
- Its accessible name changes between “Show password” and “Hide password”.
- Toggling preserves value, focus, selection, and validation state.
- The button has a visible focus state and at least a 40 px target.
- Strength guidance appears only where it helps create or reset a password.
- Never prevent pasting from a password manager.

## 6. Actions

- Submit is the only primary action in the form.
- Route and recovery links do not compete with the primary action.
- During submission, retain button width, show progress and an active verb, and block duplicates.
- Do not disable submit merely because untouched fields are empty when the reason would be unclear.
- Authentication provider buttons use consistent height and hierarchy.

| Action          | Loading label       |
| --------------- | ------------------- |
| Sign in         | Signing in…         |
| Create account  | Creating account…   |
| Send reset link | Sending link…       |
| Reset password  | Resetting password… |

## 7. Alerts and recovery

Use a form alert for server, session, or route-wide failures. Use a field error when the user can correct a specific value. An alert includes a concise message, semantic icon when useful, and a recovery instruction or action when available.

After failed submission, announce the form alert and focus it when the error is not otherwise exposed. Never show stack traces, provider internals, or account-enumeration clues.

Examples:

- “We couldn't sign you in. Check your details and try again.”
- “This link has expired. Request a new password reset link.”
- “Something went wrong. Try again in a moment.”

## 8. Control state matrix

| State     | Visual treatment                             | Behavior                      | Accessibility                          |
| --------- | -------------------------------------------- | ----------------------------- | -------------------------------------- |
| Default   | `bg-background`, `border-input`              | Accepts input                 | Visible label and correct autocomplete |
| Hover     | Subtle boundary emphasis                     | No layout movement            | Information is not hover-only          |
| Focus     | Shared `ring-ring`                           | Keyboard input continues      | Focus is clearly visible               |
| Filled    | Same structure as default                    | Value remains editable        | Value is exposed normally              |
| Invalid   | Destructive boundary/message plus focus ring | Can be corrected              | `aria-invalid`; associated error       |
| Disabled  | Muted but readable                           | Cannot receive input or focus | Native disabled semantics              |
| Read-only | Quiet surface, normal legibility             | Can be selected or copied     | `readOnly`, not `disabled`             |
| Loading   | Stable geometry                              | Duplicate action blocked      | Progress is announced                  |

Color never carries the state alone.

## 9. Form lifecycle matrix

| Lifecycle       | Fields                       | Primary action          | Message and focus                                   |
| --------------- | ---------------------------- | ----------------------- | --------------------------------------------------- |
| Initial         | Empty or safely prefilled    | Available               | First incomplete field when appropriate             |
| Editing         | Preserve input               | Available               | Clear stale server error after meaningful edit      |
| Client invalid  | Preserve input               | Available for retry     | Field messages; focus first invalid field on submit |
| Submitting      | Preserve values              | Loading; repeat blocked | Keep focus stable and announce progress             |
| Server invalid  | Preserve non-sensitive input | Available for retry     | Safe error; focus alert or first actionable error   |
| Success         | No longer editable           | Prevent repeat          | Move focus to destination heading or confirmation   |
| Network failure | Preserve input               | Available for retry     | Explain temporary failure; focus alert or retry     |

## 10. Route copy

| Route           | Heading                   | Primary action  | Related link      |
| --------------- | ------------------------- | --------------- | ----------------- |
| Sign in         | Sign in to AXIOM          | Sign in         | Create an account |
| Sign up         | Create your AXIOM account | Create account  | Sign in instead   |
| Forgot password | Reset your password       | Send reset link | Back to sign in   |
| Reset password  | Choose a new password     | Reset password  | Back to sign in   |

For password recovery, prefer a neutral response such as “If an account matches that email, we'll send reset instructions.”

## 11. Theme and responsive checks

- Auth surfaces use only semantic tokens from `globals.css`.
- No auth component contains a one-off hex value or raw palette color for product semantics.
- The context panel remains quieter than the form in both themes.
- Mobile keyboard, browser autofill, long errors, and 200% zoom do not hide submit.
- The two-column layout becomes one column below 768 px without changing task order.

## 12. Auth review checklist

- [ ] The route uses the shared Auth shell and one-column compact composition.
- [ ] Labels, descriptions, errors, autocomplete, and password controls are associated correctly.
- [ ] Focus, invalid, disabled, read-only, loading, and success match the matrices.
- [ ] Submission cannot run twice and input survives recoverable failure.
- [ ] Error copy is safe, actionable, and does not reveal account existence.
- [ ] Keyboard, password manager, zoom, light theme, and dark theme were checked.
- [ ] Auth components use semantic tokens and do not patch shadcn primitives for route needs.
