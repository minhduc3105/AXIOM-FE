import { PlusIcon } from "lucide-react";
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
  variant?: "card" | "flat";
};

export function DataEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  variant = "card",
}: DataEmptyStateProps) {
  const content = (
    <>
      <CardHeader className="items-center">
        <CardTitle>{title}</CardTitle>
        <CardDescription className="pb-2">{description}</CardDescription>
      </CardHeader>
      {actionLabel && onAction && (
        <CardContent>
          <Button onClick={onAction}>
            <PlusIcon data-icon="inline-start" />
            {actionLabel}
          </Button>
        </CardContent>
      )}
    </>
  );

  return (
    <div className="grid min-h-[340px] place-items-center px-5 py-12 text-center">
      {variant === "flat" ? (
        <div className="w-full text-center">{content}</div>
      ) : (
        <Card className="w-full max-w-md text-center">{content}</Card>
      )}
    </div>
  );
}
