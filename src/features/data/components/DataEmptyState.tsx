import { DatabaseZapIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DataEmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function DataEmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: DataEmptyStateProps) {
  return (
    <div className="grid min-h-[340px] place-items-center px-5 py-12 text-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <span className="flex size-12 items-center justify-center rounded-xl border bg-muted text-primary">
            <DatabaseZapIcon className="size-5" />
          </span>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {actionLabel && onAction && (
          <CardContent>
            <Button onClick={onAction}>
              <PlusIcon data-icon="inline-start" />
              {actionLabel}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
