import { useState } from "react";
import { CheckIcon, PencilIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/shared/lib/utils";
import type { LayoutBlock } from "@/shared/types/document-results";
import { RenderedBlockContent } from "./RenderedBlockContent";

export function ParsedBlockCard({ block, index, active, cardRefs, onActivate, description, onDescriptionEdit }: {
  block: LayoutBlock; index: number; active: boolean;
  cardRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  onActivate: (block: LayoutBlock) => void; description?: string;
  onDescriptionEdit: (componentId: string, description: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(description ?? block.text ?? block.semantic_text ?? "");
  const boxed = Boolean(block.bbox && block.page_bbox);
  const pageLabel = block.page === null ? "Page —" : `Page ${block.page + 1}`;
  const activateWithKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onActivate(block);
  };
  return <Card ref={(element) => { if (element) cardRefs.current.set(block.component_id, element); else cardRefs.current.delete(block.component_id); }} role="button" tabIndex={0} aria-label={`Show ${block.component_id} in source document`} aria-pressed={active} className={cn("relative min-w-0 cursor-pointer gap-0 overflow-hidden py-0 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50", active && "border-primary bg-accent before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-primary")} onClick={() => onActivate(block)} onKeyDown={activateWithKeyboard}>
    <CardHeader className="border-b bg-muted/40 px-3 py-2.5"><div className="flex min-w-0 flex-wrap items-center gap-2"><Badge>{(index + 1).toString().padStart(2, "0")}</Badge><Badge variant="outline">{block.type}</Badge><Badge variant="secondary">{pageLabel}</Badge><Badge variant={boxed ? "secondary" : "outline"}>{boxed ? "Boxed" : "No box"}</Badge><Button type="button" size="sm" variant="ghost" className="ml-auto h-7 gap-1 px-2" aria-label={`Edit description for ${block.component_id}`} onClick={(event) => { event.stopPropagation(); setDraft(description ?? block.text ?? block.semantic_text ?? ""); setEditing(true); }}><PencilIcon className="size-3.5" />Edit</Button></div></CardHeader>
    <CardContent className="p-0"><code className="block overflow-x-auto border-b bg-muted/30 px-3 py-2 font-mono text-[10px] text-muted-foreground" title={block.component_id}>{block.component_id}</code><div className="min-w-0 overflow-hidden">{editing ? <div className="grid gap-2 p-3" onClick={(event) => event.stopPropagation()}><Textarea aria-label={`Description for ${block.component_id}`} value={draft} onChange={(event) => setDraft(event.target.value)} rows={4} /><div className="flex justify-end gap-2"><Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => setEditing(false)}>Cancel</Button><Button type="button" size="sm" disabled={saving} onClick={async () => { setSaving(true); try { await onDescriptionEdit(block.component_id, draft); setEditing(false); toast.success("Description saved."); } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save description."); } finally { setSaving(false); } }}><CheckIcon data-icon="inline-start" />{saving ? "Saving…" : "Save"}</Button></div></div> : <RenderedBlockContent block={block} contentOverride={description} />}</div></CardContent>
  </Card>;
}
