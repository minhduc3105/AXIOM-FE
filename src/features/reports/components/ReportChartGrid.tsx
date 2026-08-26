import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3Icon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { ReportDashboardSnapshot } from "../model/types";

type ReportChartGridProps = {
  dashboard: ReportDashboardSnapshot | null;
};

function isRenderableChart(chart: ReportDashboardSnapshot["charts"][number]) {
  return chart.points.length > 0 && chart.points.every(
    (point) => point.label.trim().length > 0 && Number.isFinite(point.value),
  );
}

const chartConfig: ChartConfig = {
  value: {
    label: "Value",
    color: "var(--chart-1)",
  },
};

export function ReportChartGrid({ dashboard }: ReportChartGridProps) {
  const charts = dashboard?.charts ?? [];
  const validCharts = charts.filter(isRenderableChart).slice(0, 3);

  return (
    <section className="grid gap-3" aria-labelledby="report-charts-heading">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="report-charts-heading" className="mt-1 text-xl font-semibold">Charts</h2>
        </div>
      </div>
      {!validCharts.length ? (
        <Card className="border-dashed bg-card/70">
          <Empty className="min-h-40">
            <EmptyHeader>
              <EmptyMedia variant="icon"><BarChart3Icon aria-hidden="true" /></EmptyMedia>
              <EmptyTitle>No supported chart yet</EmptyTitle>
              <EmptyDescription>
                Charts appear when the latest report includes finite, evidence-backed data points.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {validCharts.map((chart) => (
            <ChartCard key={chart.id} chart={chart} />
          ))}
        </div>
      )}
    </section>
  );
}

function ChartCard({ chart }: { chart: ReportDashboardSnapshot["charts"][number] }) {
  const data = chart.points.map((point) => ({
    label: point.label,
    value: point.value,
  }));

  return (
    <Card className="min-w-0 border-border/80 bg-card">
      <CardHeader>
        <CardTitle className="truncate" title={chart.title}>{chart.title}</CardTitle>
        {chart.description && <CardDescription className="line-clamp-2">{chart.description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-3">
        <ChartContainer config={chartConfig} className="h-56 w-full min-w-0">
          {chart.type === "line" ? (
            <LineChart accessibilityLayer data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis width={36} tickLine={false} axisLine={false} tickMargin={6} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Line dataKey="value" type="monotone" stroke="var(--color-value)" strokeWidth={2.5} dot={{ fill: "var(--color-value)" }} />
            </LineChart>
          ) : chart.type === "bar" ? (
            <BarChart accessibilityLayer data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis width={36} tickLine={false} axisLine={false} tickMargin={6} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={5} />
            </BarChart>
          ) : (
            <PieChart accessibilityLayer>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie data={data} dataKey="value" nameKey="label" innerRadius="55%" outerRadius="78%" paddingAngle={3} strokeWidth={0}>
                {data.map((point, index) => (
                  <Cell key={`${point.label}-${index}`} fill={`var(--chart-${(index % 5) + 1})`} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
