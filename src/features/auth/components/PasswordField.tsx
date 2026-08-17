import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AuthFormField, type AuthFormFieldProps } from './AuthFormField'

export type PasswordFieldProps = Omit<
  AuthFormFieldProps,
  'endAdornment' | 'inputRef' | 'type'
>

export function PasswordField({ className, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
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
