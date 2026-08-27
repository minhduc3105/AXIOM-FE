import { useState } from "react";
import {
  BotIcon,
  BrainCircuitIcon,
  Building2Icon,
  DatabaseIcon,
  FileTextIcon,
  MessageSquarePlusIcon,
  MoreHorizontalIcon,
  WrenchIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";
import type { AppSurface } from "@/app/routing/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";

type WorkspacePrimaryNavigationProps = {
  expanded: boolean;
  surface: AppSurface;
  showOrganization: boolean;
  /** @deprecated More is now an inline expanding section. */
  moreMenuSide?: "right" | "bottom";
  onNewChat: () => void;
  onData: () => void;
  onReports: () => void;
  onMemory: () => void;
  onModels: () => void;
  onTools: () => void;
  onSkills: () => void;
  onOrganizationAdministration: () => void;
};

const primaryButtonClass =
  "h-9 cursor-pointer gap-2 rounded-lg text-muted-foreground shadow-none hover:bg-muted/70 hover:text-foreground data-[active=true]:bg-muted/70 data-[active=true]:text-foreground dark:hover:bg-muted/45 dark:data-[active=true]:bg-muted/45";

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

function MoreNavigationMenu({
  expanded,
  active,
  showOrganization,
  onModels,
  onMemory,
  onTools,
  onSkills,
  onOrganizationAdministration,
}: {
  expanded: boolean;
  active: boolean;
  showOrganization: boolean;
  onModels: () => void;
  onMemory: () => void;
  onTools: () => void;
  onSkills: () => void;
  onOrganizationAdministration: () => void;
}) {
  const [open, setOpen] = useState(false);

  const closeAfterNavigate = (callback: () => void) => {
    setOpen(false);
    callback();
  };

  return (
    <div className="grid gap-0.5">
      <Button
        type="button"
        variant="ghost"
        className={cn(
          navigationButtonClass(expanded),
          "cursor-pointer aria-expanded:bg-muted/70 aria-expanded:text-foreground dark:aria-expanded:bg-muted/45",
        )}
        data-active={active}
        aria-label="More"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontalIcon className="size-[18px]" aria-hidden="true" />
        <NavigationLabel expanded={expanded}>More</NavigationLabel>
      </Button>
      {open && (
        <div className={cn("grid gap-0.5", expanded ? "pl-4" : "pl-0")}>
          <Button
            role="menuitem"
            type="button"
            variant="ghost"
            className={navigationButtonClass(expanded)}
            onClick={() => closeAfterNavigate(onModels)}
          >
            <BotIcon className="size-[18px]" />
            <NavigationLabel expanded={expanded}>Models</NavigationLabel>
          </Button>
          <Button
            role="menuitem"
            type="button"
            variant="ghost"
            className={navigationButtonClass(expanded)}
            onClick={() => closeAfterNavigate(onMemory)}
          >
            <BrainCircuitIcon className="size-[18px]" />
            <NavigationLabel expanded={expanded}>Memory</NavigationLabel>
          </Button>
          <Button
            role="menuitem"
            type="button"
            variant="ghost"
            className={navigationButtonClass(expanded)}
            onClick={() => closeAfterNavigate(onTools)}
          >
            <WrenchIcon className="size-[18px]" />
            <NavigationLabel expanded={expanded}>Tools</NavigationLabel>
          </Button>
          <Button
            role="menuitem"
            type="button"
            variant="ghost"
            className={navigationButtonClass(expanded)}
            onClick={() => closeAfterNavigate(onSkills)}
          >
            <SparklesIcon className="size-[18px]" />
            <NavigationLabel expanded={expanded}>Skills</NavigationLabel>
          </Button>
          {showOrganization && (
            <Button
              role="menuitem"
              type="button"
              variant="ghost"
              className={navigationButtonClass(expanded)}
              onClick={() => closeAfterNavigate(onOrganizationAdministration)}
            >
              <Building2Icon className="size-[18px]" />
              <NavigationLabel expanded={expanded}>
                Organization
              </NavigationLabel>
            </Button>
          )}
        </div>
      )}
    </div>
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
  onSkills,
  onOrganizationAdministration,
}: WorkspacePrimaryNavigationProps) {
  const secondaryActive = [
    "models",
    "memory",
    "tools",
    "skills",
    "organization",
  ].includes(surface);

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

      <MoreNavigationMenu
        expanded={expanded}
        active={secondaryActive}
        showOrganization={showOrganization}
        onModels={onModels}
        onMemory={onMemory}
        onTools={onTools}
        onSkills={onSkills}
        onOrganizationAdministration={onOrganizationAdministration}
      />
    </nav>
  );
}
