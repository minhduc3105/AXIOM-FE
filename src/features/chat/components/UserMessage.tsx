export function UserMessage({ question }: { question: string }) {
  return (
    <div className="flex items-end justify-end gap-3">
      <div className="max-w-[min(72%,680px)] rounded-[18px_18px_5px_18px] bg-[#2456e8] px-4 py-3 text-white shadow-[0_8px_22px_rgba(36,86,232,0.22)]">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.04em] text-white/70">You</span>
        <p className="text-sm leading-relaxed break-words">{question}</p>
      </div>
      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[#c7d2fe] bg-[#eef2ff] text-xs font-bold text-[#1018a2]" aria-hidden="true">Y</span>
    </div>
  )
}
