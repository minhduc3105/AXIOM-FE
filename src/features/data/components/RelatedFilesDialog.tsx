import { useEffect, useRef, useState } from "react";
import { LoaderCircleIcon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  discoverRelatedFiles,
  relatedFileToDataFile,
  type RelatedFile,
} from "../api/relatedFilesApi";
import { useOrganizationFiles } from "../model/useOrganizationFiles";
import type { DataFile, DataSourceFilesQuery } from "../model/types";

const MAX_SELECTION = 20;

type Props = {
  organizationId: string;
  workspaceId: string;
  initialFiles: DataFile[];
  onClose: () => void;
  onOpenDocument: (file: DataFile, sourceLabel: string) => void;
};

export function RelatedFilesDialog({
  organizationId,
  workspaceId,
  initialFiles,
  onClose,
  onOpenDocument,
}: Props) {
  const [query, setQuery] = useState<DataSourceFilesQuery>({
    page: 1,
    pageSize: 20,
    search: "",
    sortBy: "name",
    sortOrder: "asc",
  });
  const [selected, setSelected] = useState<DataFile[]>(() =>
    initialFiles
      .filter(
        (file) =>
          file.workspaceId === workspaceId &&
          file.status === "success" &&
          file.documentId,
      )
      .slice(0, MAX_SELECTION),
  );
  const {
    result,
    loading,
    error: listError,
    refresh,
  } = useOrganizationFiles(organizationId, workspaceId, query);
  const indexedFiles = (result?.files ?? []).filter(
    (file) =>
      file.status === "success" &&
      Boolean(file.documentId) &&
      file.workspaceId === workspaceId,
  );
  const [results, setResults] = useState<RelatedFile[] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  function changeSelection(file: DataFile, checked: boolean) {
    setSelected((current) =>
      checked
        ? [...current.filter((item) => item.key !== file.key), file].slice(
            0,
            MAX_SELECTION,
          )
        : current.filter((item) => item.key !== file.key),
    );
    setResults(null);
    setError(null);
  }

  async function discover() {
    if (!selected.length || pending) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError(null);
    setResults(null);
    try {
      const files = await discoverRelatedFiles(
        workspaceId,
        selected,
        controller.signal,
      );
      if (!controller.signal.aborted) setResults(files);
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to find related files.",
        );
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Find related files</DialogTitle>
          <DialogDescription>
            Choose up to 20 indexed files. We’ll search this workspace for
            documents related to their content.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-4 overflow-y-auto">
          <Input
            aria-label="Search files to select"
            placeholder="Search workspace file names"
            value={query.search}
            disabled={pending}
            onChange={(event) =>
              setQuery((current) => ({
                ...current,
                search: event.target.value,
                page: 1,
              }))
            }
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selected.length} / {MAX_SELECTION} selected
            </span>
            {selected.map((file) => (
              <Button
                key={file.key}
                variant="secondary"
                size="sm"
                disabled={pending}
                aria-label={`Remove ${file.name}`}
                onClick={() => changeSelection(file, false)}
              >
                <span className="max-w-40 truncate">{file.name}</span>
                <XIcon />
              </Button>
            ))}
          </div>
          {listError ? (
            <div role="alert" className="space-y-2 text-sm">
              <p>{listError}</p>
              <Button variant="outline" onClick={refresh}>
                Retry loading files
              </Button>
            </div>
          ) : loading ? (
            <p role="status" className="py-5 text-sm text-muted-foreground">
              Loading files…
            </p>
          ) : (
            <div className="divide-y rounded-lg border">
              {!indexedFiles.length && (
                <p className="p-4 text-sm text-muted-foreground">
                  No indexed files on this page. Try another page or search.
                </p>
              )}
              {indexedFiles.map((file) => {
                const checked = selected.some((item) => item.key === file.key);
                return (
                  <label
                    key={file.key}
                    className="flex items-center gap-3 p-3 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      disabled={
                        pending ||
                        (!checked && selected.length >= MAX_SELECTION)
                      }
                      onCheckedChange={(value) =>
                        changeSelection(file, value === true)
                      }
                    />
                    <span className="min-w-0 flex-1 truncate" title={file.key}>
                      {file.name}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pending || loading || query.page <= 1}
              onClick={() =>
                setQuery((current) => ({ ...current, page: current.page - 1 }))
              }
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {query.page} of {Math.max(1, result?.totalPages ?? 1)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={
                pending || loading || query.page >= (result?.totalPages ?? 1)
              }
              onClick={() =>
                setQuery((current) => ({ ...current, page: current.page + 1 }))
              }
            >
              Next
            </Button>
          </div>
          {pending && (
            <p role="status" className="flex items-center gap-2 text-sm">
              <LoaderCircleIcon className="size-4 animate-spin" />
              Finding related files… This may take a few minutes.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {results !== null && (
            <section
              aria-label="Related files"
              className="space-y-2"
              aria-live="polite"
            >
              <h3 className="text-sm font-medium">
                Related files ({results.length})
              </h3>
              {!results.length && (
                <p className="text-sm text-muted-foreground">
                  No related files found. Try a different selection.
                </p>
              )}
              {results.map((file) => (
                <Button
                  key={file.object_key}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    onOpenDocument(
                      relatedFileToDataFile(file, organizationId, workspaceId),
                      "Related workspace files",
                    );
                    onClose();
                  }}
                >
                  <span className="truncate">{file.filename}</span>
                </Button>
              ))}
            </section>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            disabled={!selected.length || pending}
            onClick={() => void discover()}
          >
            {pending ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <SearchIcon />
            )}
            {error ? "Retry discovery" : "Discover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
