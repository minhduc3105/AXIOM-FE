export function UserMessage({ question }: { question: string }) {
  return (
    <div className="flex items-end justify-end gap-3">
      <div className="max-w-[min(72%,680px)] rounded-[18px] bg-[#2456e8] px-4 py-3 text-white shadow-[0_8px_22px_rgba(36,86,232,0.22)]">
        <p className="text-sm leading-relaxed break-words">{question}</p>
      </div>
    </div>
  );
}
