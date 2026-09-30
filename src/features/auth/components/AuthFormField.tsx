import type { ComponentProps, ReactNode, Ref } from "react";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { cn } from "@/shared/lib/utils";

export type AuthFormFieldProps = Omit<
  ComponentProps<"input">,
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
      <InputGroup className="h-10">
        {startAdornment ? (
          <InputGroupAddon className="self-stretch py-0">
            <InputGroupText>{startAdornment}</InputGroupText>
          </InputGroupAddon>
        ) : null}
        <InputGroupInput
          {...inputProps}
          ref={inputRef}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptionId}
          className={cn("h-full", className)}
        />
        {endAdornment ? (
          <InputGroupAddon align="inline-end" className="self-stretch py-0">
            {endAdornment}
          </InputGroupAddon>
        ) : null}
      </InputGroup>
      {error ? (
        <FieldError id={`${id}-error`}>{error}</FieldError>
      ) : hint ? (
        <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>
      ) : null}
    </Field>
  );
}
