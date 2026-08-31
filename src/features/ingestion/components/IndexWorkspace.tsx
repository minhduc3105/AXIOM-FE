import type { AsyncStatus, IndexStatus, IngestionSource } from "../model/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/shared/lib/utils";

type IndexWorkspaceProps = {
  source: IngestionSource;
  status: IndexStatus;
  query: string;
  completedQuery: string;
  searchStatus: AsyncStatus;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  onBack: () => void;
};

const evidence = [
  [
    "C-1002 · Packet Foundry",
    "Missing email, Mid-market segment, $48K revenue, matched row 14.",
  ],
  [
    "C-1005 · Lattice Bank",
    "Missing email, Enterprise segment, $210K revenue, matched row 22.",
  ],
  [
    "Policy chunk 02",
    "External sharing requires reviewer approval for personal data fields.",
  ],
];

export function IndexWorkspace({
  source,
  status,
  query,
  completedQuery,
  searchStatus,
  onQueryChange,
  onSearch,
  onBack,
}: IndexWorkspaceProps) {
  if (status === "building")
    return (
      <Card
        className="grid min-h-80 place-items-center rounded-[32px] border border-border bg-card p-10 text-center"
        role="status"
      >
        <span className="size-10 animate-spin rounded-full border-4 border-border border-t-primary" />
        <h2 className="mt-5 text-2xl font-semibold">
          Building searchable index
        </h2>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Creating evidence chunks, source maps, governance filters, and
          retrieval metadata…
        </p>
      </Card>
    );
  const sourceRows =
    source.kind === "mysql"
      ? [
          ["customers", "SQL table", "1,248 rows", "PII gate"],
          ["payment_events", "SQL table", "421 rows", "risk filters"],
          ["retention_rules", "SQL table", "4 rows", "sharing rules"],
          ["supplier_contracts", "SQL table", "151 rows", "review sample"],
        ]
      : source.files.map((file, index) => [
          file.name,
          file.extension === "CSV"
            ? "CSV table"
            : file.extension === "JSON"
              ? "JSON events"
              : file.extension === "PDF"
                ? "PDF/OCR"
                : "Document",
          index === 0 ? "1,248 units" : "Mock chunks",
          index === 0 ? "PII gate" : "review sample",
        ]);
  const sourceCount = sourceRows.length;

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="rounded-[32px] border border-border bg-card p-6">
        <h2 className="text-2xl font-semibold">Activation summary</h2>
        {[
          ["Ready", "Index status"],
          [
            `${sourceCount} source${sourceCount === 1 ? "" : "s"}`,
            "Indexed assets",
          ],
          ["1,824 chunks", "Evidence map"],
          ["PII gated", "Policy posture"],
        ].map(([value, label], index) => (
          <div
            className={cn(
              "mt-3 rounded-2xl bg-secondary p-4",
              index === 0 && "bg-status-success/10 text-status-success",
              index === 3 && "bg-status-warning/10 text-status-warning",
            )}
            key={label}
          >
            <strong className="block text-2xl">{value}</strong>
            <span className="text-xs opacity-75">{label}</span>
          </div>
        ))}
        <div className="mt-5 rounded-2xl border border-border bg-secondary p-4">
          <strong>Artifacts</strong>
          <p className="mt-1 text-sm text-muted-foreground">
            source-manifest.json · profile-report.json · semantic-map.json ·
            search-index.json · ingestion-audit.log
          </p>
        </div>
        <Button
          variant="outline"
          className="mt-5 w-full rounded-full"
          type="button"
          onClick={onBack}
        >
          Back to meaning
        </Button>
      </Card>
      <Card className="rounded-[32px] border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold">Search indexed asset</h2>
          <Badge className="bg-status-success/10 text-status-success">
            {sourceCount}/{sourceCount} sources searchable
          </Badge>
        </div>
        <form
          className="mt-5 flex gap-3 max-sm:flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}
        >
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            aria-label="Search indexed evidence"
          />
          <Button
            type="submit"
            disabled={!query.trim() || searchStatus === "loading"}
          >
            {searchStatus === "loading" ? "Searching…" : "Search"}
          </Button>
        </form>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Chunks</TableHead>
                <TableHead>Governance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sourceRows.map((row) => (
                <TableRow key={row[0]}>
                  {row.map((cell) => (
                    <TableCell key={cell}>{cell}</TableCell>
                  ))}
                  <TableCell>Ready</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {completedQuery ? (
          <div className="mt-5 grid gap-3" aria-live="polite">
            <small className="text-muted-foreground">
              Showing mock evidence for “{completedQuery}”
            </small>
            {evidence.map(([title, copy], index) => (
              <Card
                className={cn(
                  "rounded-2xl border border-border bg-card p-4",
                  index === 0 && "border-primary bg-primary/10",
                )}
                key={title}
              >
                <strong>{title}</strong>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {copy}
                </span>
              </Card>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl bg-secondary p-4 text-sm text-muted-foreground">
            Run the example search to validate indexed evidence and row-level
            source references.
          </div>
        )}
      </Card>
    </div>
  );
}
