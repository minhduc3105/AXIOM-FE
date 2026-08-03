import { AlertCircleIcon, BookmarkCheckIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SavedProfileControlsProps = {
  name: string;
  saved: boolean;
  dirty: boolean;
  error: string | null;
  disabled?: boolean;
  onNameChange: (name: string) => void;
  onSave: () => void;
};

export function SavedProfileControls({
  name,
  saved,
  dirty,
  error,
  disabled,
  onNameChange,
  onSave,
}: SavedProfileControlsProps) {
  return (
    <section className="rounded-2xl border bg-muted/30 p-4" aria-label="Saved source profile">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BookmarkCheckIcon className="size-4 text-primary" aria-hidden="true" />
            <h3 className="font-semibold">Saved source</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Store reusable connection settings in this browser. Credentials are never saved.
          </p>
        </div>
        <Badge variant={saved && !dirty ? "secondary" : "outline"}>
          {saved ? (dirty ? "Unsaved changes" : "Saved profile") : "Not saved"}
        </Badge>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="grid min-w-0 flex-1 gap-2 text-sm font-medium">
          Source name
          <Input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Finance documents"
            disabled={disabled}
          />
        </label>
        <Button
          type="button"
          variant="outline"
          onClick={onSave}
          disabled={disabled || !name.trim() || (saved && !dirty)}
        >
          {saved ? "Update profile" : "Save profile"}
        </Button>
      </div>
      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertCircleIcon />
          <AlertTitle>Profile not saved</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}
