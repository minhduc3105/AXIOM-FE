import {
  BotIcon,
  BrainCircuitIcon,
  Building2Icon,
  DatabaseIcon,
  FileTextIcon,
  MessageSquarePlusIcon,
  MoreHorizontalIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import type { AppSurface } from "@/app/routing/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";

type WorkspacePrimaryNavigationProps = {
  expanded: boolean;
  surface: AppSurface;
  showOrganization: boolean;
  moreMenuSide?: "right" | "bottom";
  onNewChat: () => void;
  onData: () => void;
  onReports: () => void;
  onMemory: () => void;
  onModels: () => void;
  onTools: () => void;
  onOrganizationAdministration: () => void;
};

const primaryButtonClass =
  "h-9 gap-2 rounded-lg text-muted-foreground shadow-none hover:bg-muted/70 hover:text-foreground data-[active=true]:bg-muted/70 data-[active=true]:text-foreground dark:hover:bg-muted/45 dark:data-[active=true]:bg-muted/45";

function navigationButtonClass(expanded: boolean) {
  return cn(
    primaryButtonClass,
    expanded
      ? "w-full justify-start px-2.5"
      : "size-9 justify-center gap-0 !p-0",
  );
}

function NavigationLabel({
  expanded,
  children,
}: {
  expanded: boolean;
  children: string;
}) {
  return (
    <span className={cn("truncate", expanded ? "block" : "sr-only")}>
      {children}
    </span>
  );
}

function NavigationButton({
  expanded,
  active = false,
  label,
  icon: Icon,
  onClick,
}: {
  expanded: boolean;
  active?: boolean;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={navigationButtonClass(expanded)}
      data-active={active}
      aria-label={label}
      onClick={onClick}
    >
      <Icon className="size-[18px]" aria-hidden="true" />
      <NavigationLabel expanded={expanded}>{label}</NavigationLabel>
    </Button>
  );
}

export function WorkspacePrimaryNavigation({
  expanded,
  surface,
  showOrganization,
  moreMenuSide = "right",
  onNewChat,
  onData,
  onReports,
  onMemory,
  onModels,
  onTools,
  onOrganizationAdministration,
}: WorkspacePrimaryNavigationProps) {
  const secondaryActive = ["models", "memory", "tools", "organization"].includes(
    surface,
  );

  return (
    <nav
      className={cn(
        "grid gap-0.5",
        expanded ? "w-full" : "w-full justify-items-center",
      )}
      aria-label="Workspace"
    >
      <NavigationButton
        expanded={expanded}
        label="New chat"
        icon={MessageSquarePlusIcon}
        onClick={onNewChat}
      />
      <NavigationButton
        expanded={expanded}
        active={surface === "data"}
        label="Data"
        icon={DatabaseIcon}
        onClick={onData}
      />
      <NavigationButton
        expanded={expanded}
        active={surface === "reports"}
        label="Report"
        icon={FileTextIcon}
        onClick={onReports}
      />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              className={cn(
                navigationButtonClass(expanded),
                "aria-expanded:bg-muted/70 aria-expanded:text-foreground dark:aria-expanded:bg-muted/45",
              )}
              data-active={secondaryActive}
              aria-label="More"
            />
          }
        >
          <MoreHorizontalIcon className="size-[18px]" aria-hidden="true" />
          <NavigationLabel expanded={expanded}>More</NavigationLabel>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-48 rounded-2xl p-1.5"
          side={moreMenuSide}
          align="start"
          sideOffset={8}
        >
          <DropdownMenuItem className="h-9 gap-2 rounded-lg" onClick={onModels}>
            <BotIcon className="size-[18px]" />
            Models
          </DropdownMenuItem>
          <DropdownMenuItem className="h-9 gap-2 rounded-lg" onClick={onMemory}>
            <BrainCircuitIcon className="size-[18px]" />
            Memory
          </DropdownMenuItem>
          <DropdownMenuItem className="h-9 gap-2 rounded-lg" onClick={onTools}>
            <WrenchIcon className="size-[18px]" />
            Tools
          </DropdownMenuItem>
          {showOrganization && (
            <DropdownMenuItem
              className="h-9 gap-2 rounded-lg"
              onClick={onOrganizationAdministration}
            >
              <Building2Icon className="size-[18px]" />
              Organization
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
