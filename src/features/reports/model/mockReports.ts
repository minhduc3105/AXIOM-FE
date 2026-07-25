import type { Report } from "./types";

export const mockReports: Report[] = [
  {
    id: "report-data-quality-q3",
    title: "Q3 Data Quality Drift Analysis",
    excerpt:
      "Tracks missing data trends, schema drift, and downstream impact on customer query pipelines.",
    createdAt: "2026-07-18",
    author: "Linh Tran",
    source: "Data Intelligence",
    tags: ["Data quality", "Pipeline", "Q3"],
    category: "Data analysis report",
    thumbnailTone: "blue",
    detail: {
      headline:
        "Data quality improved across CRM sources, while operational logs still drift during late-day batches.",
      body: [
        "CRM datasets reduced missing fields from 8.4% to 3.1% after validation rules were added at the ingestion layer. System log sources still spike between 22:00 and 23:30 because retry batches generate payloads without trace_id.",
        "Prioritize contract standardization for high-frequency events, and add alerts when valid record volume drops more than 12% against the seven-day rolling baseline.",
      ],
      metrics: [
        {
          label: "Missing fields",
          value: "3.1%",
          change: "-5.3%",
          tone: "positive",
        },
        { label: "Schema drift", value: "11", change: "+4", tone: "warning" },
        {
          label: "Validated rows",
          value: "4.8M",
          change: "+18%",
          tone: "neutral",
        },
      ],
      chart: [
        { label: "Mon", value: 42 },
        { label: "Tue", value: 58 },
        { label: "Wed", value: 47 },
        { label: "Thu", value: 73 },
        { label: "Fri", value: 66 },
      ],
      table: [
        {
          dimension: "CRM customers",
          finding: "Email normalization stable after patch",
          owner: "Data Platform",
          status: "Ready",
        },
        {
          dimension: "System logs",
          finding: "trace_id missing in retry batch",
          owner: "Observability",
          status: "Review",
        },
        {
          dimension: "Billing export",
          finding: "Currency field has mixed casing",
          owner: "Finance Ops",
          status: "Queued",
        },
      ],
    },
  },
  {
    id: "report-operations-weekly",
    title: "Weekly Operations Control Report",
    excerpt:
      "Summarizes SLA performance, ticket volume, and operational bottlenecks from the latest week.",
    createdAt: "2026-07-20",
    author: "Minh Pham",
    source: "Operations Desk",
    tags: ["Operations", "SLA", "Weekly"],
    category: "Operations report",
    thumbnailTone: "green",
    detail: {
      headline:
        "SLA performance remains healthy, but escalation teams need to reduce approval wait time after triage.",
      body: [
        "Total ticket volume increased 9% week over week, driven mainly by data access and connector health requests. Most tickets stayed within SLA except cases requiring access confirmation from the source data owner.",
        "Add standard response templates for data owners and open a dedicated dashboard for tickets held longer than six hours in pending approval.",
      ],
      metrics: [
        { label: "SLA met", value: "94.6%", change: "+2.1%", tone: "positive" },
        { label: "Open tickets", value: "128", change: "+9%", tone: "warning" },
        {
          label: "Median resolve",
          value: "3.4h",
          change: "-0.8h",
          tone: "positive",
        },
      ],
      chart: [
        { label: "P1", value: 18 },
        { label: "P2", value: 44 },
        { label: "P3", value: 67 },
        { label: "P4", value: 39 },
      ],
      table: [
        {
          dimension: "Data access",
          finding: "Owner approval delay is the main blocker",
          owner: "Ops Lead",
          status: "Action",
        },
        {
          dimension: "Connector health",
          finding: "MySQL retries recovered automatically",
          owner: "Ingestion",
          status: "Ready",
        },
        {
          dimension: "User support",
          finding: "FAQ deflected common upload questions",
          owner: "Support",
          status: "Monitor",
        },
      ],
    },
  },
  {
    id: "report-system-observability",
    title: "System Observability Snapshot",
    excerpt:
      "Reviews system stability, API errors, queue latency, and index health after ingestion runs.",
    createdAt: "2026-07-21",
    author: "An Nguyen",
    source: "Platform Reliability",
    tags: ["System", "Latency", "Index"],
    category: "System report",
    thumbnailTone: "slate",
    detail: {
      headline:
        "APIs remain stable and queue latency rises slightly on large ingests; index rebuilds need clearer concurrency limits.",
      body: [
        "P95 API latency stayed under 420ms across 92% of measurement windows. Queue latency increased on ingest jobs with many large files, especially when index rebuilds ran alongside semantic extraction.",
        "Apply tenant-level concurrency caps and record provenance for each index refresh to reduce the risk of evidence version confusion.",
      ],
      metrics: [
        {
          label: "P95 latency",
          value: "418ms",
          change: "-36ms",
          tone: "positive",
        },
        {
          label: "Queue wait",
          value: "7.8m",
          change: "+2.4m",
          tone: "warning",
        },
        {
          label: "Error rate",
          value: "0.18%",
          change: "-0.05%",
          tone: "positive",
        },
      ],
      chart: [
        { label: "API", value: 82 },
        { label: "Queue", value: 54 },
        { label: "Index", value: 69 },
        { label: "Search", value: 77 },
      ],
      table: [
        {
          dimension: "API gateway",
          finding: "Error budget remains healthy",
          owner: "SRE",
          status: "Ready",
        },
        {
          dimension: "Index jobs",
          finding: "Concurrent rebuild increases queue wait",
          owner: "Search",
          status: "Review",
        },
        {
          dimension: "Semantic extraction",
          finding: "Retry policy prevents dropped entities",
          owner: "ML Ops",
          status: "Monitor",
        },
      ],
    },
  },
  {
    id: "report-executive-ingestion-readiness",
    title: "Executive Ingestion Readiness",
    excerpt:
      "Executive summary of source connection progress, coverage, and remaining open risks.",
    createdAt: "2026-07-22",
    author: "Hanh Le",
    source: "Program Office",
    tags: ["Readiness", "Coverage", "Risk"],
    category: "Executive report",
    thumbnailTone: "amber",
    detail: {
      headline:
        "Coverage is sufficient for the pilot phase, but access to two finance sources must be finalized before expansion.",
      body: [
        "Of the 12 target data sources, 9 have completed profiling, 7 have approved semantic hints, and 5 are ready for indexing. The largest risk remains finance data, which has stricter access conditions.",
        "The pilot phase can begin with CRM, support, and system logs. Keep finance in controlled preview until the approval path is complete.",
      ],
      metrics: [
        {
          label: "Sources profiled",
          value: "9/12",
          change: "+3",
          tone: "positive",
        },
        { label: "Ready to index", value: "5", change: "+2", tone: "neutral" },
        { label: "Open risks", value: "4", change: "-1", tone: "warning" },
      ],
      chart: [
        { label: "CRM", value: 86 },
        { label: "Support", value: 78 },
        { label: "Logs", value: 74 },
        { label: "Finance", value: 41 },
      ],
      table: [
        {
          dimension: "CRM",
          finding: "Pilot coverage complete",
          owner: "Revenue Ops",
          status: "Ready",
        },
        {
          dimension: "Support",
          finding: "Taxonomy approved for first release",
          owner: "CX",
          status: "Ready",
        },
        {
          dimension: "Finance",
          finding: "Access control review still pending",
          owner: "Finance Ops",
          status: "Blocked",
        },
      ],
    },
  },
  {
    id: "report-security-audit-trace",
    title: "Security Audit Trace Review",
    excerpt:
      "Reviews provenance, unusual events, and audit gaps around sensitive ingestion flows.",
    createdAt: "2026-07-23",
    author: "Quang Do",
    source: "Security Review",
    tags: ["Security", "Audit", "Trace"],
    category: "Audit report",
    thumbnailTone: "rose",
    detail: {
      headline:
        "Audit traces are complete at the job level, but file reload actions need user attribution.",
      body: [
        "Job creation, profile approval, and index build events all include complete trace data. The gap appears in file reload actions when users change an upload batch within the same session.",
        "Add user attribution and checksum snapshots to reload events for incident traceability. Current risk is medium because the data has not yet entered the production index.",
      ],
      metrics: [
        {
          label: "Trace coverage",
          value: "91%",
          change: "+6%",
          tone: "positive",
        },
        { label: "Audit gaps", value: "3", change: "-2", tone: "warning" },
        { label: "Sensitive jobs", value: "17", change: "+5", tone: "neutral" },
      ],
      chart: [
        { label: "Auth", value: 72 },
        { label: "Upload", value: 48 },
        { label: "Profile", value: 81 },
        { label: "Index", value: 76 },
      ],
      table: [
        {
          dimension: "Job creation",
          finding: "Trace includes actor, source, and timestamp",
          owner: "Security",
          status: "Ready",
        },
        {
          dimension: "File reload",
          finding: "Missing actor in reload event",
          owner: "Frontend",
          status: "Action",
        },
        {
          dimension: "Index approval",
          finding: "Approval path logged correctly",
          owner: "Governance",
          status: "Ready",
        },
      ],
    },
  },
  {
    id: "report-search-relevance",
    title: "Search Relevance Calibration",
    excerpt:
      "Measures search quality after the latest index, including precision, recall, and tag-level coverage.",
    createdAt: "2026-07-24",
    author: "Nhi Vo",
    source: "Search Quality",
    tags: ["Search", "Relevance", "Evidence"],
    category: "Quality report",
    thumbnailTone: "cyan",
    detail: {
      headline:
        "Precision improved for operations queries, while recall remains low on multi-source questions with finance terminology.",
      body: [
        "The evaluation query set shows precision@5 at 86% for operations and 82% for system logs. Questions that join CRM with finance still miss evidence because synonym mapping is not broad enough.",
        "Expand semantic hints for revenue, invoice, and booking terms before using these results in automated executive reports.",
      ],
      metrics: [
        { label: "Precision@5", value: "84%", change: "+7%", tone: "positive" },
        { label: "Recall", value: "68%", change: "+3%", tone: "warning" },
        {
          label: "Evidence coverage",
          value: "76%",
          change: "+8%",
          tone: "positive",
        },
      ],
      chart: [
        { label: "Ops", value: 86 },
        { label: "Logs", value: 82 },
        { label: "CRM", value: 74 },
        { label: "Finance", value: 58 },
      ],
      table: [
        {
          dimension: "Operations queries",
          finding: "Top results cite the expected runbooks",
          owner: "Search",
          status: "Ready",
        },
        {
          dimension: "Finance terms",
          finding: "Synonym coverage misses booking language",
          owner: "Data Steward",
          status: "Review",
        },
        {
          dimension: "Evidence snippets",
          finding: "Short snippets improve scan speed",
          owner: "UX",
          status: "Monitor",
        },
      ],
    },
  },
];
