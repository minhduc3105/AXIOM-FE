import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowDownRightIcon,
  DatabaseIcon,
  FileCheck2Icon,
  FingerprintIcon,
  RouteIcon,
  ScanSearchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/shared/lib/utils";
import { ChatComposer } from "./ChatComposer";
import { OutcomeCarousel } from "./OutcomeCarousel";
import { WorkflowAccordion } from "./WorkflowAccordion";
import type {
  ChatEngine,
  ChatExecutionMode,
  ChatModelOption,
} from "../model/types";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type WelcomeWorkspaceProps = {
  engine: ChatEngine;
  executionMode: ChatExecutionMode;
  models: ChatModelOption[];
  selectedModelAlias: string | null;
  onSubmit: (
    value: string,
    engine: ChatEngine,
    files: File[],
    modelAlias?: string | null,
    executionMode?: ChatExecutionMode,
  ) => void;
  onEngineChange: (engine: ChatEngine) => void;
  onExecutionModeChange: (mode: ChatExecutionMode) => void;
  onModelChange: (modelAlias: string | null) => void;
  onData: () => void;
};

const narrative =
  "Every answer remains connected to intent, process, evidence, and the decision that approved it.";

const bentoCards = [
  {
    className: "md:col-span-7",
    icon: FileCheck2Icon,
    title: "Answers arrive as reviewable artifacts",
    copy: "Result, citations, trace, and policy posture live together instead of being reconstructed later.",
    image: "https://picsum.photos/seed/axiom-reviewed-artifact/720/520",
  },
  {
    className: "md:col-span-5",
    icon: FingerprintIcon,
    title: "Source gravity",
    copy: "Claims stay attached to rows, chunks, pages, and connector lineage.",
    image: "https://picsum.photos/seed/axiom-source-lineage/720/520",
  },
  {
    className: "md:col-span-4",
    icon: RouteIcon,
    title: "Human control",
    copy: "Intent and scope remain editable until the workflow is approved.",
    image: "https://picsum.photos/seed/axiom-human-control/720/520",
  },
  {
    className: "md:col-span-8",
    icon: ScanSearchIcon,
    title: "Repository ready",
    copy: "Connect, profile, index, investigate, and review from one operational surface.",
    image: "https://picsum.photos/seed/axiom-index-repository/720/520",
  },
];

export function WelcomeWorkspace({
  engine,
  executionMode,
  models,
  selectedModelAlias,
  onSubmit,
  onEngineChange,
  onExecutionModeChange,
  onModelChange,
  onData,
}: WelcomeWorkspaceProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.fromTo(
        ".reveal-word",
        { opacity: 0.12 },
        {
          opacity: 1,
          stagger: 0.08,
          ease: "none",
          scrollTrigger: {
            trigger: ".welcome-narrative",
            start: "top 82%",
            end: "bottom 48%",
            scrub: true,
          },
        },
      );

      gsap.fromTo(
        ".artifact-stack-card",
        { y: 72, scale: 0.92, opacity: 0 },
        {
          y: 0,
          scale: 1,
          opacity: 1,
          stagger: 0.12,
          duration: 0.9,
          ease: "power3.out",
        },
      );
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      className="mx-auto w-[min(1440px,100%)] px-5 pb-16 pt-8 sm:px-8 sm:pt-10 lg:px-12"
    >
      <section className="grid min-h-[min(760px,calc(100dvh-var(--app-top-bar-height)-2rem))] place-items-center py-12 text-center">
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center">
          <h1 className="w-full max-w-6xl text-balance text-[clamp(3rem,6vw,6.25rem)] font-semibold leading-[0.9] tracking-normal text-[#191915] dark:text-[#eee8dc]">
            What should AXIOM{" "}
            <span
              className="mx-2 inline-flex h-[clamp(38px,5vw,62px)] w-[clamp(86px,11vw,156px)] translate-y-1 overflow-hidden rounded-full align-middle shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45),0_18px_42px_rgba(0,0,0,0.16)]"
              aria-hidden="true"
            >
              <img
                className="h-full w-full object-cover grayscale-[20%] contrast-125 saturate-75"
                src="https://picsum.photos/seed/axiom-evidence-table/360/160"
                alt=""
              />
            </span>{" "}
            investigate?
          </h1>
          <p className="mt-7 max-w-3xl text-[clamp(1.08rem,1.7vw,1.35rem)] leading-relaxed text-[#6d685e] dark:text-[#aaa397]">
            Define the question, approve the scope, watch the workflow, and
            review an answer with evidence attached.
          </p>
          <ChatComposer
            className="mt-9 max-w-3xl"
            engine={engine}
            executionMode={executionMode}
            models={models}
            selectedModelAlias={selectedModelAlias}
            onEngineChange={onEngineChange}
            onExecutionModeChange={onExecutionModeChange}
            onModelChange={onModelChange}
            onSubmit={onSubmit}
          />
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm text-[#6d685e] dark:text-[#aaa397]">
            <Button
              className="h-12 min-w-[136px] justify-center gap-2 rounded-full bg-[#191915] px-5 text-[#f4efe5] hover:bg-[#2b2a25] dark:bg-[#eee8dc] dark:text-[#11110f] dark:hover:bg-white"
              variant="ghost"
              onClick={onData}
            >
              <DatabaseIcon className="size-4 shrink-0" />
              <span className="leading-none">Manage data</span>
            </Button>
            <span>CSV, documents, MySQL, and indexed repositories</span>
          </div>
        </div>

        <div
          className="pointer-events-none relative mt-16 h-[420px] w-full max-w-5xl overflow-hidden rounded-[36px] border border-white/45 shadow-[0_32px_100px_rgba(28,25,18,0.22)]"
          aria-label="Example reviewed artifact"
        >
          <img
            className="absolute inset-0 h-full w-full object-cover opacity-90 grayscale-[18%] contrast-125 saturate-75"
            src="https://picsum.photos/seed/axiom-analytic-review/1400/760"
            alt=""
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.22),transparent_38%),linear-gradient(180deg,rgba(17,17,15,0.12),rgba(17,17,15,0.58))]"
            aria-hidden="true"
          />
          <Card className="artifact-stack-card pointer-events-auto absolute bottom-24 left-5 w-[min(410px,calc(100%_-_40px))] rounded-3xl border border-white/50 bg-[#fffdf8]/90 shadow-[0_24px_72px_rgba(0,0,0,0.20)] backdrop-blur-xl md:left-10">
            <CardHeader className="gap-3">
              <span className="text-xs text-[#6d685e]">Reviewed answer</span>
              <CardTitle className="text-2xl leading-tight text-[#191915]">
                Revenue concentration is material but explainable.
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 text-[#2456e8]">
                <strong className="text-5xl leading-none">94%</strong>
                <span>evidence coverage</span>
              </div>
            </CardContent>
          </Card>
          <Card className="artifact-stack-card pointer-events-auto absolute bottom-6 right-5 w-[min(360px,calc(100%_-_40px))] rounded-3xl border border-white/50 bg-[#fffdf8]/90 shadow-[0_24px_72px_rgba(0,0,0,0.18)] backdrop-blur-xl md:right-10">
            <CardHeader>
              <CardDescription>Attached evidence</CardDescription>
              <CardTitle className="text-xl">payments_q3.csv</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section
        className="py-28 md:py-44"
        aria-label="AXIOM operating principle"
      >
        <p className="max-w-6xl text-[clamp(2.5rem,5.4vw,6rem)] leading-[0.96] tracking-normal text-[#191915] dark:text-[#eee8dc]">
          {narrative.split(" ").map((word, index) => (
            <span className="reveal-word opacity-20" key={`${word}-${index}`}>
              {word}{" "}
            </span>
          ))}
        </p>
      </section>

      <section
        className="grid grid-flow-dense grid-cols-1 overflow-hidden rounded-[32px] border border-[#d8d0c2] bg-[#d8d0c2] md:grid-cols-12"
        aria-label="AXIOM capabilities"
      >
        {bentoCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              className={cn(
                "group relative min-h-[300px] overflow-hidden rounded-none border-0 bg-[#fffdf8] py-0 dark:bg-[#1a1a17]",
                card.className,
              )}
              key={card.title}
            >
              <div
                className="absolute bottom-5 right-5 aspect-[4/3] w-[min(240px,38%)] overflow-hidden rounded-3xl"
                aria-hidden="true"
              >
                <img
                  className="h-full w-full object-cover opacity-80 grayscale contrast-125 transition duration-700 ease-out group-hover:scale-105 group-hover:opacity-95 group-hover:grayscale-0"
                  src={card.image}
                  alt=""
                />
              </div>
              <CardHeader className="relative z-10 max-w-xl gap-4 p-8 md:p-10">
                <Icon className="size-8 text-[#2456e8] dark:text-[#7895ff]" />
                <CardTitle className="text-[clamp(1.45rem,2.2vw,2.4rem)] leading-none tracking-normal">
                  {card.title}
                </CardTitle>
                <CardDescription className="max-w-lg text-base leading-relaxed text-[#6d685e] dark:text-[#aaa397]">
                  {card.copy}
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </section>

      <section
        className="pt-28 md:pt-44"
        aria-labelledby="workflow-modes-title"
      >
        <div className="mb-10 grid items-end gap-8 md:grid-cols-[240px_minmax(0,760px)]">
          <span className="text-[#6d685e] dark:text-[#aaa397]">
            From question to evidence
          </span>
          <h2
            className="text-[clamp(2.2rem,4.4vw,5rem)] leading-none tracking-normal"
            id="workflow-modes-title"
          >
            One workspace, four operating modes.
          </h2>
        </div>
        <WorkflowAccordion />
      </section>

      <section
        className="pt-28 md:pt-44"
        aria-labelledby="reviewed-outcomes-title"
      >
        <div className="mb-10 grid items-end gap-8 md:grid-cols-[240px_minmax(0,760px)]">
          <span className="text-[#6d685e] dark:text-[#aaa397]">
            Review signals
          </span>
          <h2
            className="text-[clamp(2.2rem,4.4vw,5rem)] leading-none tracking-normal"
            id="reviewed-outcomes-title"
          >
            Built for decisions that need to hold up later.
          </h2>
        </div>
        <OutcomeCarousel />
      </section>

      <footer className="mt-28 flex flex-wrap justify-between gap-6 border-t border-[#d8d0c2] pt-8 text-sm md:mt-44 dark:border-[#38372f]">
        <strong>AXIOM</strong>
        <nav
          className="flex flex-wrap gap-5 text-[#6d685e] dark:text-[#aaa397]"
          aria-label="Product information"
        >
          <a href="#docs">Documentation</a>
          <a href="#privacy">Privacy</a>
          <a href="#status">System status</a>
          <a href="#shortcuts">Keyboard shortcuts</a>
        </nav>
      </footer>
    </div>
  );
}
