import { cn } from "@/shared/lib/utils";

type MarkdownContentProps = {
  markdown: string;
  compact?: boolean;
};

type MarkdownBlock =
  | { type: "heading"; depth: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

export function MarkdownContent({ markdown, compact }: MarkdownContentProps) {
  const blocks = parseMarkdown(markdown);

  return (
    <article
      className={cn(
        "min-w-0 text-[#191915] dark:text-[#eee8dc]",
        compact ? "space-y-3" : "space-y-5",
      )}
    >
      {blocks.map((block, index) => renderBlock(block, index, compact))}
    </article>
  );
}

function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.trim().split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    blocks.push({ type: "list", items: list });
    list = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        depth: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      });
      continue;
    }

    const listItem = /^[-*]\s+(.+)$/.exec(line);
    if (listItem) {
      flushParagraph();
      list.push(listItem[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
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
      block.depth === 3 &&
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
    return (
      <ul
        className={cn(
          "grid list-disc gap-2 pl-5 text-[#5f5a50] dark:text-[#aaa397]",
          compact ? "text-sm leading-relaxed" : "text-base leading-relaxed",
        )}
        key={`${block.type}-${index}`}
      >
        {block.items.map((item) => (
          <li key={item}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  }

  return (
    <p
      className={cn(
        "max-w-[72ch] text-[#5f5a50] dark:text-[#aaa397]",
        compact ? "text-sm leading-relaxed" : "text-base leading-relaxed",
      )}
      key={`${block.type}-${index}`}
    >
      {renderInline(block.text)}
    </p>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          className="rounded-md bg-[#f4efe5] px-1.5 py-0.5 text-[0.92em] text-[#191915] dark:bg-[#292923] dark:text-[#eee8dc]"
          key={`${part}-${index}`}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
}
