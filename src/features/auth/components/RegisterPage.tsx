import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type RefObject,
} from 'react'
import { ArrowLeftIcon, LoaderCircleIcon, UserPlusIcon } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/features/auth/model/AuthProvider'
import { getAuthError } from '@/features/auth/model/authErrors'
import {
  suggestOrganizationSlug,
  validateAdminStep,
  validateOrganizationStep,
  type RegistrationDraft,
  type RegistrationField,
  type RegistrationFieldErrors,
} from '@/features/auth/model/registrationForm'
import type { AuthError } from '@/features/auth/model/types'
import { AuthFormField } from './AuthFormField'
import { AuthShell } from './AuthShell'
import { PasswordField } from './PasswordField'

const initialDraft: RegistrationDraft = {
  organizationName: '',
  organizationSlug: '',
  adminDisplayName: '',
  adminEmail: '',
  adminPassword: '',
  confirmPassword: '',
}

type RegisterPageProps = {
  loginHref?: string
  onSignIn?: () => void
  onSuccess?: () => void
}

export function RegisterPage({
  loginHref = '/login',
  onSignIn,
  onSuccess,
}: RegisterPageProps) {
  const { register } = useAuth()
  const [step, setStep] = useState<1 | 2>(1)
  const [draft, setDraft] = useState(initialDraft)
  const [fieldErrors, setFieldErrors] = useState<RegistrationFieldErrors>({})
  const [requestError, setRequestError] = useState<AuthError | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pendingFocus, setPendingFocus] = useState<RegistrationField | null>(null)
  const slugEditedRef = useRef(false)
  const submittingRef = useRef(false)
  const alertRef = useRef<HTMLDivElement>(null)
  const organizationNameRef = useRef<HTMLInputElement>(null)
  const organizationSlugRef = useRef<HTMLInputElement>(null)
  const adminDisplayNameRef = useRef<HTMLInputElement>(null)
  const adminEmailRef = useRef<HTMLInputElement>(null)
  const adminPasswordRef = useRef<HTMLInputElement>(null)
  const confirmPasswordRef = useRef<HTMLInputElement>(null)

  const fieldRefs: Record<RegistrationField, RefObject<HTMLInputElement | null>> = {
    organizationName: organizationNameRef,
    organizationSlug: organizationSlugRef,
    adminDisplayName: adminDisplayNameRef,
    adminEmail: adminEmailRef,
    adminPassword: adminPasswordRef,
    confirmPassword: confirmPasswordRef,
  }
  const formError = requestError?.field ? null : requestError
  const headingId = `axiom-register-step-${step}-heading`

  useEffect(() => {
    if (!pendingFocus) return
    fieldRefs[pendingFocus].current?.focus()
    setPendingFocus(null)
  }, [pendingFocus, step])

  useEffect(() => {
    if (formError) alertRef.current?.focus()
  }, [formError])

  function errorFor(field: RegistrationField) {
    return fieldErrors[field]
      ?? (requestError?.field === field ? requestError.userMessage : null)
  }

  function clearFieldError(field: RegistrationField, relatedField?: RegistrationField) {
    setFieldErrors((current) => {
      if (!current[field] && (!relatedField || !current[relatedField])) return current
      const next = { ...current }
      delete next[field]
      if (relatedField) delete next[relatedField]
      return next
    })
    setRequestError((current) => (
      current?.field === field || (relatedField && current?.field === relatedField)
        ? null
        : current
    ))
  }

  function handleOrganizationContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = validateOrganizationStep(draft)
    setFieldErrors(errors)
    setRequestError(null)
    const firstError = (['organizationName', 'organizationSlug'] as const)
      .find((field) => Boolean(errors[field]))
    if (firstError) {
      setPendingFocus(firstError)
      return
    }
    setStep(2)
    setPendingFocus('adminDisplayName')
  }

  function handleBack() {
    setRequestError(null)
    setStep(1)
    setPendingFocus('organizationName')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return

    const organizationErrors = validateOrganizationStep(draft)
    if (Object.keys(organizationErrors).length > 0) {
      setFieldErrors(organizationErrors)
      setStep(1)
      setPendingFocus(
        organizationErrors.organizationName ? 'organizationName' : 'organizationSlug',
      )
      return
    }

    const adminErrors = validateAdminStep(draft)
    if (Object.keys(adminErrors).length > 0) {
      setFieldErrors(adminErrors)
      const firstError = (['adminDisplayName', 'adminEmail', 'adminPassword', 'confirmPassword'] as const)
        .find((field) => Boolean(adminErrors[field]))
      setPendingFocus(firstError ?? 'adminDisplayName')
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    setFieldErrors({})
    setRequestError(null)
    try {
      await register({
        organizationName: draft.organizationName,
        organizationSlug: draft.organizationSlug,
        adminDisplayName: draft.adminDisplayName,
        adminEmail: draft.adminEmail,
        adminPassword: draft.adminPassword,
      })
      onSuccess?.()
    } catch (cause) {
      const error = getAuthError(cause, 'registration')
      setRequestError(error)
      if (error.field === 'organizationSlug') {
        setStep(1)
        setPendingFocus('organizationSlug')
      } else if (error.field === 'adminEmail') {
        setStep(2)
        setPendingFocus('adminEmail')
      }
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  function handleSignIn(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }
    if (!onSignIn) return
    event.preventDefault()
    onSignIn()
  }

  return (
    <AuthShell>
      <form
        className="grid gap-5"
        onSubmit={step === 1 ? handleOrganizationContinue : handleSubmit}
        aria-busy={submitting}
        aria-labelledby={headingId}
        noValidate
      >
        <div>
          <h1 id={headingId} className="text-2xl font-semibold tracking-tight">
            {step === 1 ? 'Set up your organization' : 'Create your admin account'}
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {step === 1
              ? 'Create the organization that will own your AXIOM workspace.'
              : 'Add the first administrator for this organization.'}
          </p>
        </div>

        {formError ? (
          <Alert ref={alertRef} tabIndex={-1} variant="destructive">
            <AlertDescription>{formError.userMessage}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-2">
          <p className="text-xs font-medium text-muted-foreground" aria-live="polite">
            Step {step} of 2
          </p>
          <Progress
            aria-label={`Registration progress: step ${step} of 2`}
            value={step * 50}
          />
        </div>

        {step === 1 ? (
          <>
            <AuthFormField
              id="axiom-register-organization-name"
              name="organizationName"
              label="Organization name"
              autoComplete="organization"
              value={draft.organizationName}
              error={errorFor('organizationName')}
              inputRef={organizationNameRef}
              maxLength={255}
              required
              onChange={(event) => {
                const organizationName = event.target.value
                setDraft((current) => ({
                  ...current,
                  organizationName,
                  organizationSlug: slugEditedRef.current
                    ? current.organizationSlug
                    : suggestOrganizationSlug(organizationName),
                }))
                clearFieldError('organizationName')
              }}
            />
            <AuthFormField
              id="axiom-register-organization-slug"
              name="organizationSlug"
              label="Organization slug"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={draft.organizationSlug}
              error={errorFor('organizationSlug')}
              hint="Used in organization identifiers. You can edit this suggestion."
              inputRef={organizationSlugRef}
              maxLength={128}
              required
              onChange={(event) => {
                slugEditedRef.current = true
                setDraft((current) => ({ ...current, organizationSlug: event.target.value }))
                clearFieldError('organizationSlug')
              }}
            />
            <Button className="h-10" type="submit">Continue</Button>
          </>
        ) : (
          <>
            <AuthFormField
              id="axiom-register-admin-name"
              name="adminDisplayName"
              label="Display name"
              autoComplete="name"
              value={draft.adminDisplayName}
              error={errorFor('adminDisplayName')}
              inputRef={adminDisplayNameRef}
              maxLength={255}
              required
              onChange={(event) => {
                setDraft((current) => ({ ...current, adminDisplayName: event.target.value }))
                clearFieldError('adminDisplayName')
              }}
            />
            <AuthFormField
              id="axiom-register-admin-email"
              name="adminEmail"
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={draft.adminEmail}
              error={errorFor('adminEmail')}
              inputRef={adminEmailRef}
              maxLength={320}
              required
              onChange={(event) => {
                setDraft((current) => ({ ...current, adminEmail: event.target.value }))
                clearFieldError('adminEmail')
              }}
            />
            <PasswordField
              id="axiom-register-admin-password"
              name="adminPassword"
              label="Password"
              autoComplete="new-password"
              value={draft.adminPassword}
              error={errorFor('adminPassword')}
              hint="Use at least 8 characters."
              inputRef={adminPasswordRef}
              minLength={8}
              required
              onChange={(event) => {
                setDraft((current) => ({ ...current, adminPassword: event.target.value }))
                clearFieldError('adminPassword', 'confirmPassword')
              }}
            />
            <PasswordField
              id="axiom-register-confirm-password"
              name="confirmPassword"
              label="Confirm password"
              autoComplete="new-password"
              value={draft.confirmPassword}
              error={errorFor('confirmPassword')}
              inputRef={confirmPasswordRef}
              minLength={8}
              required
              onChange={(event) => {
                setDraft((current) => ({ ...current, confirmPassword: event.target.value }))
                clearFieldError('confirmPassword')
              }}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Button className="h-10" type="button" variant="outline" disabled={submitting} onClick={handleBack}>
                <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
                Back
              </Button>
              <Button className="h-10" type="submit" disabled={submitting}>
                {submitting ? (
                  <LoaderCircleIcon
                    className="animate-spin motion-reduce:animate-none"
                    data-icon="inline-start"
                    aria-hidden="true"
                  />
                ) : (
                  <UserPlusIcon data-icon="inline-start" aria-hidden="true" />
                )}
                {submitting ? 'Creating account…' : 'Create account'}
              </Button>
            </div>
            {submitting ? (
              <span className="sr-only" role="status">Creating account…</span>
            ) : null}
          </>
        )}

        <div className="border-t border-border pt-4">
          <a
            className="w-fit rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            href={loginHref}
            onClick={handleSignIn}
          >
            Sign in instead
          </a>
        </div>
      </form>
    </AuthShell>
  )
}
