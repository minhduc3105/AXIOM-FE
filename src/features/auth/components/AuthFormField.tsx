import type { ComponentProps, ReactNode, Ref } from "react";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/shared/lib/utils";

export type AuthFormFieldProps = Omit<
  ComponentProps<typeof Input>,
  "aria-describedby" | "aria-invalid" | "id" | "ref"
> & {
  id: string;
  label: string;
  labelClassName?: string;
  hint?: string;
  error?: string | null;
  inputRef?: Ref<HTMLInputElement>;
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
};

export function AuthFormField({
  id,
  label,
  labelClassName,
  hint,
  error,
  inputRef,
  startAdornment,
  endAdornment,
  className,
  ...inputProps
}: AuthFormFieldProps) {
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel className={labelClassName} htmlFor={id}>
        {label}
      </FieldLabel>
      <div className="relative">
        <Input
          {...inputProps}
          ref={inputRef}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptionId}
          className={cn(
            "h-10 bg-background",
            startAdornment && "pl-11",
            endAdornment && "pr-11",
            className,
          )}
        />
        {startAdornment ? (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
            {startAdornment}
          </div>
        ) : null}
        {endAdornment ? (
          <div className="absolute inset-y-0 right-0 flex items-center">
            {endAdornment}
          </div>
        ) : null}
      </div>
      {error ? (
        <FieldError id={`${id}-error`}>{error}</FieldError>
      ) : hint ? (
        <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>
      ) : null}
    </Field>
  );
}
