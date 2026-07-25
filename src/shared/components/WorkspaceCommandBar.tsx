import { MoonIcon, PlusIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/app/ThemeProvider";
import { useMediaQuery } from "@/shared/hooks/use-media-query";

export function WorkspaceCommandBar({
  onHome,
  onNewChat,
  onData,
  onReports,
}: {
  onHome: () => void;
  onNewChat: () => void;
  onData: () => void;
  onReports: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const mobile = useMediaQuery("(max-width: 767px)");

  return (
    <header className="sticky top-4 z-30 mx-auto grid min-h-14 w-[min(1040px,calc(100%_-_48px))] translate-y-4 grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-full border border-[#d8d0c2]/70 bg-[#fffdf8]/85 px-4 py-2 shadow-[0_18px_54px_rgba(19,18,14,0.10)] backdrop-blur-xl dark:border-[#38372f]/70 dark:bg-[#1a1a17]/85 max-sm:w-[calc(100%_-_24px)] max-sm:grid-cols-[minmax(0,1fr)_auto] max-sm:rounded-2xl">
      <div className="max-sm:hidden" aria-hidden="true" />
      <nav
        className="flex min-w-0 items-center justify-center gap-1 max-sm:justify-start max-sm:overflow-x-auto"
        aria-label="Workspace sections"
      >
        <Button variant="ghost" size="sm" onClick={onHome}>
          Homepage
        </Button>
        <Button variant="ghost" size="sm" onClick={onNewChat}>
          Chat
        </Button>
        <Button variant="ghost" size="sm" onClick={onData}>
          Data
        </Button>
        <Button variant="ghost" size="sm" onClick={onReports}>
          Report
        </Button>
      </nav>
      <div className="flex items-center justify-end gap-2">
        {mobile && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="+ New chat"
            onClick={onNewChat}
          >
            <PlusIcon />
          </Button>
        )}
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
