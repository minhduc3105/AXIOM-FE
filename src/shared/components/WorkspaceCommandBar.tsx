import { MoonIcon, PlusIcon, SearchIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { AppSurface } from "@/app/routing/types";
import { useTheme } from "@/app/ThemeProvider";
import { useMediaQuery } from "@/shared/hooks/use-media-query";

export function WorkspaceCommandBar({
  surface,
  onNewChat,
}: {
  surface: AppSurface;
  onNewChat: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const mobile = useMediaQuery("(max-width: 767px)");

  return (
    <header className="sticky top-4 z-30 mx-auto flex min-h-14 w-[min(1040px,calc(100%_-_48px))] translate-y-4 items-center justify-between gap-4 rounded-full border border-[#d8d0c2]/70 bg-[#fffdf8]/85 px-4 py-2 shadow-[0_18px_54px_rgba(19,18,14,0.10)] backdrop-blur-xl dark:border-[#38372f]/70 dark:bg-[#1a1a17]/85 max-sm:w-[calc(100%_-_24px)] max-sm:rounded-2xl">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="text-xs text-[#6d685e] max-sm:hidden dark:text-[#aaa397]">
          AXIOM workspace
        </span>
        <strong>
          {surface === "chat" ? "Investigation" : "Data ingestion"}
        </strong>
      </div>
      <div className="flex items-center gap-2">
        {mobile && surface === "chat" && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="+ New chat"
            onClick={onNewChat}
          >
            <PlusIcon />
          </Button>
        )}
        <Button variant="ghost" size="sm">
          <SearchIcon data-icon="inline-start" />
          Quick find
        </Button>
        <Separator orientation="vertical" className="h-6 max-sm:hidden" />
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            resolvedTheme === "dark" ? "Use light theme" : "Use dark theme"
          }
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
        </Button>
      </div>
    </header>
  );
}
