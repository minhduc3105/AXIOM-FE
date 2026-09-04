import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
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

export function MarkdownContent({ markdown, compact }: MarkdownContentProps) {
  return (
    <article
      className={cn(
        "flex min-w-0 flex-col text-foreground",
        compact ? "gap-3" : "gap-5",
      )}
    >
      <ReactMarkdown
        components={createMarkdownComponents(compact)}
        rehypePlugins={[rehypeKatex]}
        remarkPlugins={[remarkGfm, remarkMath]}
        skipHtml
      >
        {normalizeMarkdownSource(markdown)}
      </ReactMarkdown>
    </article>
  );
}

function createMarkdownComponents(compact?: boolean): Components {
  const headingClassName = "font-semibold tracking-normal";
  const headingSize = (depth: number) =>
    cn(
      headingClassName,
      depth === 1 &&
        (compact
          ? "text-2xl leading-tight"
          : "text-[clamp(2rem,3.4vw,3.6rem)] leading-[0.98]"),
      depth === 2 &&
        (compact ? "text-lg leading-snug" : "pt-2 text-2xl leading-tight"),
      depth >= 3 &&
        (compact ? "text-base leading-snug" : "pt-1 text-lg leading-snug"),
    );
  const bodyText = compact
    ? "text-sm leading-relaxed"
    : "text-base leading-relaxed";

  return {
    h1: ({ children, node: _node, ...props }) => (
      <h1 {...props} className={headingSize(1)}>
        {children}
      </h1>
    ),
    h2: ({ children, node: _node, ...props }) => (
      <h2 {...props} className={headingSize(2)}>
        {children}
      </h2>
    ),
    h3: ({ children, node: _node, ...props }) => (
      <h3 {...props} className={headingSize(3)}>
        {children}
      </h3>
    ),
    h4: ({ children, node: _node, ...props }) => (
      <h4 {...props} className={headingSize(4)}>
        {children}
      </h4>
    ),
    h5: ({ children, node: _node, ...props }) => (
      <h5 {...props} className={headingSize(5)}>
        {children}
      </h5>
    ),
    h6: ({ children, node: _node, ...props }) => (
      <h6 {...props} className={headingSize(6)}>
        {children}
      </h6>
    ),
    p: ({ children, node: _node, ...props }) => (
      <p {...props} className={cn("w-full text-muted-foreground", bodyText)}>
        {children}
      </p>
    ),
    a: ({ children, node: _node, ...props }) => (
      <a
        {...props}
        className="font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary/80"
        rel="noreferrer"
        target="_blank"
      >
        {children}
      </a>
    ),
    ul: ({ children, node: _node, ...props }) => (
      <ul
        {...props}
        className={cn(
          "grid gap-2 pl-5 text-muted-foreground",
          bodyText,
          "list-disc",
        )}
      >
        {children}
      </ul>
    ),
    ol: ({ children, node: _node, ...props }) => (
      <ol
        {...props}
        className={cn(
          "grid gap-2 pl-5 text-muted-foreground",
          bodyText,
          "list-decimal",
        )}
      >
        {children}
      </ol>
    ),
    blockquote: ({ children, node: _node, ...props }) => (
      <blockquote
        {...props}
        className={cn(
          "border-l-2 border-primary/50 pl-4 text-muted-foreground italic",
          bodyText,
        )}
      >
        {children}
      </blockquote>
    ),
    hr: () => <Separator className="my-7 bg-border" />,
    table: ({ children, node: _node, ...props }) => (
      <div className="max-w-full overflow-hidden rounded-[18px] border border-border bg-card">
        <Table {...props} className="min-w-[560px]">
          {children}
        </Table>
      </div>
    ),
    thead: ({ children, node: _node, ...props }) => (
      <TableHeader
        {...props}
        className="bg-secondary text-secondary-foreground"
      >
        {children}
      </TableHeader>
    ),
    tbody: ({ children, node: _node, ...props }) => (
      <TableBody {...props} className="text-muted-foreground">
        {children}
      </TableBody>
    ),
    tr: ({ children, node: _node, ...props }) => (
      <TableRow {...props} className="hover:bg-transparent">
        {children}
      </TableRow>
    ),
    th: ({ children, node: _node, ...props }) => (
      <TableHead
        {...props}
        className="h-auto border-border px-4 py-3 font-semibold whitespace-normal"
        scope="col"
      >
        {children}
      </TableHead>
    ),
    td: ({ children, node: _node, ...props }) => (
      <TableCell
        {...props}
        className="align-top px-4 py-3 leading-relaxed whitespace-normal"
      >
        {children}
      </TableCell>
    ),
    pre: ({ children, node: _node, ...props }) => (
      <pre
        {...props}
        className="overflow-x-auto rounded-lg bg-secondary p-3 text-sm"
      >
        {children}
      </pre>
    ),
    code: ({ children, className, node: _node, ...props }) => (
      <code
        {...props}
        className={cn(
          "rounded-md bg-secondary px-1.5 py-0.5 text-[0.92em] text-secondary-foreground",
          className,
        )}
      >
        {children}
      </code>
    ),
  };
}

function normalizeMarkdownSource(markdown: string) {
  const normalized = markdown
    .replace(/\r\n/g, "\n")
    .replace(/^\uFEFF/, "")
    .trim();

  const lines = normalized
    .split("\n")
    .map((line) => line.replace(/\u00a0/g, " "));
  const withoutOuterFence =
    lines.length >= 2 &&
    isLooseFenceLine(lines[0]) &&
    isClosingFenceLine(lines[lines.length - 1])
      ? lines.slice(1, -1)
      : lines;

  return linkifyBareUrls(
    withoutOuterFence
      .flatMap((line) => {
        const displayMath = /^\s*\$\$(.+)\$\$\s*$/.exec(line);
        return displayMath ? ["$$", displayMath[1].trim(), "$$"] : [line];
      })
      .join("\n")
      .trim(),
  );
}

function linkifyBareUrls(markdown: string) {
  return markdown.replace(
    /(^|\s)((?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<]*)?)/gim,
    (_match, prefix: string, url: string) => {
      const trailingPunctuation = /[.,;:!?]+$/.exec(url)?.[0] ?? "";
      const linkedUrl = trailingPunctuation
        ? url.slice(0, -trailingPunctuation.length)
        : url;
      const href = `https://${linkedUrl}`;
      return `${prefix}[${linkedUrl}](${href})${trailingPunctuation}`;
    },
  );
}

function isLooseFenceLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return /^`{1,3}\s*(?:markdown|md|text)?\s*$/i.test(trimmed);
}

function isClosingFenceLine(line: string) {
  return /^`{1,3}\s*$/.test(line.trim());
}
