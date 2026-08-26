export type ReportMetric = {
  label: string;
  value: string;
  change: string;
  tone: "positive" | "warning" | "neutral";
};

export type ReportChartPoint = {
  label: string;
  value: number;
};

export type ReportTableRow = {
  dimension: string;
  finding: string;
  owner: string;
  status: string;
};

export type ReportDashboardConfidence = "high" | "medium" | "low";

export type ReportDashboardChangeTone =
  | "positive"
  | "warning"
  | "neutral"
  | "critical";

export type ReportDashboardMetricDirection = "up" | "down" | "flat";

export type ReportDashboardChartType = "line" | "bar" | "donut";

export type ReportDashboardSnapshot = {
  schema_version: 1;
  generated_at: string;
  headline: {
    title: string;
    summary: string;
    confidence?: ReportDashboardConfidence;
  };
  changes: Array<{
    id: string;
    title: string;
    detail: string;
    tone: ReportDashboardChangeTone;
  }>;
  metrics: Array<{
    id: string;
    label: string;
    value: string;
    unit?: string;
    delta?: string;
    delta_direction?: ReportDashboardMetricDirection;
    interpretation?: string;
    source_ref?: string;
  }>;
  charts: Array<{
    id: string;
    title: string;
    description?: string;
    type: ReportDashboardChartType;
    unit?: string;
    points: Array<{
      label: string;
      value: number;
      series?: string;
    }>;
    source_ref?: string;
  }>;
  coverage?: {
    pages?: number;
    source_count: number;
    extracted_sections?: number;
  };
};

export type Report = {
  id: string;
  title: string;
  excerpt: string;
  createdAt: string;
  author: string;
  source: string;
  tags: string[];
  category: string;
  thumbnailTone: "blue" | "green" | "amber" | "slate" | "rose" | "cyan";
  detail: {
    headline: string;
    body: string[];
    metrics: ReportMetric[];
    chart: ReportChartPoint[];
    table: ReportTableRow[];
  };
};
