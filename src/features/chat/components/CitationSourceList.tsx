import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import type { CitationSource, CitationStatus } from "../model/types";

type CitationSourceListProps = {
  markdown: string;
  sources: CitationSource[];
  status: CitationStatus;
  uncitedClaims: string[];
};

export function CitationSourceList({
  markdown,
  sources,
  status,
  uncitedClaims,
}: CitationSourceListProps) {
  const referencedSources = sourcesFromInlineMarkers(markdown, sources);

  if (referencedSources.length === 0) return null;

  return (
    <div className="mt-4 grid gap-3">
      {referencedSources.length > 0 && (
        <section aria-label="Sources" className="grid gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sources
          </h2>
          <ol className="grid gap-2">
            {referencedSources.map(({ source, marker }) => (
              <li
                className="flex min-w-0 items-start gap-2 text-sm"
                key={source.id}
              >
                <Badge
                  variant="outline"
                  className="mt-0.5 shrink-0 rounded-full"
                >
                  {marker}
                </Badge>
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate font-medium text-foreground">
                    {source.source}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {source.locator}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">
            Source links provide traceability, not independent verification.
          </p>
        </section>
      )}

      {status === "partial" && (
        <Alert>
          <InfoIcon aria-hidden="true" />
          <AlertTitle>Some claims are unverified</AlertTitle>
          <AlertDescription>
            Some material claims could not be linked to retrieved sources.
            Review the inline Unverified markers.
            {uncitedClaims.length > 0 && (
              <ul className="mt-2 list-disc pl-5">
                {uncitedClaims.map((claim, index) => (
                  <li key={`${index}-${claim}`}>{claim}</li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function sourcesFromInlineMarkers(markdown: string, sources: CitationSource[]) {
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  const cited = new Map<string, { marker: string; source: CitationSource }>();
  const markerPattern =
    /\[(\d+)\]\(axiom-citation:\/\/([A-Za-z0-9_-]{1,128})\)/g;

  for (const match of markdown.matchAll(markerPattern)) {
    const [, marker, sourceId] = match;
    const source = sourcesById.get(sourceId);
    if (source && !cited.has(sourceId)) cited.set(sourceId, { marker, source });
  }

  return [...cited.values()];
}
