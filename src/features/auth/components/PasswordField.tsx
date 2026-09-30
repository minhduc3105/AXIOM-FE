import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import { InputGroupButton } from "@/components/ui/input-group";
import { AuthFormField, type AuthFormFieldProps } from "./AuthFormField";

export type PasswordFieldProps = Omit<
  AuthFormFieldProps,
  "endAdornment" | "type"
>;

export function PasswordField({
  className,
  inputRef,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const accessibleLabel = visible ? "Hide password" : "Show password";

  return (
    <AuthFormField
      {...props}
      inputRef={inputRef}
      type={visible ? "text" : "password"}
      className={className}
      endAdornment={
        <InputGroupButton
          type="button"
          size="icon-xs"
          className="border-0 bg-transparent text-muted-foreground hover:bg-transparent hover:text-foreground focus-visible:border-0 focus-visible:ring-0"
          aria-label={accessibleLabel}
          aria-pressed={visible}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? (
            <EyeOffIcon aria-hidden="true" />
          ) : (
            <EyeIcon aria-hidden="true" />
          )}
        </InputGroupButton>
      }
    />
  );
}
