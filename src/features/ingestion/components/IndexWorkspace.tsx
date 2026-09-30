import type { AsyncStatus, IndexStatus, IngestionSource } from "../model/types";
import { LoaderCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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
      <Card className="min-h-80" role="status">
        <CardContent className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
          <LoaderCircleIcon
            className="animate-spin text-primary motion-reduce:animate-none"
            aria-hidden="true"
          />
          <h2 className="text-2xl font-semibold">Building searchable index</h2>
          <p className="max-w-xl text-muted-foreground">
            Creating evidence chunks, source maps, governance filters, and
            retrieval metadata…
          </p>
        </CardContent>
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
      <Card>
        <CardHeader>
          <CardTitle>Activation summary</CardTitle>
          <CardDescription>
            What is ready for search and review.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
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
                "rounded-lg bg-muted p-4",
                index === 0 && "bg-primary/10 text-primary",
              )}
              key={label}
            >
              <strong className="block text-2xl">{value}</strong>
              <span className="text-xs opacity-75">{label}</span>
            </div>
          ))}
          <div className="rounded-lg border bg-muted/40 p-4">
            <strong>Artifacts</strong>
            <p className="mt-1 text-sm text-muted-foreground">
              source-manifest.json · profile-report.json · semantic-map.json ·
              search-index.json · ingestion-audit.log
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            type="button"
            onClick={onBack}
          >
            Back to meaning
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="grid gap-1">
            <CardTitle>Search indexed asset</CardTitle>
            <CardDescription>
              Find evidence across the indexed source.
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {sourceCount}/{sourceCount} sources searchable
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <form
            className="flex gap-3 max-sm:flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              onSearch();
            }}
          >
            <FieldGroup className="flex-1">
              <Field>
                <FieldLabel
                  className="sr-only"
                  htmlFor="indexed-evidence-search"
                >
                  Search indexed evidence
                </FieldLabel>
                <Input
                  id="indexed-evidence-search"
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  placeholder="Search indexed evidence"
                />
              </Field>
            </FieldGroup>
            <Button
              type="submit"
              disabled={!query.trim() || searchStatus === "loading"}
            >
              {searchStatus === "loading" ? "Searching…" : "Search"}
            </Button>
          </form>
          <div className="overflow-x-auto rounded-lg border">
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
            <div className="grid gap-3" aria-live="polite">
              <small className="text-muted-foreground">
                Showing mock evidence for “{completedQuery}”
              </small>
              {evidence.map(([title, copy], index) => (
                <Card
                  className={cn(
                    "rounded-lg",
                    index === 0 && "ring-1 ring-primary/50",
                  )}
                  key={title}
                >
                  <CardContent className="p-4">
                    <strong>{title}</strong>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {copy}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Empty className="min-h-36 border border-dashed">
              <EmptyHeader>
                <EmptyTitle>Search the index to see evidence</EmptyTitle>
                <EmptyDescription>
                  Run a query to validate indexed evidence and row-level source
                  references.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
