import { useEffect, useMemo, useState } from "react";
import { AlertCircleIcon } from "lucide-react";
import * as XLSX from "xlsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SourceViewerToolbar } from "./SourceViewerToolbar";

type SpreadsheetState =
  | { status: "loading"; workbook: null; error: null }
  | { status: "ready"; workbook: XLSX.WorkBook; error: null }
  | { status: "error"; workbook: null; error: string };

function normalizeRows(rows: string[][], width: number) {
  return rows.map((row) =>
    Array.from({ length: width }, (_, index) => row[index] ?? ""),
  );
}

export default function SpreadsheetSourceViewer({
  url,
  fileName,
  onRetry,
}: {
  url: string;
  fileName: string;
  onRetry: () => void;
}) {
  const [state, setState] = useState<SpreadsheetState>({
    status: "loading",
    workbook: null,
    error: null,
  });
  const [sheetIndex, setSheetIndex] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", workbook: null, error: null });
    setSheetIndex(0);
    void fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `Workbook preview failed with HTTP ${response.status}.`,
          );
        }
        return XLSX.read(await response.arrayBuffer(), {
          type: "array",
          cellDates: true,
        });
      })
      .then((workbook) => {
        if (!workbook.SheetNames.length) {
          throw new Error("The workbook does not contain a visible sheet.");
        }
        setState({ status: "ready", workbook, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          workbook: null,
          error:
            error instanceof Error
              ? error.message
              : "Unable to parse workbook preview.",
        });
      });
    return () => controller.abort();
  }, [url]);

  const preview = useMemo(() => {
    if (state.status !== "ready") return null;
    const sheetName = state.workbook.SheetNames[sheetIndex];
    const sheet = state.workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<
      Array<string | number | boolean | Date | null>
    >(sheet, {
      header: 1,
      blankrows: false,
      defval: "",
      raw: false,
    });
    const sampleRows = rawRows
      .filter((row) => row.some((cell) => String(cell ?? "").trim()))
      .slice(0, 100);
    const width = Math.min(
      Math.max(...sampleRows.map((row) => row.length), 1),
      24,
    );
    return {
      sheetName,
      sheetCount: state.workbook.SheetNames.length,
      columns: Array.from({ length: width }, (_, index) =>
        XLSX.utils.encode_col(index),
      ),
      rows: normalizeRows(
        sampleRows.map((row) =>
          row
            .slice(0, width)
            .map((cell) =>
              cell instanceof Date ? cell.toLocaleString() : String(cell ?? ""),
            ),
        ),
        width,
      ),
    };
  }, [sheetIndex, state]);

  if (state.status === "loading") {
    return (
      <div className="grid min-h-0 flex-1 place-items-center p-6">
        <div className="flex w-full max-w-md flex-col gap-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-80" />
          <p className="text-center text-xs text-muted-foreground">
            Loading spreadsheet preview…
          </p>
        </div>
      </div>
    );
  }

  if (state.status === "error" || !preview) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center p-6">
        <Alert variant="destructive" className="max-w-sm">
          <AlertCircleIcon />
          <AlertTitle>Spreadsheet preview failed</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
          <Button className="mt-3" variant="outline" onClick={onRetry}>
            Retry preview
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <SourceViewerToolbar
        positionLabel={`${sheetIndex + 1} / ${preview.sheetCount}`}
        previousDisabled={sheetIndex === 0}
        nextDisabled={sheetIndex >= preview.sheetCount - 1}
        onPrevious={() => setSheetIndex((index) => Math.max(0, index - 1))}
        onNext={() =>
          setSheetIndex((index) =>
            Math.min(preview.sheetCount - 1, index + 1),
          )
        }
      />
      <div className="flex min-w-0 items-center gap-2 border-b px-3 py-2">
        <Badge variant="secondary">{preview.sheetName}</Badge>
        <span className="min-w-0 truncate text-xs text-muted-foreground" title={fileName}>
          {fileName}
        </span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          First {preview.rows.length} rows
        </span>
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto p-3">
        <div className="w-max min-w-full overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                {preview.columns.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.rows.length ? (
                preview.rows.map((row, rowIndex) => (
                  <TableRow key={`${preview.sheetName}-${rowIndex}`}>
                    {preview.columns.map((column, columnIndex) => (
                      <TableCell
                        key={`${column}-${columnIndex}`}
                        className="max-w-72 truncate"
                        title={row[columnIndex] ?? ""}
                      >
                        {row[columnIndex] || "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={preview.columns.length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No populated cells were found in this sheet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
