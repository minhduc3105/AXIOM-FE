import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AuthFormField, type AuthFormFieldProps } from './AuthFormField'

export type PasswordFieldProps = Omit<
  AuthFormFieldProps,
  'endAdornment' | 'type'
>

export function PasswordField({ className, inputRef, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const accessibleLabel = visible ? 'Hide password' : 'Show password'

  return (
    <AuthFormField
      {...props}
      inputRef={inputRef}
      type={visible ? 'text' : 'password'}
      className={className}
      endAdornment={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 text-muted-foreground hover:text-foreground"
          aria-label={accessibleLabel}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
        </Button>
      }
    />
  )
}
