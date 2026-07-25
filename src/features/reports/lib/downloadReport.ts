import type { Report } from "../model/types";

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function downloadReport(report: Report) {
  const rows = [
    ["AXIOM REPORT", report.title],
    ["Created", report.createdAt],
    ["Author", report.author],
    ["Source", report.source],
    ["Category", report.category],
    [],
    ["Executive summary", report.lead],
    [],
    ["Metric", "Value", "Change"],
    ...report.metrics.map((metric) => [
      metric.label,
      metric.displayValue,
      metric.change,
    ]),
    [],
    ["Dimension", "Current", "Previous", "Status"],
    ...report.table.map((row) => [
      row.dimension,
      row.current,
      row.previous,
      row.status,
    ]),
  ];

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${report.id}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
