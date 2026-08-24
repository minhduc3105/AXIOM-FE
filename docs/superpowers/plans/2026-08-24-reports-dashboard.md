# Reports Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded Reports UI with a signal-first workspace dashboard backed by structured report insights, metrics, charts, freshness, and source provenance.

**Architecture:** Auto-report completion publishes a PDF artifact and a validated `report-dashboard.json` artifact. The intelligence service persists the JSON asset reference and exposes one workspace-scoped overview endpoint. AXIOM-FE consumes that overview through a reports hook and composes shadcn-based feature components for the latest report, changes, metrics, charts, history, automation, and detail inspection.

**Tech Stack:** FastAPI, Pydantic, SQLAlchemy, PostgreSQL migration SQL, React 19, TypeScript, Vite, Tailwind v4, shadcn/ui base-nova, Base UI, Lucide, and Recharts through shadcn Chart.

---

## File Map

Backend:

- Modify `AXIOM/services/intelligence-service/intelligence_service/models/auto_report_model.py` and `repositories/auto_report_repository.py` for `dashboard_asset_id`.
- Create `AXIOM/services/intelligence-service/intelligence_service/services/report_dashboard.py` for the versioned snapshot schema/parser.
- Modify `services/auto_report_runner.py`, DTOs, routes, and OpenAPI contract for artifact validation and overview.
- Create `AXIOM/services/intelligence-service/migrations/006_auto_report_dashboard.sql`.
- Modify existing `tests/test_auto_report_runner.py` and `tests/test_report_routes.py` for backend contract coverage.

Frontend:

- Modify `AXIOM-FE/src/features/reports/api/reportsApi.ts` and `model/types.ts`.
- Create `model/useReportsDashboard.ts` and the focused components `LatestReportSignal.tsx`, `ReportMetricGrid.tsx`, `ReportChartGrid.tsx`, `ReportHistory.tsx`, `ReportAutomationPanel.tsx`, and `ReportDetailPanel.tsx`.
- Modify `AXIOM-FE/src/features/reports/ReportsPage.tsx`.
- Add `AXIOM-FE/src/components/ui/chart.tsx` through the shadcn CLI; do not hand-edit generated primitives.
- No frontend UI test files will be added.

## Task 1: Add the structured dashboard snapshot contract

**Files:**
- Create: `AXIOM/services/intelligence-service/intelligence_service/services/report_dashboard.py`
- Modify: `AXIOM/services/intelligence-service/intelligence_service/dto/auto_report_dto.py`
- Modify: `AXIOM/services/intelligence-service/intelligence_service/models/auto_report_model.py`
- Create: `AXIOM/services/intelligence-service/migrations/006_auto_report_dashboard.sql`

- [ ] **Step 1: Define Pydantic snapshot models.**

Create `ReportDashboardSnapshot`, `ReportDashboardHeadline`, `ReportDashboardChange`, `ReportDashboardMetric`, `ReportDashboardChartPoint`, `ReportDashboardChart`, and `ReportDashboardCoverage`. Constrain `schema_version` to literal `1`, use the approved tone/direction/chart literals, and reject non-finite chart values.

```python
class ReportDashboardSnapshot(BaseModel):
    schema_version: Literal[1]
    generated_at: datetime
    headline: ReportDashboardHeadline
    changes: list[ReportDashboardChange] = Field(default_factory=list)
    metrics: list[ReportDashboardMetric] = Field(default_factory=list)
    charts: list[ReportDashboardChart] = Field(default_factory=list)
    coverage: ReportDashboardCoverage | None = None
```

- [ ] **Step 2: Add `parse_report_dashboard`.**

Expose `parse_report_dashboard(payload: bytes | str | Mapping[str, object]) -> ReportDashboardSnapshot`. Decode JSON for bytes/string input and raise `ReportDashboardParseError` for invalid JSON, unsupported schema, wrong shape, or invalid numeric values.

- [ ] **Step 3: Add the database reference and migration.**

Add `dashboard_asset_id: Mapped[str | None]` to `AutoReportModel` and create:

```sql
ALTER TABLE auto_reports
  ADD COLUMN IF NOT EXISTS dashboard_asset_id VARCHAR(64) NULL;
```

- [ ] **Step 4: Extend DTOs compatibly.**

Add optional `dashboard: ReportDashboardSnapshot | None = None` to the detail response and add `AutoReportOverviewResponse` with `latest_report`, `recent_reports`, `dashboard`, `freshness`, and `automation`. Preserve all existing list/PDF fields.

- [ ] **Step 5: Run the import check.**

```bash
cd AXIOM
python -m compileall services/intelligence-service/intelligence_service
```

Expected: exit code `0`.

## Task 2: Persist and validate the dashboard artifact during runs

**Files:**
- Modify: `AXIOM/services/intelligence-service/intelligence_service/repositories/auto_report_repository.py`
- Modify: `AXIOM/services/intelligence-service/intelligence_service/services/auto_report_runner.py`
- Modify: `AXIOM/services/intelligence-service/tests/test_auto_report_runner.py`

- [ ] **Step 1: Extend repository completion.**

Change `complete_report(..., report_asset_id: str, dashboard_asset_id: str, ...)` to persist both IDs. Update the existing test fakes to record the second ID.

- [ ] **Step 2: Require the JSON artifact in the runtime instruction.**

Keep the current analysis goal and append this exact output requirement:

```text
Also create a file named report-dashboard.json with schema_version 1 using the dashboard contract. Include only metrics and charts supported by source evidence; omit unsupported values. Add source_ref to each metric or chart when available.
```

- [ ] **Step 3: Find both artifact IDs.**

Add `_report_dashboard_asset_id(payload)` beside `_report_pdf_asset_id(payload)`. It selects exactly one `report-dashboard.json` artifact with `application/json`; missing or duplicate candidates fail with `missing_dashboard_artifact` or `invalid_dashboard_artifact`.

- [ ] **Step 4: Validate before completing.**

Inject `AssetStorageService` into `AutoReportRunner`. Read the JSON with `iter_asset_bytes` using the existing workspace-scoped `GatewayAuthContext`, parse it with `parse_report_dashboard`, then call `complete_report` with both IDs. Convert parse failures to non-retryable `invalid_dashboard_artifact` errors.

- [ ] **Step 5: Update backend runner fixtures.**

Extend successful runtime-completed fixtures with both artifacts and assert both IDs reach `complete_report`. Add missing JSON, invalid JSON, and non-finite chart-value cases; assert the report fails and is not completed.

- [ ] **Step 6: Run focused tests.**

```bash
cd AXIOM/services/intelligence-service
pytest tests/test_auto_report_runner.py -q
```

Expected: all tests pass.

## Task 3: Add the workspace overview endpoint

**Files:**
- Modify: `AXIOM/services/intelligence-service/intelligence_service/repositories/auto_report_repository.py`
- Modify: `AXIOM/services/intelligence-service/intelligence_service/api/report_routes.py`
- Modify: `AXIOM/contracts/apis/intelligence-service.openapi.yaml`
- Modify: `AXIOM/services/intelligence-service/tests/test_report_routes.py`

- [ ] **Step 1: Add bounded history access.**

Add optional `limit: int | None = None` to `list_reports`, clamp overview requests to `1..50`, and keep existing callers unchanged when no limit is supplied. The overview route passes `limit=10`.

- [ ] **Step 2: Add authorized dashboard loading.**

Implement an async route helper that returns `None` for legacy reports without `dashboard_asset_id`, verifies JSON content type, reads through `iter_asset_bytes`, and parses through `parse_report_dashboard`. Missing/malformed dashboard data must not remove report history or PDF access.

- [ ] **Step 3: Implement the route before `/{report_id}`.**

Add `GET /api/v1/workspaces/{workspace_id}/auto-reports/overview` with the existing workspace authorization. Return the latest report with sources, up to 10 recent reports, the latest dashboard, policy, and:

```python
is_current = (
    latest_report is None
    or (
        dashboard is not None
        and newest_source_last_modified is not None
        and dashboard.generated_at >= newest_source_last_modified
    )
)
```

An empty workspace is current; a report without a dashboard or without a comparable source timestamp is stale/unavailable.

- [ ] **Step 4: Update the OpenAPI YAML.**

Add the overview operation before the parameterized report route and define `ReportDashboardSnapshot`, metric, chart, change, freshness, and overview schemas under `components.schemas`. Keep current list/detail/PDF operations backward compatible.

- [ ] **Step 5: Add route checks.**

Extend `test_report_routes.py` with authorized overview, unauthorized workspace, empty workspace, and malformed asset cases. Assert malformed dashboard data produces `dashboard is None` while the report remains visible.

- [ ] **Step 6: Run route tests.**

```bash
cd AXIOM/services/intelligence-service
pytest tests/test_report_routes.py -q
```

Expected: all tests pass.

## Task 4: Add the frontend overview client and hook

**Files:**
- Modify: `AXIOM-FE/src/features/reports/api/reportsApi.ts`
- Modify: `AXIOM-FE/src/features/reports/model/types.ts`
- Create: `AXIOM-FE/src/features/reports/model/useReportsDashboard.ts`

- [ ] **Step 1: Add matching TypeScript DTOs.**

Define `ReportDashboardSnapshot`, `ReportDashboardMetric`, `ReportDashboardChart`, and `AutoReportOverview` with the backend snake_case fields. Keep existing `AutoReport`, detail, policy, run, and PDF types compatible.

- [ ] **Step 2: Add `getAutoReportOverview`.**

Call `request<AutoReportOverview>(reportPath(workspaceId, "/overview"))`. Extend the existing request helper to accept `AbortSignal` only if needed; do not duplicate auth or URL construction.

- [ ] **Step 3: Create `useReportsDashboard`.**

Return:

```ts
{
  overview: AutoReportOverview | null;
  selectedReport: AutoReportDetail | null;
  loading: boolean;
  refreshing: boolean;
  saving: boolean;
  running: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  selectReport: (report: AutoReport) => Promise<void>;
  runNow: () => Promise<void>;
  savePolicy: (enabled: boolean, interval: string) => Promise<boolean>;
  download: (reportId: string) => Promise<void>;
  clearSelection: () => void;
}
```

Use an `AbortController` or request-generation guard so a previous workspace response cannot overwrite the current workspace. Preserve the last successful overview during refresh errors.

## Task 5: Add the shadcn chart primitive

**Files:**
- Create: `AXIOM-FE/src/components/ui/chart.tsx`
- Modify: `AXIOM-FE/package.json`
- Modify: `AXIOM-FE/package-lock.json` if npm updates it

- [ ] **Step 1: Inspect current shadcn context and docs.**

From `AXIOM-FE/` run:

```bash
npx shadcn@latest info --json
npx shadcn@latest docs chart card badge empty alert skeleton sheet switch table
```

Confirm aliases, Base UI primitives, Lucide icons, and Tailwind v4 config.

- [ ] **Step 2: Install the official chart component.**

```bash
npx shadcn@latest add chart
```

Review generated code and dependencies. Do not hand-edit generated UI primitives.

- [ ] **Step 3: Confirm chart imports.**

```bash
rg -n 'from "recharts"|ChartContainer|ChartTooltip' src/components/ui/chart.tsx package.json
```

Expected: generated chart helpers and Recharts dependency are present.

## Task 6: Build feature-owned dashboard components

**Files:**
- Create: `AXIOM-FE/src/features/reports/components/LatestReportSignal.tsx`
- Create: `AXIOM-FE/src/features/reports/components/ReportMetricGrid.tsx`
- Create: `AXIOM-FE/src/features/reports/components/ReportChartGrid.tsx`
- Create: `AXIOM-FE/src/features/reports/components/ReportHistory.tsx`
- Create: `AXIOM-FE/src/features/reports/components/ReportAutomationPanel.tsx`
- Create: `AXIOM-FE/src/features/reports/components/ReportDetailPanel.tsx`

- [ ] **Step 1: Implement `LatestReportSignal`.**

Compose `Card`, `Badge`, `Button`, `Separator`, and Lucide icons. Render title, summary, source, status, freshness, changes, PDF action, and source inspection. Disable PDF action when unavailable and expose trend tone through text as well as color.

- [ ] **Step 2: Implement `ReportMetricGrid`.**

Map only `dashboard.metrics`. Render value/unit, delta, and interpretation with semantic Badge variants and AXIOM status tokens. Never use fallback numbers.

- [ ] **Step 3: Implement `ReportChartGrid`.**

Validate `id`, `title`, supported type, and at least one finite point. Render line/bar/donut through `ChartContainer`; omit invalid charts and show a compact `Alert`/`Empty` state. Do not fabricate data when the API has no charts.

- [ ] **Step 4: Implement `ReportHistory`.**

Render selectable semantic rows with title, source, date, status Badge, and PDF action. Stop event propagation from the inline PDF button so it does not select the row.

- [ ] **Step 5: Implement `ReportAutomationPanel`.**

Show enabled/paused state, interval, last checked, next due, and failure count. Use `Switch`, `Input`, `Button`, and a titled Dialog/Sheet for editing. Validate 60 seconds through 24 hours before calling `savePolicy`.

- [ ] **Step 6: Implement `ReportDetailPanel`.**

Render title, summary, sources, errors, metrics/charts, and PDF action in one content component. Use an in-flow sticky `aside` on desktop and the existing `use-media-query` hook with `Sheet` on narrow screens.

## Task 7: Compose `ReportsPage` and remove production mock usage

**Files:**
- Modify: `AXIOM-FE/src/features/reports/ReportsPage.tsx`
- Leave: `AXIOM-FE/src/features/reports/model/mockReports.ts` and legacy components untouched unless an import audit proves they are unused everywhere

- [ ] **Step 1: Replace page-local state with `useReportsDashboard`.**

Wire `workspaceId`, `onData`, overview actions, selection, and PDF download to the new components. Keep scheduler behavior and toast messages.

- [ ] **Step 2: Compose all states.**

Use `Skeleton` for initial loading, `Alert` with retry for overview errors, and `Empty` for no workspace/no report. Preserve old data while a background refresh is running.

- [ ] **Step 3: Implement the approved signal-first layout.**

Use a max-width operational surface inside the existing `AppShell`; make latest report dominant, charts/metrics secondary, and history/automation supporting. Stack at tablet/mobile widths. Do not add a decorative hero, mock values, custom stylesheet, or purple/blue wash.

- [ ] **Step 4: Rename the manual action.**

Replace `Dev: run report now` with `Generate now`; refresh overview after acknowledgement and preserve status-specific toasts.

- [ ] **Step 5: Audit old production imports.**

```bash
cd AXIOM-FE
rg -n 'mockReports|ReportCard|ReportDetailDialog|ReportThumbnail' src
```

Expected: `ReportsPage` has no production import of the legacy mock gallery. Do not delete fixtures in this implementation unless they are proven unused and deletion is isolated.

## Task 8: Verify locally without UI tests or push

**Files:**
- No new frontend test files.
- Modify only existing backend tests when fixtures must match the new persisted contract.

- [ ] **Step 1: Build the frontend.**

```bash
cd AXIOM-FE
npm run build
```

Expected: TypeScript and Vite complete successfully.

- [ ] **Step 2: Run focused backend tests.**

```bash
cd AXIOM/services/intelligence-service
pytest tests/test_auto_report_runner.py tests/test_report_routes.py -q
```

Expected: all focused backend tests pass.

- [ ] **Step 3: Manually inspect responsive states.**

Run `npm run dev -- --host 0.0.0.0` from `AXIOM-FE/` and inspect desktop, tablet, and mobile widths. Check latest report hierarchy, chart legibility, source provenance, scheduler dialog, PDF action, empty workspace, failed report, running report, and stale-source states.

- [ ] **Step 4: Check local git state only.**

```bash
git status --short
git log -3 --oneline
```

Keep all commits local. Do not run `git push`.
