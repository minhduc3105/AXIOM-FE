import { FileTextIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type MemoryFileEditorProps = {
  id: string;
  fileName: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function MemoryFileEditor({
  id,
  fileName,
  description,
  value,
  onChange,
  disabled = false,
}: MemoryFileEditorProps) {
  const safeValue = value ?? "";
  const lineCount = safeValue ? safeValue.split("\n").length : 0;
  const helperId = `${id}-helper`;

  return (
    <section
      className="flex min-h-[460px] min-w-0 flex-col overflow-hidden rounded-[24px] border border-border/80 bg-card shadow-[0_18px_50px_-34px_rgba(32,36,45,0.45)]"
      aria-labelledby={`${id}-title`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <FileTextIcon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id={`${id}-title`} className="truncate text-sm font-semibold">
              {fileName}
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 p-4 sm:p-5">
        <Field
          className="h-full min-h-0 gap-0"
          data-disabled={disabled || undefined}
        >
          <FieldLabel htmlFor={id} className="sr-only">
            {fileName}
          </FieldLabel>
          <Textarea
            id={id}
            value={safeValue}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            aria-describedby={helperId}
            spellCheck={false}
            className="h-full min-h-[360px] resize-none rounded-[18px] border-border/80 bg-background/70 p-4 font-mono text-[13px] leading-6 shadow-none placeholder:text-muted-foreground/70 focus-visible:bg-background"
            placeholder={`Start writing ${fileName}...`}
          />
          <FieldDescription className="sr-only">
            Edit the raw Markdown content of {fileName}.
          </FieldDescription>
        </Field>
      </div>
    </section>
  );
}
