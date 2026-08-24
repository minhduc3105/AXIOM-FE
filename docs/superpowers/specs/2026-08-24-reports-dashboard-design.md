# Reports Dashboard Design

Date: 2026-08-24  
Status: Approved for implementation planning

## User outcome

The Reports surface becomes a signal-first workspace dashboard. A user can see the newest automatically generated report, understand what changed after a new document is processed, review metrics and charts extracted from that report, inspect source provenance, and manage report automation without relying on hardcoded demo content.

## UX diagnosis

The current `ReportsPage` mixes the real auto-report scheduler API with a legacy mock report gallery and mock detail model. The real API exposes report lifecycle, title, summary, PDF availability, and source provenance, while `mockReports.ts` supplies hardcoded narrative metrics and charts that do not update with workspace documents. This makes the page look like a report catalog instead of a live intelligence surface and makes it unclear which values are trustworthy.

The approved direction is **signal first**: the newest report and its changes lead the page; extracted metrics, charts, recent history, and automation health support that primary decision.

## Scope

### In scope

- Add a structured dashboard snapshot to completed auto-report output.
- Persist and authorize the snapshot alongside the PDF artifact.
- Add a workspace-scoped overview endpoint for the dashboard.
- Replace hardcoded report-gallery presentation in AXIOM-FE with API-backed dashboard UI.
- Render only metrics and charts present in the structured snapshot.
- Show source provenance and freshness for each extracted signal.
- Support loading, empty, error, running, failed, and stale states.
- Keep manual run, scheduler settings, PDF download, and source inspection working.
- Verify desktop, tablet, mobile, accessibility labels, typecheck, build, and relevant tests.

### Out of scope

- Redesigning the report-generation prompt beyond the structured output contract.
- Replacing the PDF report format or PDF viewer.
- Building an arbitrary user-configurable chart builder.
- Adding cross-workspace analytics; all data remains scoped to the selected workspace.
- Migrating unrelated report, data, or shell components.

## Data architecture

Each successful auto-report run produces two related artifacts:

1. A PDF report, retained as the existing downloadable artifact.
2. A versioned JSON dashboard snapshot containing only evidence-backed values extracted during the same run.

The snapshot is persisted as an authorized asset and referenced from `auto_reports.dashboard_asset_id`. The report record remains the source of truth for lifecycle and provenance; the snapshot is the source of truth for dashboard signals. If snapshot persistence fails during a new run, the run must fail clearly rather than publishing a PDF that appears complete but has an incomplete dashboard contract. Reports created before this feature may have no snapshot and remain valid history/PDF records.

The initial snapshot schema is:

```ts
type ReportDashboardSnapshot = {
  schema_version: 1;
  generated_at: string;
  headline: {
    title: string;
    summary: string;
    confidence?: "high" | "medium" | "low";
  };
  changes: Array<{
    id: string;
    title: string;
    detail: string;
    tone: "positive" | "warning" | "neutral" | "critical";
  }>;
  metrics: Array<{
    id: string;
    label: string;
    value: string;
    unit?: string;
    delta?: string;
    delta_direction?: "up" | "down" | "flat";
    interpretation?: string;
    source_ref?: string;
  }>;
  charts: Array<{
    id: string;
    title: string;
    description?: string;
    type: "line" | "bar" | "donut";
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
```

The backend must validate the shape and finite numeric values before saving it. Unsupported schema versions are ignored by the frontend with a visible "Dashboard signals unavailable" state; they must not break report history or PDF download.

## API contract

Add:

`GET /api/v1/workspaces/{workspace_id}/auto-reports/overview`

The response contains:

```ts
type AutoReportOverview = {
  latest_report: AutoReportDetailResponse | null;
  recent_reports: AutoReportListItemResponse[];
  dashboard: ReportDashboardSnapshot | null;
  freshness: {
    newest_source_last_modified: string | null;
    dashboard_generated_at: string | null;
    is_current: boolean;
  };
  automation: AutoReportPolicyResponse;
};
```

The endpoint must enforce the same workspace authorization as existing auto-report routes. It should return an empty overview for a valid workspace with no report, not a 404. It should load the latest report, its sources, its dashboard snapshot, recent report history, and policy in one workspace-scoped operation.

The existing list/detail/PDF routes remain backward compatible. The detail response may include the optional dashboard snapshot for consumers that already fetch a specific report, but the dashboard page uses `overview` to avoid N+1 report-detail requests.

## Frontend information architecture

`ReportsPage` becomes a full-height operational surface inside the existing `AppShell`.

### Header

- Workspace context and concise description.
- Freshness text such as `Updated from <source> <time ago>`.
- Primary action: open the newest PDF when available.
- Secondary action: manage automation.
- Manual run remains available with a user-facing label such as `Generate now`; remove the current `Dev:` label.

### Latest report signal card

- Title, generated time, source filename, status badge, and summary.
- A compact "What changed" list from `changes`.
- Clear PDF action and source inspection action.
- A freshness indicator derived from `freshness.is_current`.

### Extracted metrics

- Render one card per API metric; do not invent fallback numbers.
- Show value, optional unit, delta direction, and a short interpretation when provided.
- Use semantic status tokens and accessible text for trend direction.

### Extracted charts

- Render supported chart types with shadcn chart composition and the project icon library.
- Use the chart's `source_ref` as an optional provenance label or detail affordance.
- Use a semantic empty state when no chart is available or a chart payload is invalid.
- Keep chart cards compact enough to scan beside report history on desktop.

### Recent history and automation

- Recent report rows show title, source, generated time, lifecycle status, and PDF availability.
- Automation status shows enabled/paused, interval, last checked, next update, and consecutive failures.
- Scheduler controls remain in a focused dialog or sheet, with accessible title and explicit save state.

## Interaction and responsive behavior

- Selecting a report opens a connected detail inspector on desktop and a `Sheet` on mobile.
- The inspector includes narrative summary, sources, metrics/charts when available, errors, and PDF download.
- Manual run updates the overview after the server acknowledges the run; a running status remains visible until the next refresh.
- Workspace changes cancel/ignore stale requests and reset the overview to the new workspace.
- Loading uses `Skeleton`; error uses `Alert` with retry; no workspace/report uses `Empty`.
- Desktop uses a two-column signal/history layout. Tablet stacks history below the latest report. Mobile uses one column with horizontally scrollable compact chart content only when needed.
- No detached viewport overlay is used for source provenance on desktop; the detail inspector stays structurally tied to the selected report.

## Component boundaries

- `src/features/reports/api/reportsApi.ts`: API DTOs and request helpers, including the overview contract.
- `src/features/reports/model/types.ts`: reusable report dashboard domain types.
- `src/features/reports/model/useReportsDashboard.ts`: loading, refresh, selection, and derived view state.
- `src/features/reports/components/LatestReportSignal.tsx`: latest report and changes.
- `src/features/reports/components/ReportMetricGrid.tsx`: dynamic metric cards.
- `src/features/reports/components/ReportChartGrid.tsx`: validated chart rendering and empty states.
- `src/features/reports/components/ReportHistory.tsx`: recent report rows.
- `src/features/reports/components/ReportAutomationPanel.tsx`: scheduler status and controls.
- `src/features/reports/components/ReportDetailSheet.tsx`: connected desktop/mobile detail surface.
- `src/features/reports/ReportsPage.tsx`: page composition and workspace-level actions.

Existing shadcn primitives are composed rather than modified. The implementation must use the aliases and base configuration from `components.json` (`base-nova`, Base UI, Tailwind v4, Lucide icons) and semantic AXIOM tokens from `src/styles/globals.css`.

## Error handling and compatibility

- A report without dashboard JSON still appears in history and can still open/download its PDF.
- A malformed metric or chart is dropped from rendering and reported through a local warning state; the whole dashboard does not fail.
- A failed or skipped run appears in history with its lifecycle badge and error detail when selected.
- Overview request failures preserve the previous successful data while showing a retryable error banner when possible.
- No hardcoded demo report data is used in the production page. Tests may use typed fixtures that represent API responses.

## Testing and acceptance criteria

Frontend tests cover:

- overview loading, empty, error, and refresh states;
- latest report rendering and freshness copy;
- dynamic metric/chart rendering from fixture payloads;
- invalid chart payload fallback;
- report selection and PDF action;
- scheduler enable/save validation;
- workspace change isolation;
- accessible names for action buttons, switch, detail sheet, and trend indicators.

Backend tests cover:

- snapshot validation and persistence;
- overview workspace authorization and empty workspace behavior;
- dashboard asset resolution and malformed/unsupported snapshot behavior;
- backward compatibility of existing list/detail/PDF routes;
- auto-report completion requiring both PDF and dashboard artifacts.

Acceptance is met when a newly completed report changes the latest report, freshness state, metrics, and charts returned by the overview endpoint, while the previous report remains in history and its PDF remains downloadable.
