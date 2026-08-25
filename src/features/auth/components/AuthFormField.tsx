import type { ComponentProps, ReactNode, Ref } from 'react'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/shared/lib/utils'

export type AuthFormFieldProps = Omit<
  ComponentProps<typeof Input>,
  'aria-describedby' | 'aria-invalid' | 'id' | 'ref'
> & {
  id: string
  label: string
  labelClassName?: string
  hint?: string
  error?: string | null
  inputRef?: Ref<HTMLInputElement>
  endAdornment?: ReactNode
}

export function AuthFormField({
  id,
  label,
  labelClassName,
  hint,
  error,
  inputRef,
  endAdornment,
  className,
  ...inputProps
}: AuthFormFieldProps) {
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel className={labelClassName} htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Input
          {...inputProps}
          ref={inputRef}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptionId}
          className={cn('h-10 bg-background', endAdornment && 'pr-11', className)}
        />
        {endAdornment ? (
          <div className="absolute inset-y-0 right-0 flex items-center">{endAdornment}</div>
        ) : null}
      </div>
      {error ? (
        <FieldError id={`${id}-error`}>{error}</FieldError>
      ) : hint ? (
        <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>
      ) : null}
    </Field>
  )
}
