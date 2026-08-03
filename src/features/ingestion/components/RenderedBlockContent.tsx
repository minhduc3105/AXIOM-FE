import { useMemo } from "react";
import DOMPurify from "dompurify";
import type { LayoutBlock } from "../model/documentResults";

const ALLOWED_TAGS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "div",
  "span",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "mark",
  "small",
  "br",
  "hr",
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "pre",
  "code",
  "blockquote",
  "sup",
  "sub",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "colgroup",
  "col",
] as const;

const ALLOWED_ATTR = [
  "abbr",
  "colspan",
  "headers",
  "rowspan",
  "scope",
  "title",
] as const;

export function sanitizeBlockHtml(html: string) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [...ALLOWED_ATTR],
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
  });
  const template = document.createElement("template");
  template.innerHTML = sanitized;
  return template.content.textContent?.trim() ? sanitized : null;
}

export function RenderedBlockContent({ block }: { block: LayoutBlock }) {
  const sanitizedHtml = useMemo(
    () => block.html?.trim() ? sanitizeBlockHtml(block.html) : null,
    [block.html],
  );

  if (!sanitizedHtml) {
    const content = block.text
      || block.semantic_text
      || "No textual content is available for this block.";
    return (
      <div className="whitespace-pre-wrap px-3 py-3 text-sm leading-relaxed">
        {content}
      </div>
    );
  }

  return (
    <div className="max-w-full overflow-x-auto px-3 py-3">
      <div
        className="min-w-0 text-sm leading-relaxed text-foreground [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_caption]:mb-2 [&_caption]:text-left [&_caption]:text-xs [&_caption]:font-medium [&_caption]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_strong]:font-semibold [&_table]:min-w-[560px] [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:align-top [&_th]:font-semibold [&_ul]:list-disc"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  );
}
