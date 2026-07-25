export type ReportMetric = {
  label: string;
  value: number;
  displayValue: string;
  change: string;
};

export type ReportTableRow = {
  dimension: string;
  current: string;
  previous: string;
  status: "On track" | "Watch" | "Action needed";
};

export type Report = {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  createdAt: string;
  author: string;
  source: string;
  tags: string[];
  image: string;
  imageAlt: string;
  readingTime: string;
  lead: string;
  sections: {
    heading: string;
    body: string;
  }[];
  metrics: ReportMetric[];
  table: ReportTableRow[];
};
