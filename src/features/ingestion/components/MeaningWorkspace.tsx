import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/shared/lib/utils";
import type { MeaningStatus } from "../model/types";

type MeaningWorkspaceProps = {
  status: MeaningStatus;
  revisionCount: number;
  onApprove: () => void;
  onRevision: () => void;
  onBack: () => void;
};

const semanticConcepts = [
  {
    title: "Customer",
    copy: "customer_id joins revenue rows to payment events",
    relationship:
      "customer_revenue_q3.customer_id → payment_events.customer_id → retention_policy governed rules.",
    evidence:
      "Preserve file_id and row/page references on every customer chunk.",
  },
  {
    title: "Revenue",
    copy: "revenue and amount support financial answer claims",
    relationship:
      "customer_revenue_q3.revenue → payment_events.amount → currency-normalized financial claims.",
    evidence:
      "Revenue evidence retains customer_id, currency, period, and source-row references.",
  },
  {
    title: "Retention",
    copy: "policy memo defines retention and approval constraints",
    relationship:
      "retention_rules.policy_id → governed source records → expiration and approval constraints.",
    evidence:
      "Retention windows remain attached to every derived chunk and searchable asset.",
  },
  {
    title: "External sharing",
    copy: "policy concept gates sensitive fields and generated answers",
    relationship:
      "governed identifiers → PII policy gate → reviewer approval before external sharing.",
    evidence:
      "External results exclude protected fields until the reviewer gate is satisfied.",
  },
];

export function MeaningWorkspace({
  status,
  revisionCount,
  onApprove,
  onRevision,
  onBack,
}: MeaningWorkspaceProps) {
  const [selectedConcept, setSelectedConcept] = useState(0);
  const busy = status === "extracting" || status === "revising";
  if (status === "extracting")
    return (
      <Card
        className="grid min-h-80 place-items-center rounded-[32px] border border-border bg-card p-10 text-center"
        role="status"
      >
        <span className="size-10 animate-spin rounded-full border-4 border-border border-t-primary" />
        <h2 className="mt-5 text-2xl font-semibold">Extracting meaning</h2>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Inferring concepts, relationships, filters, and governed claims from
          the generated profile…
        </p>
      </Card>
    );

  const activeConcept = semanticConcepts[selectedConcept];
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Card className="rounded-[32px] border border-border bg-card p-6">
        <h2 className="text-2xl font-semibold">Semantic map</h2>
        {semanticConcepts.map((concept, index) => (
          <Button
            className={cn(
              "mt-3 min-h-20 w-full flex-col items-start rounded-2xl border border-border bg-card p-4 text-left",
              index === selectedConcept && "border-primary bg-primary/10",
            )}
            key={concept.title}
            type="button"
            onClick={() => setSelectedConcept(index)}
            aria-pressed={index === selectedConcept}
            aria-label={`Select semantic concept ${concept.title}`}
          >
            <strong>{concept.title}</strong>
            <span className="text-sm text-muted-foreground">
              {concept.copy}
            </span>
          </Button>
        ))}
        <div className="mt-5 rounded-3xl bg-secondary p-5" aria-live="polite">
          <strong>Suggested relationship graph · {activeConcept.title}</strong>
          <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
            {activeConcept.relationship}
            <br />
            {activeConcept.evidence}
          </span>
        </div>
      </Card>
      <Card className="rounded-[32px] border border-border bg-card p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold">Review semantic hints</h2>
          {revisionCount > 0 && (
            <Badge className="bg-status-success/10 text-status-success">
              Revision {revisionCount} applied
            </Badge>
          )}
        </div>
        {[
          [
            "High",
            "Governed identifiers",
            "Detected email and customer_id as governed fields across structured sources.",
          ],
          [
            "High",
            "Chunk strategy",
            "Table rows stay row-addressable; documents split by paragraph/page with source ordering.",
          ],
          [
            "Med",
            "Search filters",
            "segment, region, status, timestamp, currency, renewal_date become filters.",
          ],
          [
            "Med",
            "Reviewer note",
            "Answers involving personal data require approval before external sharing.",
          ],
        ].map(([level, title, copy]) => (
          <div
            className="mb-3 flex gap-3 rounded-2xl bg-secondary p-4"
            key={title}
          >
            <Badge
              className={
                level === "High"
                  ? "h-fit bg-status-warning/10 text-status-warning"
                  : "h-fit bg-accent text-muted-foreground"
              }
            >
              {level}
            </Badge>
            <div>
              <strong>{title}</strong>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {copy}
              </p>
            </div>
          </div>
        ))}
        <div className="mt-5 rounded-3xl border border-border bg-secondary p-5">
          <strong>
            {busy ? "Refreshing semantic hints…" : "Ready to build index?"}
          </strong>
          <p className="mt-2 text-sm text-muted-foreground">
            Semantic hints are linked to source files, fields, rows, and
            document chunks.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="button" disabled={busy} onClick={onApprove}>
              Approve meaning
            </Button>
            <Button
              variant="outline"
              type="button"
              disabled={busy}
              onClick={onRevision}
            >
              {busy ? "Revising…" : "Request revision"}
            </Button>
            <Button
              variant="ghost"
              type="button"
              disabled={busy}
              onClick={onBack}
            >
              Back to profile
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
