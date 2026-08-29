import mammoth from "mammoth";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { IngestionFile } from "./types";
import {
  getUploadFileDefinition,
  type UploadPreviewKind,
} from "./uploadFileRegistry";

export type DataPreviewState = {
  status: "idle" | "loading" | "ready" | "error";
  presentation: "table" | "document" | "html" | "markdown" | "metadata";
  title: string;
  description: string;
  columns: string[];
  rows: string[][];
  metrics: Array<{ label: string; value: string }>;
  content?: string;
  html?: string;
  error?: string;
};

export const emptyDataPreview: DataPreviewState = {
  status: "idle",
  presentation: "metadata",
  title: "Select a data file",
  description: "File metadata and sample rows will appear here.",
  columns: ["Property", "Value"],
  rows: [],
  metrics: [],
};

type DataPreviewBuilder = (file: IngestionFile) => Promise<DataPreviewState>;

export function getUploadPreviewKind(
  fileName: string,
): UploadPreviewKind | null {
  return getUploadFileDefinition(fileName)?.previewKind ?? null;
}

function normalizeTableRows(rows: string[][], width: number) {
  return rows.map((row) =>
    Array.from({ length: width }, (_, index) => row[index] ?? ""),
  );
}

function baseMetrics(file: IngestionFile) {
  return [
    { label: "Type", value: file.extension.toUpperCase() },
    { label: "Size", value: file.sizeLabel },
  ];
}

function unwrapQuotedCsvRows(input: string) {
  const rows = input.split(/\r?\n/).filter((row) => row.trim());
  const isWrappedRows =
    rows.length > 0 &&
    rows.every((row) => {
      const trimmed = row.trim();
      return trimmed.startsWith('"') && trimmed.endsWith('"');
    });
  if (!isWrappedRows) return input;

  return rows
    .map((row) => {
      const trimmed = row.trim();
      return trimmed.slice(1, -1).replace(/""/g, '"');
    })
    .join("\n");
}

function parseCsvRows(input: string) {
  const options = { delimiter: ",", skipEmptyLines: true };
  const parsed = Papa.parse(input, options).data;
  if (parsed.length && parsed.every((row) => row.length === 1)) {
    return Papa.parse(unwrapQuotedCsvRows(input), options).data;
  }
  return parsed;
}

async function buildTextDataPreview(
  file: IngestionFile,
): Promise<DataPreviewState> {
  const sample = await file.file.slice(0, 128 * 1024).text();
  const lines = sample
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .slice(0, 9);
  const metrics = baseMetrics(file);

  if (getUploadPreviewKind(file.name) === "csv" && lines.length > 0) {
    const parsedRows = parseCsvRows(sample).slice(0, 9);
    const header = parsedRows[0] ?? [];
    const width = Math.max(...parsedRows.map((row) => row.length), 1);
    const columns = header.some(Boolean)
      ? normalizeTableRows([header], width)[0]
      : Array.from({ length: width }, (_, index) => `Column ${index + 1}`);
    return {
      status: "ready",
      presentation: "table",
      title: file.name,
      description: "CSV preview generated from the selected upload file.",
      columns,
      rows: normalizeTableRows(parsedRows.slice(1, 8), columns.length),
      metrics: [
        ...metrics,
        { label: "Sample", value: `${Math.max(lines.length - 1, 0)} rows` },
      ],
    };
  }

  const markdown = file.extension.toLowerCase() === "md";
  return {
    status: "ready",
    presentation: markdown ? "markdown" : "document",
    title: file.name,
    description: "Text preview generated from the selected upload file.",
    columns: ["Line", "Content"],
    rows: lines.slice(0, 10).map((line, index) => [String(index + 1), line]),
    metrics: [...metrics, { label: "Sample", value: `${lines.length} lines` }],
    content: sample,
  };
}

async function buildWorkbookPreview(
  file: IngestionFile,
): Promise<DataPreviewState> {
  const workbook = XLSX.read(await file.file.arrayBuffer(), {
    type: "array",
    cellDates: true,
  });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return {
      status: "error",
      presentation: "table",
      title: file.name,
      description: "Unable to inspect this workbook.",
      columns: ["Property", "Value"],
      rows: [
        ["File", file.name],
        ["Size", file.sizeLabel],
      ],
      metrics: baseMetrics(file),
      error: "The workbook does not contain any visible sheets.",
    };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<
    Array<string | number | boolean | Date | null>
  >(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: false,
  });
  const nonEmptyRows = rawRows.filter((row) =>
    row.some((cell) => String(cell ?? "").trim()),
  );
  const sampleRows = nonEmptyRows.slice(0, 10);
  const width = Math.min(
    Math.max(...sampleRows.map((row) => row.length), 1),
    12,
  );
  const header = normalizeTableRows(
    [sampleRows[0]?.slice(0, width).map((cell) => String(cell ?? "")) ?? []],
    width,
  )[0];
  const columns = header.some(Boolean)
    ? header.map((cell, index) => cell || XLSX.utils.encode_col(index))
    : Array.from({ length: width }, (_, index) => XLSX.utils.encode_col(index));
  const rows = normalizeTableRows(
    sampleRows
      .slice(1)
      .map((row) =>
        row
          .slice(0, width)
          .map((cell) =>
            cell instanceof Date ? cell.toLocaleString() : String(cell ?? ""),
          ),
      ),
    width,
  );

  return {
    status: "ready",
    presentation: "table",
    title: file.name,
    description: `SheetJS preview from sheet "${firstSheetName}".`,
    columns,
    rows,
    metrics: [
      { label: "Sheets", value: String(workbook.SheetNames.length) },
      { label: "Active sheet", value: firstSheetName },
      { label: "Sample", value: `${rows.length} rows` },
      { label: "Size", value: file.sizeLabel },
    ],
  };
}

export async function convertDocxToHtml(arrayBuffer: ArrayBuffer) {
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
      ],
    },
  );
  return result.value;
}

async function buildDocxPreview(
  file: IngestionFile,
): Promise<DataPreviewState> {
  const html = await convertDocxToHtml(await file.file.arrayBuffer());

  return {
    status: "ready",
    presentation: html ? "html" : "metadata",
    title: file.name,
    description: html
      ? "DOCX preview generated from the selected document."
      : "This document will be processed during ingestion; browser text extraction was unavailable.",
    columns: ["Property", "Value"],
    rows: html
      ? []
      : [
          ["File name", file.name],
          ["Type", file.extension.toUpperCase()],
          ["Size", file.sizeLabel],
        ],
    metrics: baseMetrics(file),
    html: html || undefined,
  };
}

async function buildMetadataPreview(
  file: IngestionFile,
): Promise<DataPreviewState> {
  return {
    status: "ready",
    presentation: "metadata",
    title: file.name,
    description:
      "This document will be processed during ingestion; browser preview is unavailable.",
    columns: ["Property", "Value"],
    rows: [
      ["File name", file.name],
      ["Type", file.extension.toUpperCase()],
      ["Browser MIME type", file.file.type || "Not provided"],
      ["Size", file.sizeLabel],
    ],
    metrics: baseMetrics(file),
  };
}

const previewBuilders: Partial<Record<UploadPreviewKind, DataPreviewBuilder>> =
  {
    csv: buildTextDataPreview,
    text: buildTextDataPreview,
    workbook: buildWorkbookPreview,
    metadata: buildDocxPreview,
  };

export async function buildUploadDataPreview(file: IngestionFile) {
  const previewKind = getUploadPreviewKind(file.name);
  const buildPreview = previewKind ? previewBuilders[previewKind] : undefined;
  return buildPreview ? buildPreview(file) : buildMetadataPreview(file);
}
