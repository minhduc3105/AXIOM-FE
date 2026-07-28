import { useRef } from "react";
import type { ChangeEvent } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRightIcon,
  CheckIcon,
  DatabaseZapIcon,
  UploadCloudIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/shared/lib/utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type ChooseSourceProps = {
  onUpload: (files: FileList) => void;
  onConnect: () => void;
};

const cards = [
  {
    badge: "UP",
    title: "Upload files",
    kicker: "Batch intake",
    copy: "Bring CSV, JSON, PDF, Markdown, or Parquet files into the workspace.",
    items: [
      "Multi-file drag and drop",
      "Schema preview before indexing",
      "Best for one-time reviews",
    ],
    button: "Choose files",
    type: "upload" as const,
    image: "https://picsum.photos/seed/axiom-file-intake/900/620",
  },
  {
    badge: "DB",
    title: "Connect source",
    kicker: "Live sync",
    copy: "Connect a database or warehouse and keep governed data available for refreshes.",
    items: [
      "20+ warehouse connectors",
      "Credential test before saving",
      "Best for scheduled data",
    ],
    button: "Browse data sources",
    type: "connect" as const,
    image: "https://picsum.photos/seed/axiom-data-source/900/620",
  },
];

export function ChooseSource({ onUpload, onConnect }: ChooseSourceProps) {
  const root = useRef<HTMLDivElement>(null);
  const uploadInputId = "axiom-upload-input";
  const selectCard = (type: "upload" | "connect") =>
    type === "connect"
      ? onConnect()
      : document.getElementById(uploadInputId)?.click();

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        ".source-choice-card",
        { y: 42, scale: 0.96, opacity: 0 },
        {
          y: 0,
          scale: 1,
          opacity: 1,
          stagger: 0.08,
          duration: 0.8,
          ease: "power3.out",
        },
      );
      gsap.fromTo(
        ".source-choice-image",
        { scale: 0.88, opacity: 0.65 },
        {
          scale: 1,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top 78%",
            end: "bottom 42%",
            scrub: true,
          },
        },
      );
    },
    { scope: root },
  );

  return (
    <>
      <Input
        id={uploadInputId}
        className="sr-only"
        type="file"
        multiple
        accept=".csv,.json,.pdf,.md,.markdown,.parquet,.xlsx"
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          event.target.files && onUpload(event.target.files)
        }
      />
      <div ref={root} className="grid grid-flow-dense gap-5 lg:grid-cols-2">
        {cards.map((card) => (
          <Card
            className={cn(
              "source-choice-card group relative overflow-hidden rounded-[28px] border border-[#d8d0c2] bg-[#fffdf8]/88 p-0 shadow-[0_18px_54px_rgba(24,24,18,0.08)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#2456e8]/35 hover:shadow-[0_24px_70px_rgba(24,24,18,0.12)] dark:border-[#38372f] dark:bg-[#1a1a17]/90 dark:hover:border-[#7895ff]/35",
              card.type === "connect" &&
                "border-[#2456e8]/55 bg-[#fffdf8]/94 dark:border-[#7895ff]/45",
            )}
            key={card.title}
          >
            <div className="grid min-h-[386px] grid-rows-[128px_minmax(0,1fr)]">
              <div className="relative overflow-hidden border-b border-[#d8d0c2]/70 dark:border-[#38372f]/80">
                <img
                  className="source-choice-image h-full w-full object-cover opacity-82 grayscale-[28%] contrast-110 saturate-75 transition duration-700 ease-out group-hover:scale-105 group-hover:grayscale-[8%] group-hover:opacity-95"
                  src={card.image}
                  alt=""
                  aria-hidden="true"
                />
                <div
                  className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,17,15,0.46),rgba(17,17,15,0.10)_52%,rgba(244,239,229,0.18))]"
                  aria-hidden="true"
                />
                <span className="absolute left-5 top-5 grid size-11 place-items-center rounded-2xl bg-[#2456e8] text-xs font-black text-white shadow-[0_14px_34px_rgba(36,86,232,0.28)] dark:bg-[#7895ff] dark:text-[#0e142c]">
                  {card.badge}
                </span>
              </div>
              <div className="flex min-h-0 flex-col p-6 gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2456e8] dark:text-[#7895ff]">
                      {card.kicker}
                    </span>
                    <h2 className="mt-2 text-[clamp(2rem,3vw,3rem)] font-semibold leading-[0.95] tracking-normal">
                      {card.title}
                    </h2>
                  </div>
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[#d8d0c2] bg-[#f4efe5] text-[#2456e8] dark:border-[#38372f] dark:bg-[#292923] dark:text-[#7895ff]">
                    {card.type === "upload" ? (
                      <UploadCloudIcon className="size-5" />
                    ) : (
                      <DatabaseZapIcon className="size-5" />
                    )}
                  </span>
                </div>
                <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#6d685e] dark:text-[#aaa397]">
                  {card.copy}
                </p>
                <ul className="mt-5 grid gap-2.5">
                  {card.items.map((item) => (
                    <li
                      className="flex items-center gap-2 text-sm text-[#5f594f] dark:text-[#aaa397]"
                      key={item}
                    >
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#eef2ff] text-[#2456e8] dark:bg-[#202844] dark:text-[#7895ff]">
                        <CheckIcon className="size-3" />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={cn(
                    "mt-auto h-11 rounded-full px-5",
                    card.type === "connect"
                      ? "bg-[#2456e8] text-white hover:bg-[#1d48c7] dark:bg-[#7895ff] dark:text-[#0e142c] dark:hover:bg-[#9aafff]"
                      : "border border-[#d8d0c2] bg-[#fffdf8] text-[#191915] hover:bg-[#f4efe5] dark:border-[#38372f] dark:bg-[#20201c] dark:text-[#eee8dc] dark:hover:bg-white/10",
                  )}
                  onClick={() => selectCard(card.type)}
                  type="button"
                >
                  {card.button}
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        <div className="source-choice-card flex items-center gap-4 rounded-[22px] border border-[#d8d0c2] bg-[#fffdf8]/72 p-4 shadow-[0_14px_40px_rgba(24,24,18,0.05)] backdrop-blur-xl dark:border-[#38372f] dark:bg-[#1a1a17]/78 max-md:flex-col max-md:items-start lg:col-span-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#eef2ff] text-[#2456e8] dark:bg-[#202844] dark:text-[#7895ff]">
            <CheckIcon className="size-4" />
          </span>
          <div className="grid gap-1">
            <strong>You can switch source types later</strong>
            <small className="text-sm text-[#6d685e] dark:text-[#aaa397]">
              Upload and connection flows stay separate so permissions, refresh
              behavior, and lineage remain clear.
            </small>
          </div>
          <span className="ml-auto text-sm font-semibold text-[#2456e8] dark:text-[#7895ff] max-md:ml-0">
            Choose an option above
          </span>
        </div>
      </div>
    </>
  );
}
