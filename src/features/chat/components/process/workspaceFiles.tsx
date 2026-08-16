import type { ProcessEvent } from "../../model/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { getBrowserStorageUrl } from "@/shared/lib/storage-url";
import { DownloadIcon, FileTextIcon, FolderOpenIcon } from "lucide-react";
import {
  artifactName,
  hasDisplayValue,
  isRecord,
  stringFromUnknown,
} from "./processValueUtils";

export type WorkspaceFile = {
  name: string;
  url: string;
  type: string;
};

const GEN_REPORT_PUBLIC_URL = (
  import.meta.env.VITE_GEN_REPORT_API_URL || "http://localhost:8011"
).replace(/\/$/, "");

export function WorkspaceFileList({
  files,
  compact = false,
}: {
  files: WorkspaceFile[];
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden border border-[#d8d0c2]/80 bg-[#fffdf8]/60 dark:border-[#38372f]/80 dark:bg-[#1a1a17]/55",
        compact
          ? "rounded-xl border-0 bg-transparent dark:bg-transparent"
          : "rounded-2xl",
      )}
      aria-label="Workspace files"
    >
      {!compact && (
        <div className="flex items-center justify-between gap-3 border-b border-[#d8d0c2]/70 px-3 py-2.5 dark:border-[#38372f]/70">
          <div className="flex min-w-0 items-center gap-2">
            <FolderOpenIcon className="size-4 shrink-0 text-[#6d685e] dark:text-[#aaa397]" />
            <strong className="truncate text-sm font-semibold text-[#191915] dark:text-[#eee8dc]">
              Workspace files
            </strong>
          </div>
          <Badge variant="outline" className="shrink-0">
            {files.length}
          </Badge>
        </div>
      )}
      <div
        className={cn(
          "flex min-w-0 gap-2 overflow-x-auto [scrollbar-color:#c7bca9_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#c7bca9] dark:[scrollbar-color:#4a4438_transparent] dark:[&::-webkit-scrollbar-thumb]:bg-[#4a4438]",
          compact ? "p-0 pb-1" : "p-2 pb-3",
        )}
      >
        {files.map((file) => (
          <WorkspaceFileCard file={file} key={`${file.url}:${file.name}`} />
        ))}
      </div>
    </section>
  );
}

function WorkspaceFileCard({ file }: { file: WorkspaceFile }) {
  if (file.type === "image") {
    return (
      <article className="w-[min(360px,82vw)] shrink-0 overflow-hidden rounded-xl border border-[#d8d0c2]/80 bg-white/75 dark:border-[#38372f]/80 dark:bg-[#20201c]/75">
        <div className="flex min-w-0 items-start justify-between gap-2 border-b border-[#d8d0c2]/70 px-3 py-2 dark:border-[#38372f]/70">
          <div className="min-w-0">
            <strong className="block truncate text-sm font-medium text-[#191915] dark:text-[#eee8dc]">
              {file.name}
            </strong>
            <span className="block truncate text-xs text-[#9b9488] dark:text-[#aaa397]">
              image
            </span>
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Download ${file.name}`}
            onClick={() => downloadWorkspaceFile(file)}
          >
            <DownloadIcon />
          </Button>
        </div>
        <a
          className="grid aspect-[16/9] place-items-center bg-[#f7f3eb] dark:bg-[#11110f]"
          href={file.url}
          rel="noreferrer"
          target="_blank"
        >
          <img
            alt={file.name}
            className="h-full w-full object-contain"
            loading="lazy"
            src={file.url}
          />
        </a>
      </article>
    );
  }

  return (
    <div className="group flex min-h-14 w-[min(360px,82vw)] shrink-0 items-center gap-3 rounded-xl border border-[#d8d0c2]/80 bg-white/75 px-3 py-2.5 text-left dark:border-[#38372f]/80 dark:bg-[#20201c]/75">
      <FileTextIcon className="size-4 shrink-0 text-[#2456e8] dark:text-[#7895ff]" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[#191915] dark:text-[#eee8dc]">
          {file.name}
        </span>
        <span className="block truncate text-xs text-[#9b9488] dark:text-[#aaa397]">
          {file.type || "file"}
        </span>
      </span>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={`Download ${file.name}`}
        onClick={() => downloadWorkspaceFile(file)}
      >
        <DownloadIcon />
      </Button>
    </div>
  );
}

async function downloadWorkspaceFile(file: WorkspaceFile) {
  try {
    const response = await fetch(file.url);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    triggerBrowserDownload(objectUrl, file.name);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    triggerBrowserDownload(file.url, file.name, true);
  }
}

export async function downloadWorkspaceFilesPackage(
  files: WorkspaceFile[],
  packageId: string,
) {
  if (files.length === 0) return;
  const entries = await Promise.all(
    files.map(async (file) => {
      const response = await fetch(file.url);
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      return {
        name: filePackageName(file.name),
        bytes: new Uint8Array(await response.arrayBuffer()),
      };
    }),
  );
  const zip = createZip(entries);
  const objectUrl = URL.createObjectURL(
    new Blob([zip], { type: "application/zip" }),
  );
  triggerBrowserDownload(objectUrl, workspaceFilesPackageFilename(packageId));
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function triggerBrowserDownload(
  url: string,
  filename: string,
  openInNewTab = false,
) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  if (openInNewTab) {
    link.target = "_blank";
    link.rel = "noreferrer";
  }
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function extractWorkspaceFiles(events: ProcessEvent[]): WorkspaceFile[] {
  const files = new Map<string, WorkspaceFile>();
  for (const event of events) {
    for (const value of [
      event.outputs,
      event.details,
      isRecord(event.outputs) ? event.outputs.result : null,
      isRecord(event.details) ? event.details.result : null,
    ]) {
      for (const file of workspaceFilesFromValue(value)) {
        const key = workspaceFileIdentity(file);
        if (!files.has(key)) files.set(key, file);
      }
    }
  }
  return [...files.values()];
}

export function workspaceFileIdentity(file: WorkspaceFile) {
  return file.name.trim().toLowerCase();
}

export function workspaceFileFromArtifact(value: string): WorkspaceFile | null {
  const url = normalizeWorkspaceFileUrl(value);
  const name = artifactName(value);
  if (!url || !name) return null;
  return {
    name,
    url,
    type: fileTypeFromName(name),
  };
}

function workspaceFilesFromValue(value: unknown): WorkspaceFile[] {
  if (!hasDisplayValue(value)) return [];
  if (Array.isArray(value)) return value.flatMap(workspaceFilesFromValue);
  if (!isRecord(value)) return [];

  const direct = workspaceFileFromRecord(value);
  const nestedValues = [
    value.generated_files,
    value.generatedFiles,
    value.files,
    value.images,
    value.artifacts,
  ];
  return [
    ...(direct ? [direct] : []),
    ...nestedValues.flatMap(workspaceFilesFromValue),
  ];
}

function workspaceFileFromRecord(value: Record<string, unknown>) {
  const url = normalizeWorkspaceFileUrl(
    stringFromUnknown(value.url) ||
      stringFromUnknown(value.proxy_url) ||
      stringFromUnknown(value.oss_url),
  );
  const name =
    stringFromUnknown(value.filename) ||
    stringFromUnknown(value.name) ||
    artifactName(stringFromUnknown(value.path)) ||
    artifactName(url);
  if (!url || !name) return null;
  return {
    name,
    url,
    type: stringFromUnknown(value.type) || fileTypeFromName(name),
  };
}

function normalizeWorkspaceFileUrl(value: string) {
  if (!value) return "";
  if (value.startsWith("/api/v1/files/"))
    return `${GEN_REPORT_PUBLIC_URL}${value}`;
  if (/^https?:\/\//i.test(value)) {
    const storageUrl = getBrowserStorageUrl(value);
    if (storageUrl !== value) return storageUrl;
    try {
      const url = new URL(value);
      if (url.hostname === "host.docker.internal" && url.port === "8011") {
        return `${GEN_REPORT_PUBLIC_URL}${url.pathname}${url.search}`;
      }
    } catch {
      return value;
    }
    return value;
  }
  return "";
}

function fileTypeFromName(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext))
    return "image";
  if (ext === "pdf") return "pdf";
  if (["md", "markdown", "txt", "csv", "json", "html"].includes(ext))
    return "text";
  return "file";
}

function createZip(entries: Array<{ name: string; bytes: Uint8Array }>) {
  const encoder = new TextEncoder();
  const records: Uint8Array[] = [];
  const centralRecords: Uint8Array[] = [];
  let offset = 0;
  const emittedNames = new Set<string>();

  for (const entry of entries) {
    const name = uniqueZipName(entry.name, emittedNames);
    const nameBytes = encoder.encode(name);
    const crc = crc32(entry.bytes);
    const localHeader = zipLocalHeader(nameBytes, entry.bytes, crc);
    records.push(localHeader, entry.bytes);
    centralRecords.push(zipCentralHeader(nameBytes, entry.bytes, crc, offset));
    offset += localHeader.length + entry.bytes.length;
  }

  const centralOffset = offset;
  const centralSize = centralRecords.reduce(
    (sum, item) => sum + item.length,
    0,
  );
  return concatBytes([
    ...records,
    ...centralRecords,
    zipEndRecord(entries.length, centralSize, centralOffset),
  ]);
}

function zipLocalHeader(name: Uint8Array, bytes: Uint8Array, crc: number) {
  const header = new Uint8Array(30 + name.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, bytes.length, true);
  view.setUint32(22, bytes.length, true);
  view.setUint16(26, name.length, true);
  view.setUint16(28, 0, true);
  header.set(name, 30);
  return header;
}

function zipCentralHeader(
  name: Uint8Array,
  bytes: Uint8Array,
  crc: number,
  offset: number,
) {
  const header = new Uint8Array(46 + name.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, bytes.length, true);
  view.setUint32(24, bytes.length, true);
  view.setUint16(28, name.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, offset, true);
  header.set(name, 46);
  return header;
}

function zipEndRecord(
  entries: number,
  centralSize: number,
  centralOffset: number,
) {
  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entries, true);
  view.setUint16(10, entries, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  view.setUint16(20, 0, true);
  return record;
}

function concatBytes(chunks: Uint8Array[]) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

let crcTable: Uint32Array | null = null;

function crc32(bytes: Uint8Array) {
  const table =
    crcTable ??
    (crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }
      return value >>> 0;
    }));
  let crc = 0xffffffff;
  for (const byte of bytes) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function filePackageName(name: string) {
  return (
    name
      .replace(/\\/g, "/")
      .split("/")
      .filter(Boolean)
      .pop()
      ?.replace(/[<>:"|?*\x00-\x1f]/g, "_") || "file"
  );
}

function uniqueZipName(name: string, emittedNames: Set<string>) {
  if (!emittedNames.has(name)) {
    emittedNames.add(name);
    return name;
  }
  const dotIndex = name.lastIndexOf(".");
  const base = dotIndex > 0 ? name.slice(0, dotIndex) : name;
  const ext = dotIndex > 0 ? name.slice(dotIndex) : "";
  let index = 2;
  let next = `${base}-${index}${ext}`;
  while (emittedNames.has(next)) {
    index += 1;
    next = `${base}-${index}${ext}`;
  }
  emittedNames.add(next);
  return next;
}

function safePackageId(value: string) {
  return (value || "session").replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export function workspaceFilesPackageFilename(packageId: string) {
  return `package-session-${safePackageId(packageId)}.zip`;
}
