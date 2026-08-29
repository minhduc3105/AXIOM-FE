import {
  BracesIcon,
  ChevronDownIcon,
  CopyIcon,
  FileSearchIcon,
  Rows3Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  InspectorResource,
  LayoutBlock,
  ParsedDocumentResult,
} from "@/shared/types/document-results";
import { ParsedBlockCard } from "./ParsedBlockCard";

type Props = {
  parsing: InspectorResource<ParsedDocumentResult>;
  blocks: LayoutBlock[];
  filteredBlocks: LayoutBlock[];
  pages: number[];
  blockTypes: string[];
  pageFilter: string;
  typeFilter: string;
  onPageFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  parsedMode: string;
  activeComponentId: string | null;
  cardRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  onModeChange: (value: string) => void;
  onActivate: (block: LayoutBlock) => void;
  descriptionEdits: Record<string, string>;
  onDescriptionEdit: (
    componentId: string,
    description: string,
  ) => Promise<void>;
  onRetry: () => void;
};

export function ParsedContentPane({
  parsing,
  blocks,
  filteredBlocks,
  pages,
  blockTypes,
  pageFilter,
  typeFilter,
  onPageFilterChange,
  onTypeFilterChange,
  parsedMode,
  activeComponentId,
  cardRefs,
  viewportRef,
  onModeChange,
  onActivate,
  descriptionEdits,
  onDescriptionEdit,
  onRetry,
}: Props) {
  if (parsing.status === "loading" && !parsing.data)
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-9" />
        <Skeleton className="h-36" />
        <Skeleton className="h-28" />
      </div>
    );
  if (parsing.status === "error" && !parsing.data)
    return (
      <div className="grid min-h-0 flex-1 place-items-center p-6">
        <Alert variant="destructive">
          <AlertTitle>Parsed content failed</AlertTitle>
          <AlertDescription>{parsing.error}</AlertDescription>
          <Button
            className="mt-3"
            type="button"
            variant="outline"
            onClick={onRetry}
          >
            Retry
          </Button>
        </Alert>
      </div>
    );
  if (!parsing.data) return null;
  const jsonValue = JSON.stringify(
    {
      document: parsing.data.document,
      processing_run: parsing.data.processingRun,
      reading_order: parsing.data.readingOrder,
      blocks: parsing.data.blocks,
    },
    null,
    2,
  );
  return (
    <Tabs
      value={parsedMode}
      onValueChange={onModeChange}
      className="min-h-0 flex-1 gap-0 overflow-hidden"
    >
      <div className="flex min-w-0 flex-col gap-2 border-b px-3 py-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <TabsList aria-label="Parsed content modes">
            <TabsTrigger value="rendered">
              <Rows3Icon />
              Rendered
            </TabsTrigger>
            <TabsTrigger value="json">
              <BracesIcon />
              JSON
            </TabsTrigger>
          </TabsList>
          {parsedMode === "json" ? (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => void copyJson(jsonValue)}
            >
              <CopyIcon data-icon="inline-start" />
              Copy
            </Button>
          ) : null}
        </div>
        {parsedMode === "rendered" ? (
          <div className="grid grid-cols-2 gap-2">
            <FilterDropdown
              label="Filter blocks by page"
              value={pageFilter}
              onChange={onPageFilterChange}
              items={[
                { label: "All pages", value: "all" },
                ...pages.map((page) => ({
                  label: `Page ${page + 1}`,
                  value: page.toString(),
                })),
              ]}
            />
            <FilterDropdown
              label="Filter blocks by type"
              value={typeFilter}
              onChange={onTypeFilterChange}
              items={[
                { label: "All types", value: "all" },
                ...blockTypes.map((type) => ({ label: type, value: type })),
              ]}
            />
          </div>
        ) : null}
      </div>
      <TabsContent
        value="rendered"
        keepMounted
        className="m-0 min-h-0 overflow-hidden"
      >
        <ScrollArea className="h-full min-h-0">
          <div ref={viewportRef} className="min-w-0">
            <div className="grid min-w-0 gap-3 p-3">
              {!blocks.length ? (
                <Alert>
                  <AlertTitle>No layout blocks</AlertTitle>
                  <AlertDescription>
                    {parsing.data.mainText ||
                      "Corpus did not return block or main-text content for this document."}
                  </AlertDescription>
                </Alert>
              ) : !filteredBlocks.length ? (
                <Alert>
                  <FileSearchIcon />
                  <AlertTitle>No matching blocks</AlertTitle>
                  <AlertDescription>
                    Change the page or block type filter to continue reviewing.
                  </AlertDescription>
                </Alert>
              ) : (
                filteredBlocks.map((block) => (
                  <ParsedBlockCard
                    key={block.component_id}
                    block={block}
                    index={blocks.findIndex(
                      (item) => item.component_id === block.component_id,
                    )}
                    active={activeComponentId === block.component_id}
                    cardRefs={cardRefs}
                    description={
                      descriptionEdits[block.component_id] ?? block.description
                    }
                    onDescriptionEdit={onDescriptionEdit}
                    onActivate={onActivate}
                  />
                ))
              )}
            </div>
          </div>
        </ScrollArea>
      </TabsContent>
      <TabsContent
        value="json"
        keepMounted
        className="m-0 min-h-0 overflow-hidden"
      >
        <ScrollArea className="h-full min-h-0">
          <div className="p-3">
            <pre className="min-w-max rounded-lg border bg-muted/50 p-4 font-mono text-xs leading-relaxed text-foreground">
              {jsonValue}
            </pre>
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}

function FilterDropdown({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: Array<{ label: string; value: string }>;
}) {
  const selectedLabel =
    items.find((item) => item.value === value)?.label ?? label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-between"
            aria-label={label}
          />
        }
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDownIcon data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {items.map((item) => (
              <DropdownMenuRadioItem key={item.value} value={item.value}>
                {item.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

async function copyJson(value: string) {
  try {
    if (!navigator.clipboard?.writeText)
      throw new Error("Clipboard access is unavailable.");
    await navigator.clipboard.writeText(value);
    toast.success("Parsed JSON copied.");
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Unable to copy parsed JSON.",
    );
  }
}
