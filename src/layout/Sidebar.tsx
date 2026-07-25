import type { ChatStage } from "../features/chat/model/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Icon } from "./Icon";
import { Brand } from "./Brand";

type SidebarProps = {
  active: ChatStage;
  onNewChat: () => void;
  onIngestion: () => void;
};

const conversations = [
  "Create a reviewed Q3 revenue report, cite evidence, and flag missing customer data.",
  "Create html game environment for website",
  "Lorem Ipsum Project",
];

export function Sidebar({ active, onNewChat, onIngestion }: SidebarProps) {
  return (
    <aside className="fixed bottom-3 left-3 top-3 z-40 hidden w-80 overflow-hidden rounded-[28px] border border-[#393831]/80 bg-[#0b0b0a]/95 p-4 text-[#eee8dc] shadow-[0_24px_70px_rgba(0,0,0,0.26)] md:block">
      <div className="grid gap-4">
        <Brand />
        <Button
          className="h-12 justify-start rounded-2xl bg-[#7895ff] text-[#0e142c] hover:bg-[#9aafff]"
          onClick={onNewChat}
        >
          + &nbsp; New chat
        </Button>
      </div>

      <section className="mt-6">
        <span className="text-xs text-[#eee8dc]/65">Conversation vault</span>
        <ScrollArea className="mt-3 h-[min(300px,38vh)]">
          {conversations.map((conversation, index) => (
            <Button
              className={`mb-2 min-h-14 w-full justify-start gap-3 rounded-2xl border border-transparent px-3 text-left text-[#eee8dc]/75 hover:border-[#7895ff]/30 hover:bg-white/10 hover:text-white ${index === 0 && active !== "welcome" ? "border-[#7895ff]/40 bg-white/10 text-white" : ""}`}
              key={conversation}
            >
              <Icon name="message" size={24} />
              <span className="truncate">{conversation}</span>
            </Button>
          ))}
        </ScrollArea>
      </section>

      <div className="mt-6 grid gap-2">
        <Button
          className="h-12 justify-start gap-3 rounded-2xl text-[#eee8dc]/80 hover:bg-white/10 hover:text-white"
          variant="ghost"
          onClick={onIngestion}
        >
          <Icon name="import" size={32} />
          <span>Data</span>
        </Button>
        <Button
          className="h-12 justify-start gap-3 rounded-2xl text-[#eee8dc]/80 hover:bg-white/10 hover:text-white"
          variant="ghost"
        >
          <Icon name="settings" size={28} />
          <span>Settings</span>
        </Button>
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 border-t border-white/10 pt-4">
        <img
          className="size-11 rounded-full object-cover"
          src="https://www.figma.com/api/mcp/asset/456e95e3-44c6-4626-9d3e-f10a9b6c8e2e"
          alt="Son Nguyen"
        />
        <span>Son Nguyen</span>
        <Button
          className="ml-auto size-10 rounded-xl text-[#eee8dc]/80 hover:bg-white/10 hover:text-white"
          variant="ghost"
          aria-label="Log out"
        >
          <Icon name="logout" size={34} />
        </Button>
      </div>
    </aside>
  );
}
