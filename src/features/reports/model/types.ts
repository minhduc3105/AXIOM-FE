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
