import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon, GaugeIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/shared/lib/utils";
import type { ReportDashboardMetricDirection, ReportDashboardSnapshot } from "../model/types";

type ReportMetricGridProps = {
  dashboard: ReportDashboardSnapshot | null;
};

const directionMeta: Record<
  ReportDashboardMetricDirection,
  { label: string; Icon: typeof ArrowUpRightIcon; className: string }
> = {
  up: {
    label: "Trending up",
    Icon: ArrowUpRightIcon,
    className: "border-status-success/25 bg-status-success/10 text-status-success",
  },
  down: {
    label: "Trending down",
    Icon: ArrowDownRightIcon,
    className: "border-status-warning/25 bg-status-warning/10 text-status-warning",
  },
  flat: {
    label: "Stable",
    Icon: MinusIcon,
    className: "border-border bg-secondary text-secondary-foreground",
  },
};

export function ReportMetricGrid({ dashboard }: ReportMetricGridProps) {
  const metrics = (dashboard?.metrics ?? []).slice(0, 6);

  return (
    <section className="grid gap-3" aria-labelledby="report-metrics-heading">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="report-metrics-heading" className="mt-1 text-xl font-semibold">Key metrics</h2>
        </div>
      </div>
      {!metrics.length ? (
        <Card className="border-dashed bg-card/70">
          <Empty className="min-h-40">
            <EmptyHeader>
              <EmptyMedia variant="icon"><GaugeIcon aria-hidden="true" /></EmptyMedia>
              <EmptyTitle>No metrics extracted</EmptyTitle>
              <EmptyDescription>
                This report did not contain a supported KPI with enough source evidence.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => {
            const direction = metric.delta_direction ? directionMeta[metric.delta_direction] : null;
            const DirectionIcon = direction?.Icon;
            return (
              <Card key={metric.id} size="sm" className="min-w-0 border-border/80 bg-card">
                <CardHeader className="gap-2">
                  <CardDescription className="truncate" title={metric.label}>{metric.label}</CardDescription>
                  <CardTitle className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-2xl tabular-nums">
                    <span>{metric.value}</span>
                    {metric.unit && <span className="text-sm font-normal text-muted-foreground">{metric.unit}</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                  {metric.delta && direction && DirectionIcon ? (
                    <Badge variant="outline" className={cn("w-fit rounded-full", direction.className)}>
                      <DirectionIcon data-icon="inline-start" aria-hidden="true" />
                      <span className="sr-only">{direction.label}: </span>
                      {metric.delta}
                    </Badge>
                  ) : metric.delta ? (
                    <span className="text-sm font-medium text-muted-foreground">{metric.delta}</span>
                  ) : null}
                  {metric.interpretation && <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">{metric.interpretation}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
