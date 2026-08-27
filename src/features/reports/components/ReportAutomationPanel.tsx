import { Clock3Icon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { AutoReportPolicy } from "../api/reportsApi";

type ReportAutomationPanelProps = {
  policy: AutoReportPolicy | null;
  interval: string;
  loading?: boolean;
  saving?: boolean;
  onIntervalChange: (value: string) => void;
  onSave: (enabled: boolean) => void;
};

function formatDate(value: string | null) {
  if (!value) return "Not yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function ReportAutomationPanel({ policy, interval, loading = false, saving = false, onIntervalChange, onSave }: ReportAutomationPanelProps) {
  if (loading && !policy) {
    return <Card className="border-border/80"><CardHeader><Skeleton className="h-5 w-36" /><Skeleton className="h-4 w-52" /></CardHeader><CardContent className="grid gap-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-9 w-28" /></CardContent></Card>;
  }

  return (
    <Card className="border-border/80 bg-card shadow-sm">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Automation</CardTitle>
          <CardDescription className="mt-1">Keep the dashboard aligned with the newest workspace file.</CardDescription>
        </div>
        <Switch checked={policy?.enabled ?? false} disabled={saving || loading} onCheckedChange={(enabled) => onSave(enabled)} aria-label="Enable automatic reports" />
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field orientation="responsive">
            <div className="grid gap-1">
              <FieldLabel htmlFor="report-interval">Check interval</FieldLabel>
              <FieldDescription>Between 60 seconds and 24 hours.</FieldDescription>
            </div>
            <Input id="report-interval" type="number" min="60" max="86400" value={interval} disabled={saving || loading} onChange={(event) => onIntervalChange(event.target.value)} className="sm:max-w-36" />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3Icon aria-hidden="true" />Next check: {formatDate(policy?.next_due_at ?? null)}</p>
            <Button variant="outline" disabled={saving || loading} onClick={() => onSave(policy?.enabled ?? false)}>
              <SaveIcon data-icon="inline-start" />{saving ? "Saving..." : "Save schedule"}
            </Button>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
