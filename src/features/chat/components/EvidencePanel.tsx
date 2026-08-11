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
        <SheetContent className="!w-[min(500px,100vw)] overflow-y-auto border-[#d8d0c2] bg-[#fffdf8] p-4 dark:border-[#38372f] dark:bg-[#1a1a17]" side="right" showCloseButton={false} aria-label="Evidence">
          <SheetHeader className="sr-only">
            <SheetTitle>Evidence</SheetTitle>
            <SheetDescription>Sources, artifacts, and trace information for the reviewed answer.</SheetDescription>
          </SheetHeader>
          <EvidenceContent result={result} onClose={onClose} />
        </SheetContent>
      </Sheet>
    )
  }

  return <aside className="sticky top-28 max-h-[calc(100dvh-128px)] min-h-[560px] w-full self-start overflow-hidden rounded-[24px] border border-[#d8d0c2]/90 bg-[#fffdf8]/92 shadow-[0_18px_54px_rgba(24,24,18,0.10)] backdrop-blur-2xl dark:border-[#38372f]/90 dark:bg-[#1a1a17]/92 dark:shadow-[0_18px_54px_rgba(0,0,0,0.24)]" aria-label="Evidence"><EvidenceContent result={result} onClose={onClose} /></aside>
}

function EvidenceContent({ result, onClose }: { result: MockResult; onClose: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col p-5">
      <header className="mb-4 flex items-start justify-between gap-4 border-b border-[#d8d0c2]/80 pb-4 dark:border-[#38372f]/80">
        <div>
          <h2 className="text-2xl font-semibold leading-none">Evidence</h2>
          <p className="mt-2 max-w-[28rem] text-sm leading-relaxed text-[#6d685e] dark:text-[#aaa397]">Check each claim against the source used to approve the answer.</p>
        </div>
        <Button variant="ghost" size="icon" className="size-9 shrink-0 rounded-full border border-[#d8d0c2] bg-[#f4efe5]/88 text-[#6d685e] hover:bg-[#ebe4d8] hover:text-[#191915] dark:border-[#38372f] dark:bg-[#292923] dark:text-[#aaa397] dark:hover:bg-white/10 dark:hover:text-white" onClick={onClose} type="button" aria-label="Close evidence"><XIcon /></Button>
      </header>

      <div className="mb-4 grid gap-3 rounded-2xl border border-[#d8d0c2] bg-[#f4efe5]/82 p-4 dark:border-[#38372f] dark:bg-[#292923]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-[#6d685e] dark:text-[#aaa397]">Coverage</span>
          <strong className="text-lg leading-none">{result.evidence.length}/{result.evidence.length} cited</strong>
        </div>
        <div className="grid grid-cols-4 gap-1" aria-hidden="true">
          {result.evidence.map((item) => <span className="h-1.5 rounded-full bg-[#2456e8] dark:bg-[#7895ff]" key={item.id} />)}
        </div>
      </div>

      <Tabs className="min-h-0 flex-1 space-y-4" defaultValue="sources">
        <TabsList variant="line" className="border-b border-[#d8d0c2]/80 pb-1 dark:border-[#38372f]/80" aria-label="Evidence views">
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
          <TabsTrigger value="trace">Trace</TabsTrigger>
        </TabsList>

        <TabsContent className="min-h-0" value="sources">
          <ScrollArea className="h-[min(420px,calc(100dvh-382px))] pr-2">
            {result.evidence.map((item, index) => (
              <Card className="mb-3 rounded-2xl border border-[#d8d0c2] bg-[#fffdf8]/86 shadow-[0_10px_28px_rgba(24,24,18,0.05)] transition-transform duration-300 hover:-translate-y-0.5 hover:border-[#2456e8]/25 dark:border-[#38372f] dark:bg-[#20201c] dark:hover:border-[#7895ff]/30" data-tone={item.tone} key={item.id}>
                <CardHeader className="gap-2 p-4">
                  <div className="flex items-center gap-2">
                    <Badge className="rounded-lg bg-[#2456e8] text-white" variant="outline">{item.id}</Badge>
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
              <Card className="rounded-2xl border border-[#d8d0c2] bg-[#fffdf8]/86 dark:border-[#38372f] dark:bg-[#20201c]" key={artifact}>
                <CardContent className="flex items-center gap-3 p-4"><FileCheck2Icon className="size-5 text-[#2456e8]" /><div><strong>{isUrl(artifact) ? artifactName(artifact) : artifact}</strong><span className="block text-sm text-[#6d685e] dark:text-[#aaa397]">{isUrl(artifact) ? <a className="underline underline-offset-4" href={artifact} rel="noreferrer" target="_blank">Open generated artifact</a> : "Generated with the reviewed answer"}</span></div></CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent className="min-h-0" value="trace">
          <ol className="grid gap-3">
            <li className="flex gap-3 rounded-2xl border border-[#d8d0c2] bg-[#fffdf8]/86 p-4 dark:border-[#38372f] dark:bg-[#20201c]"><Link2Icon className="size-5 shrink-0 text-[#2456e8]" /><div><strong>Sources retrieved</strong><span className="block text-sm text-[#6d685e] dark:text-[#aaa397]">Approved scope limited the evidence set.</span></div></li>
            <li className="flex gap-3 rounded-2xl border border-[#d8d0c2] bg-[#fffdf8]/86 p-4 dark:border-[#38372f] dark:bg-[#20201c]"><GitBranchIcon className="size-5 shrink-0 text-[#2456e8]" /><div><strong>Claims validated</strong><span className="block text-sm text-[#6d685e] dark:text-[#aaa397]">Material statements were matched to source locators.</span></div></li>
            <li className="flex gap-3 rounded-2xl border border-[#d8d0c2] bg-[#fffdf8]/86 p-4 dark:border-[#38372f] dark:bg-[#20201c]"><FileCheck2Icon className="size-5 shrink-0 text-[#2456e8]" /><div><strong>Artifact assembled</strong><span className="block text-sm text-[#6d685e] dark:text-[#aaa397]">Answer, flags, and citations were packaged together.</span></div></li>
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
