import { useEffect, useRef, useState, type FormEvent } from 'react'
import { LogInIcon } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/model/AuthProvider'
import { getAuthError } from '@/features/auth/model/authErrors'
import type { AuthError, AuthField } from '@/features/auth/model/types'
import { AuthFormField } from './AuthFormField'
import { AuthShell } from './AuthShell'
import { PasswordField } from './PasswordField'

const defaultEmail = 'admin@axiom.local'
const defaultPassword = 'password'

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState(defaultPassword)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)
  const alertRef = useRef<HTMLDivElement>(null)

  const emailError = error?.field === 'email' ? error.userMessage : null
  const passwordError = error?.field === 'password' ? error.userMessage : null
  const formError = error?.field ? null : error

  useEffect(() => {
    if (formError) alertRef.current?.focus()
  }, [formError])

  function clearErrorFor(field: AuthField) {
    setError((current) => {
      if (!current) return null
      if (current.field === field || current.kind === 'credentials') return null
      return current
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(email.trim().toLowerCase(), password)
    } catch (cause) {
      setError(getAuthError(cause, 'login'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell>
      <form className="grid gap-5" onSubmit={handleSubmit} aria-busy={submitting}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Sign in to AXIOM</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Use your account to access its organizations.
          </p>
        </div>

        {formError ? (
          <Alert ref={alertRef} tabIndex={-1} variant="destructive">
            <AlertDescription>{formError.userMessage}</AlertDescription>
          </Alert>
        ) : null}

        <AuthFormField
          id="axiom-login-email"
          name="email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          error={emailError}
          required
          onChange={(event) => {
            setEmail(event.target.value)
            clearErrorFor('email')
          }}
        />

        <PasswordField
          id="axiom-login-password"
          name="password"
          label="Password"
          autoComplete="current-password"
          value={password}
          error={passwordError}
          minLength={8}
          required
          onChange={(event) => {
            setPassword(event.target.value)
            clearErrorFor('password')
          }}
        />

        <Button className="h-10" disabled={submitting} type="submit">
          <LogInIcon data-icon="inline-start" aria-hidden="true" />
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  )
}
