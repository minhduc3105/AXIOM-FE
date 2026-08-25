import { FileCheck2Icon, GitBranchIcon, Link2Icon, XIcon } from 'lucide-react'
import type { MockResult } from '../model/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMediaQuery } from '@/shared/hooks/use-media-query'

export function EvidencePanel({ result, onClose }: { result: MockResult; onClose: () => void }) {
  const mobile = useMediaQuery('(max-width: 767px)')

  if (mobile) {
    return (
      <Sheet open onOpenChange={(open) => { if (!open) onClose() }}>
        <SheetContent className="!w-[min(500px,100vw)] overflow-y-auto border-border bg-card p-4" side="right" showCloseButton={false} aria-label="Evidence">
          <SheetHeader className="sr-only">
            <SheetTitle>Evidence</SheetTitle>
            <SheetDescription>Sources, artifacts, and trace information for the reviewed answer.</SheetDescription>
          </SheetHeader>
          <EvidenceContent result={result} onClose={onClose} />
        </SheetContent>
      </Sheet>
    )
  }

  return <aside className="sticky top-28 max-h-[calc(100dvh-128px)] min-h-[560px] w-full self-start overflow-hidden rounded-[24px] border border-border bg-card shadow-sm" aria-label="Evidence"><EvidenceContent result={result} onClose={onClose} /></aside>
}

function EvidenceContent({ result, onClose }: { result: MockResult; onClose: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col p-5">
      <header className="mb-4 flex items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-semibold leading-none">Evidence</h2>
          <p className="mt-2 max-w-[28rem] text-sm leading-relaxed text-muted-foreground">Check each claim against the source used to approve the answer.</p>
        </div>
        <Button variant="ghost" size="icon" className="size-9 shrink-0 rounded-full border border-border bg-secondary text-muted-foreground hover:bg-muted hover:text-foreground" onClick={onClose} type="button" aria-label="Close evidence"><XIcon /></Button>
      </header>

      <div className="mb-4 grid gap-3 rounded-2xl border border-border bg-secondary p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Coverage</span>
          <strong className="text-lg leading-none">{result.evidence.length}/{result.evidence.length} cited</strong>
        </div>
        <div className="grid grid-cols-4 gap-1" aria-hidden="true">
          {result.evidence.map((item) => <span className="h-1.5 rounded-full bg-primary" key={item.id} />)}
        </div>
      </div>

      <Tabs className="min-h-0 flex-1 space-y-4" defaultValue="sources">
        <TabsList variant="line" className="border-b border-border pb-1" aria-label="Evidence views">
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
          <TabsTrigger value="trace">Trace</TabsTrigger>
        </TabsList>

        <TabsContent className="min-h-0" value="sources">
          <ScrollArea className="h-[min(420px,calc(100dvh-382px))] pr-2">
            {result.evidence.map((item, index) => (
              <Card className="mb-3 rounded-2xl border border-border bg-card shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:border-primary/35" data-tone={item.tone} key={item.id}>
                <CardHeader className="gap-2 p-4">
                  <div className="flex items-center gap-2">
                    <Badge className="rounded-lg" variant="default">{item.id}</Badge>
                    <Badge variant={item.tone === 'success' ? 'secondary' : 'outline'}>{item.tone === 'success' ? 'Verified' : 'Review'}</Badge>
                  </div>
                  <CardTitle className="text-[15px] leading-snug">Claim {index + 1}: {item.claim}</CardTitle>
                  <CardDescription>{item.source} <span>· {item.locator}</span></CardDescription>
                </CardHeader>
              </Card>
            ))}
          </ScrollArea>
        </TabsContent>

        <TabsContent className="min-h-0" value="artifacts">
          <div className="grid gap-3">
            {result.artifacts.map((artifact) => (
              <Card className="rounded-2xl border border-border bg-card" key={artifact}>
                <CardContent className="flex items-center gap-3 p-4"><FileCheck2Icon className="size-5 text-primary" /><div><strong>{isUrl(artifact) ? artifactName(artifact) : artifact}</strong><span className="block text-sm text-muted-foreground">{isUrl(artifact) ? <a className="underline underline-offset-4" href={artifact} rel="noreferrer" target="_blank">Open generated artifact</a> : "Generated with the reviewed answer"}</span></div></CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent className="min-h-0" value="trace">
          <ol className="grid gap-3">
            <li className="flex gap-3 rounded-2xl border border-border bg-card p-4"><Link2Icon className="size-5 shrink-0 text-primary" /><div><strong>Sources retrieved</strong><span className="block text-sm text-muted-foreground">Approved scope limited the evidence set.</span></div></li>
            <li className="flex gap-3 rounded-2xl border border-border bg-card p-4"><GitBranchIcon className="size-5 shrink-0 text-primary" /><div><strong>Claims validated</strong><span className="block text-sm text-muted-foreground">Material statements were matched to source locators.</span></div></li>
            <li className="flex gap-3 rounded-2xl border border-border bg-card p-4"><FileCheck2Icon className="size-5 shrink-0 text-primary" /><div><strong>Artifact assembled</strong><span className="block text-sm text-muted-foreground">Answer, flags, and citations were packaged together.</span></div></li>
          </ol>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function isUrl(value: string) {
  return /^https?:\/\//.test(value) || value.startsWith("/api/");
}

function artifactName(value: string) {
  try {
    const parsed = new URL(value, window.location.origin);
    const pathValue = parsed.searchParams.get("path") || parsed.pathname;
    return decodeURIComponent(pathValue.split("/").filter(Boolean).pop() || value);
  } catch {
    return value;
  }
}
