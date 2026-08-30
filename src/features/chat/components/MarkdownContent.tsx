import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/shared/lib/utils";

type MarkdownContentProps = {
  markdown: string;
  compact?: boolean;
};

type HeadingDepth = 1 | 2 | 3 | 4 | 5 | 6;

type MarkdownBlock =
  | { type: "heading"; depth: HeadingDepth; text: string }
  | { type: "paragraph"; text: string }
  | { type: "blockquote"; text: string }
  | { type: "list"; ordered: boolean; items: string[]; start?: number }
  | { type: "rule" }
  | { type: "table"; headers: string[]; rows: string[][] };

export function MarkdownContent({ markdown, compact }: MarkdownContentProps) {
  const blocks = parseMarkdown(markdown);

  return (
    <article
      className={cn(
        "flex min-w-0 flex-col text-foreground",
        compact ? "gap-3" : "gap-5",
      )}
    >
      {blocks.map((block, index) => renderBlock(block, index, compact))}
    </article>
  );
}

function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = normalizeMarkdownSource(markdown).split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let blockquote: string[] = [];
  let list: string[] = [];
  let orderedList = false;
  let orderedListStart: number | undefined;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", text: normalizeParagraphText(paragraph) });
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    blocks.push({
      type: "list",
      ordered: orderedList,
      items: list,
      start: orderedList ? orderedListStart : undefined,
    });
    list = [];
    orderedList = false;
    orderedListStart = undefined;
  };

  const flushBlockquote = () => {
    if (!blockquote.length) return;
    blocks.push({
      type: "blockquote",
      text: blockquote.join("\n").trim(),
    });
    blockquote = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = normalizeMarkdownLine(rawLine);

    if (!line) {
      flushParagraph();
      flushList();
      flushBlockquote();
      continue;
    }

    if (/^([-*_])\1\1+$/.test(line)) {
      flushParagraph();
      flushList();
      flushBlockquote();
      blocks.push({ type: "rule" });
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      flushBlockquote();
      blocks.push({
        type: "heading",
        depth: heading[1].length as HeadingDepth,
        text: heading[2],
      });
      continue;
    }

    const table = parseTableAt(lines, index);
    if (table) {
      flushParagraph();
      flushList();
      flushBlockquote();
      blocks.push(table.block);
      index = table.endIndex;
      continue;
    }

    const quotedLine = /^>\s?(.*)$/.exec(line);
    if (quotedLine) {
      flushParagraph();
      flushList();
      blockquote.push(quotedLine[1]);
      continue;
    }

    flushBlockquote();

    const listItem = /^[-*]\s+(.+)$/.exec(line);
    if (listItem) {
      flushParagraph();
      if (list.length && orderedList) flushList();
      orderedList = false;
      list.push(listItem[1]);
      continue;
    }

    const orderedListItem = /^\d+[.)]\s+(.+)$/.exec(line);
    if (orderedListItem) {
      flushParagraph();
      if (list.length && !orderedList) flushList();
      orderedList = true;
      if (!list.length) orderedListStart = Number.parseInt(line, 10);
      list.push(orderedListItem[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  flushBlockquote();

  return blocks;
}

function normalizeMarkdownLine(line: string) {
  return line.trim().replace(/^`+\s*(?=#{1,6}\s)/, "");
}

function normalizeMarkdownSource(markdown: string) {
  const normalized = markdown
    .replace(/\r\n/g, "\n")
    .replace(/^\uFEFF/, "")
    .trim();

  const lines = normalized.split("\n");
  const withoutFenceNoise = lines
    .map((line) => line.replace(/\u00a0/g, " "))
    .filter((line) => !isLooseFenceLine(line));

  return withoutFenceNoise.join("\n").trim();
}

function isLooseFenceLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return /^`{1,3}\s*(?:markdown|md|text)?\s*$/i.test(trimmed);
}

function normalizeParagraphText(lines: string[]) {
  return lines
    .join("\n")
    .replace(/\s+(→\s+(?:\*\*)?[A-Z][A-Za-z\s]{1,40}:)/g, "\n$1")
    .trim();
}

function parseTableAt(lines: string[], startIndex: number) {
  const header = splitTableRow(lines[startIndex]);
  const separator = splitTableRow(lines[startIndex + 1] ?? "");
  if (!header || !separator || !isTableSeparator(separator)) return null;

  const rows: string[][] = [];
  let endIndex = startIndex + 1;

  for (let index = startIndex + 2; index < lines.length; index += 1) {
    const row = splitTableRow(lines[index]);
    if (!row) break;
    rows.push(normalizeTableRow(row, header.length));
    endIndex = index;
  }

  return {
    block: {
      type: "table" as const,
      headers: header,
      rows,
    },
    endIndex,
  };
}

function splitTableRow(line: string) {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return null;
  const cells = trimmed
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
  return cells.length >= 2 ? cells : null;
}

function isTableSeparator(cells: string[]) {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function normalizeTableRow(cells: string[], length: number) {
  return Array.from({ length }, (_, index) => cells[index] ?? "");
}

function renderBlock(block: MarkdownBlock, index: number, compact?: boolean) {
  if (block.type === "heading") {
    const className = cn(
      "font-semibold tracking-normal",
      block.depth === 1 &&
        (compact
          ? "text-2xl leading-tight"
          : "text-[clamp(2rem,3.4vw,3.6rem)] leading-[0.98]"),
      block.depth === 2 &&
        (compact ? "text-lg leading-snug" : "pt-2 text-2xl leading-tight"),
      block.depth >= 3 &&
        (compact ? "text-base leading-snug" : "pt-1 text-lg leading-snug"),
    );

    if (block.depth === 1) {
      return (
        <h1 className={className} key={`${block.type}-${index}`}>
          {renderInline(block.text)}
        </h1>
      );
    }

    if (block.depth === 2) {
      return (
        <h2 className={className} key={`${block.type}-${index}`}>
          {renderInline(block.text)}
        </h2>
      );
    }

    return (
      <h3 className={className} key={`${block.type}-${index}`}>
        {renderInline(block.text)}
      </h3>
    );
  }

  if (block.type === "list") {
    const ListTag = block.ordered ? "ol" : "ul";
    return (
      <ListTag
        start={block.ordered ? block.start : undefined}
        className={cn(
          "grid gap-2 pl-5 text-muted-foreground",
          block.ordered ? "list-decimal" : "list-disc",
          compact ? "text-sm leading-relaxed" : "text-base leading-relaxed",
        )}
        key={`${block.type}-${index}`}
      >
        {block.items.map((item) => (
          <li key={item}>{renderInline(item)}</li>
        ))}
      </ListTag>
    );
  }

  if (block.type === "blockquote") {
    return (
      <blockquote
        className={cn(
          "border-l-2 border-primary/50 pl-4 text-muted-foreground italic",
          compact ? "text-sm leading-relaxed" : "text-base leading-relaxed",
        )}
        key={`${block.type}-${index}`}
      >
        {renderInlineWithBreaks(block.text)}
      </blockquote>
    );
  }

  if (block.type === "rule") {
    return (
      <Separator
        className="my-7 bg-border"
        key={`${block.type}-${index}`}
      />
    );
  }

  if (block.type === "table") {
    return (
      <div
        className="max-w-full overflow-hidden rounded-[18px] border border-border bg-card"
        key={`${block.type}-${index}`}
      >
        <Table className="min-w-[560px]">
          <TableHeader className="bg-secondary text-secondary-foreground">
            <TableRow className="hover:bg-transparent">
              {block.headers.map((header, cellIndex) => (
                <TableHead
                  className="h-auto border-border px-4 py-3 font-semibold whitespace-normal"
                  key={`${header}-${cellIndex}`}
                  scope="col"
                >
                  {renderInline(header)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="text-muted-foreground">
            {block.rows.map((row, rowIndex) => (
              <TableRow key={`${row.join("-")}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <TableCell
                    className="align-top px-4 py-3 leading-relaxed whitespace-normal"
                    key={`${cell}-${cellIndex}`}
                  >
                    {renderInline(cell)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <p
      className={cn(
        "w-full text-muted-foreground",
        compact ? "text-sm leading-relaxed" : "text-base leading-relaxed",
      )}
      key={`${block.type}-${index}`}
    >
      {renderInlineWithBreaks(block.text)}
    </p>
  );
}

function renderInlineWithBreaks(text: string) {
  return text.split("\n").flatMap((line, index) => {
    const nodes = renderInline(line, `line-${index}`);
    return index === 0 ? nodes : [<br key={`line-break-${index}`} />, ...nodes];
  });
}

function renderInline(text: string, keyPrefix = "inline") {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|(?<!\*)\*[^*\n]+\*(?!\*))/g);

  return parts.map((part, index) => {
    if (!part) return null;

    const key = `${keyPrefix}-${index}`;

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          className="rounded-md bg-secondary px-1.5 py-0.5 text-[0.92em] text-secondary-foreground"
          key={key}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }

    return part;
  });
}
