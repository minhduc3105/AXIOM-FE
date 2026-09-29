import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangleIcon,
  ArrowDownAZIcon,
  ChevronDownIcon,
  PowerIcon,
  PowerOffIcon,
  RefreshCwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
} from "lucide-react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from "@/features/auth/model/AuthProvider";
import {
  getSkillRegistryErrorKind,
  shareSkillWithOrganization,
} from "./api/skillRegistryApi";
import { SkillCard } from "./components/SkillCard";
import { SkillCatalogSkeleton } from "./components/SkillCatalogSkeleton";
import {
  formatSkillLanguage,
  formatSkillName,
  isGeneralSkill,
} from "./model/skillPresentation";
import { useSkillCatalog } from "./model/useSkillCatalog";
import { useSkillsState } from "./model/SkillsProvider";
import type {
  SkillCatalogSort,
  SkillCatalogViewState,
  SkillStatusFilter,
  UserSkillSummary,
} from "./model/types";

type SkillsPageProps = {
  workspaceId: string | null;
  onOpenSkill: (
    skillId: string,
    returnViewState: SkillCatalogViewState,
  ) => void;
  viewState: SkillCatalogViewState;
  onViewStateChange: (viewState: SkillCatalogViewState) => void;
};

type BulkSkillAction = "enable" | "disable";

function SortDropdown({
  value,
  onValueChange,
}: {
  value: SkillCatalogSort;
  onValueChange: (value: SkillCatalogSort) => void;
}) {
  const options = [
    { value: "name", label: "Name A–Z" },
    { value: "language", label: "Language A–Z" },
    { value: "version", label: "Version" },
  ] as const;
  const selected = options.find((option) => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Sort skills by"
            className="justify-between rounded-full"
          />
        }
      >
        <ArrowDownAZIcon data-icon="inline-start" />
        <span>{selected?.label}</span>
        <ChevronDownIcon data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(nextValue) =>
            onValueChange(nextValue as SkillCatalogSort)
          }
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LanguageDropdown({
  value,
  languages,
  onValueChange,
}: {
  value?: string;
  languages: string[];
  onValueChange: (value: string | undefined) => void;
}) {
  const selectedLabel = value ? formatSkillLanguage(value) : "All languages";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Filter skills by language"
            className="justify-between rounded-full"
          />
        }
      >
        <SlidersHorizontalIcon data-icon="inline-start" />
        <span>{selectedLabel}</span>
        <ChevronDownIcon data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={value ?? "all"}
          onValueChange={(nextValue) =>
            onValueChange(nextValue === "all" ? undefined : nextValue)
          }
        >
          <DropdownMenuRadioItem value="all">
            All languages
          </DropdownMenuRadioItem>
          {languages.map((language) => (
            <DropdownMenuRadioItem key={language} value={language}>
              {formatSkillLanguage(language)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SkillSection({
  description,
  enabledSkills,
  disabledSkills,
  workspaceId,
  onOpenSkill,
  canManageOrganization,
  sharingSkillId,
  onSetOrganizationSharing,
  onBulkAction,
  bulkBusy,
}: {
  description: string;
  enabledSkills: UserSkillSummary[];
  disabledSkills: UserSkillSummary[];
  workspaceId: string | null;
  onOpenSkill: (skillId: string) => void;
  canManageOrganization: boolean;
  sharingSkillId: string | null;
  onSetOrganizationSharing: (skillId: string, enabled: boolean) => void;
  onBulkAction: (enabled: boolean) => void;
  bulkBusy: boolean;
}) {
  const groups = [
    { title: "Enabled", skills: enabledSkills },
    { title: "Disabled", skills: disabledSkills },
  ];

  return (
    <div className="grid gap-8">
      <p className="text-sm text-muted-foreground">{description}</p>
      {groups.map(({ title, skills: groupSkills }) =>
        groupSkills.length > 0 ? (
          <section
            key={title}
            aria-label={`${title} skills`}
            className="grid gap-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">
                  {title}
                </h2>
                <Badge
                  aria-hidden="true"
                  variant="outline"
                  className="h-5 rounded-full bg-card px-2 text-[10px] tabular-nums text-muted-foreground"
                >
                  {groupSkills.length}
                </Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 rounded-full px-3"
                onClick={() => onBulkAction(title === "Disabled")}
                disabled={bulkBusy}
              >
                {title === "Disabled" ? <PowerIcon /> : <PowerOffIcon />}
                {title === "Disabled"
                  ? "Enable all disabled skills"
                  : "Disable all active skills"}
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {groupSkills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  workspaceId={workspaceId}
                  onOpen={onOpenSkill}
                  canShareWithOrganization={
                    canManageOrganization &&
                    skill.is_owner &&
                    !isGeneralSkill(skill)
                  }
                  organizationSharingPending={sharingSkillId === skill.id}
                  onSetOrganizationSharing={onSetOrganizationSharing}
                />
              ))}
            </div>
          </section>
        ) : null,
      )}
    </div>
  );
}

function catalogErrorCopy(
  errorKind: ReturnType<typeof getSkillRegistryErrorKind> | null,
) {
  switch (errorKind) {
    case "unauthorized":
      return {
        title: "Skills session expired",
        description:
          "Your session could not access the live skill catalog. Sign in again or retry the request.",
      };
    case "workspace_forbidden":
      return {
        title: "Workspace access denied",
        description:
          "The current workspace is not authorized for Skill Registry access. Select another workspace and retry.",
      };
    case "skill_registry_unavailable":
      return {
        title: "Skill Registry is unavailable",
        description:
          "The live skill catalog could not be loaded. Check the gateway and registry service, then retry.",
      };
    default:
      return {
        title: "Skill catalog request failed",
        description:
          "Skill Registry rejected the catalog request. Check your access and service configuration, then retry.",
      };
  }
}

export function SkillsPage({
  workspaceId,
  onOpenSkill,
  viewState,
  onViewStateChange,
}: SkillsPageProps) {
  const [filters, setFilters] = useState<SkillCatalogViewState>(
    () => viewState,
  );
  const filtersRef = useRef(filters);
  const restoreScrollRef = useRef(viewState.scrollY);
  const [sharingSkillId, setSharingSkillId] = useState<string | null>(null);
  const [organizationSharingError, setOrganizationSharingError] = useState<
    string | null
  >(null);
  const [pendingBulkAction, setPendingBulkAction] =
    useState<BulkSkillAction | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const { user } = useAuth();
  const canManageOrganization = user?.org_role === "org_admin";
  const { query, language, status, sort } = filters;
  const { skills, loading, error, errorKind, refresh } = useSkillCatalog({
    workspaceId,
    language,
  });
  const { isSkillEnabled, reconcileCatalogSkills, setAllSkillsEnabled } =
    useSkillsState();
  const initialLoading = loading && !skills;
  const isRefreshing = loading && Boolean(skills);

  const updateFilters = (nextFilters: SkillCatalogViewState) => {
    filtersRef.current = nextFilters;
    setFilters(nextFilters);
    onViewStateChange({ ...nextFilters, scrollY: restoreScrollRef.current });
  };

  useEffect(() => {
    if (!restoreScrollRef.current || loading || !skills) return;
    const outerFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: restoreScrollRef.current, behavior: "auto" });
        restoreScrollRef.current = 0;
      });
    });
    return () => window.cancelAnimationFrame(outerFrame);
  }, [loading, skills]);

  useEffect(() => {
    if (!skills || loading || error || query.trim() || language) return;
    reconcileCatalogSkills(skills);
  }, [error, language, loading, query, reconcileCatalogSkills, skills]);

  const languages = useMemo(
    () =>
      Array.from(
        new Set((skills ?? []).map((skill) => skill.language).filter(Boolean)),
      ).sort((left, right) =>
        formatSkillLanguage(left).localeCompare(formatSkillLanguage(right)),
      ),
    [skills],
  );

  const {
    generalSkills,
    yourSkills,
    resultCount,
    totalCount,
    enabledCount,
    disabledCount,
  } = useMemo(() => {
    const matchingSkills = (skills ?? []).filter((skill) => {
      const enabled = isSkillEnabled(skill.id, skill.user_enabled);
      const normalizedQuery = query.trim().toLocaleLowerCase();
      const searchable = [
        skill.name,
        skill.id,
        skill.description,
        skill.path,
        skill.entry,
      ]
        .join(" ")
        .toLocaleLowerCase();
      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (status === "all" || (status === "enabled" ? enabled : !enabled))
      );
    });
    const compareSkills = (left: UserSkillSummary, right: UserSkillSummary) => {
      if (sort === "language") {
        return (
          formatSkillLanguage(left.language).localeCompare(
            formatSkillLanguage(right.language),
          ) || formatSkillName(left).localeCompare(formatSkillName(right))
        );
      }
      if (sort === "version") {
        return (
          right.version.localeCompare(left.version, undefined, {
            numeric: true,
          }) || formatSkillName(left).localeCompare(formatSkillName(right))
        );
      }
      return formatSkillName(left).localeCompare(formatSkillName(right));
    };
    const enabledCount = (skills ?? []).filter((skill) =>
      isSkillEnabled(skill.id, skill.user_enabled),
    ).length;
    return {
      generalSkills: matchingSkills.filter(isGeneralSkill).sort(compareSkills),
      yourSkills: matchingSkills
        .filter((skill) => !isGeneralSkill(skill))
        .sort(compareSkills),
      resultCount: matchingSkills.length,
      totalCount: skills?.length ?? 0,
      enabledCount,
      disabledCount: (skills?.length ?? 0) - enabledCount,
    };
  }, [isSkillEnabled, query, skills, sort, status]);

  const hasActiveFilters = Boolean(
    query.trim() || language || status !== "all",
  );
  const generalEnabledSkills = generalSkills.filter((skill) =>
    isSkillEnabled(skill.id, skill.user_enabled),
  );
  const generalDisabledSkills = generalSkills.filter(
    (skill) => !isSkillEnabled(skill.id, skill.user_enabled),
  );
  const yourEnabledSkills = yourSkills.filter((skill) =>
    isSkillEnabled(skill.id, skill.user_enabled),
  );
  const yourDisabledSkills = yourSkills.filter(
    (skill) => !isSkillEnabled(skill.id, skill.user_enabled),
  );
  const allSkillIds = (skills ?? []).map((skill) => skill.id);
  const pendingBulkSkillCount =
    pendingBulkAction === "enable" ? disabledCount : enabledCount;

  const runBulkAction = async () => {
    if (!pendingBulkAction) return;
    setBulkBusy(true);
    const succeeded = await setAllSkillsEnabled(
      allSkillIds,
      workspaceId,
      pendingBulkAction === "enable",
    );
    setBulkBusy(false);
    if (succeeded) {
      setPendingBulkAction(null);
      refresh();
    }
  };
  const renderSkillTab = (
    label: string,
    enabledSkills: UserSkillSummary[],
    disabledSkills: UserSkillSummary[],
    description: string,
  ) => {
    if (initialLoading) return <SkillCatalogSkeleton />;
    if (!skills) return null;
    if (enabledSkills.length > 0 || disabledSkills.length > 0) {
      return (
        <SkillSection
          description={description}
          enabledSkills={enabledSkills}
          disabledSkills={disabledSkills}
          workspaceId={workspaceId}
          onOpenSkill={handleOpenSkill}
          canManageOrganization={canManageOrganization}
          sharingSkillId={sharingSkillId}
          onSetOrganizationSharing={handleOrganizationSharing}
          onBulkAction={(enabled) =>
            setPendingBulkAction(enabled ? "enable" : "disable")
          }
          bulkBusy={bulkBusy}
        />
      );
    }

    return (
      <div className="grid min-h-64 place-items-center rounded-xl border border-dashed bg-card px-5 text-center">
        <div>
          <SparklesIcon className="mx-auto size-6 text-muted-foreground" />
          <h2 className="mt-3 text-sm font-semibold">
            {hasActiveFilters ? "No matching skills" : `No ${label} available`}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasActiveFilters
              ? `No ${label.toLocaleLowerCase()} match the current filters. Try another tab or adjust the filters.`
              : `${label} will appear here when available.`}
          </p>
          {hasActiveFilters ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>
    );
  };
  const clearFilters = () =>
    updateFilters({
      query: "",
      language: undefined,
      status: "all",
      sort,
      scrollY: restoreScrollRef.current,
    });
  const handleOpenSkill = (skillId: string) => {
    const returnViewState = { ...filtersRef.current, scrollY: window.scrollY };
    onViewStateChange(returnViewState);
    window.scrollTo({ top: 0, behavior: "instant" });
    onOpenSkill(skillId, returnViewState);
  };
  const handleOrganizationSharing = async (
    skillId: string,
    enabled: boolean,
  ) => {
    setSharingSkillId(skillId);
    setOrganizationSharingError(null);
    try {
      await shareSkillWithOrganization(skillId, enabled);
      refresh();
    } catch (error) {
      setOrganizationSharingError(
        error instanceof Error
          ? error.message
          : "Could not update organization sharing.",
      );
    } finally {
      setSharingSkillId(null);
    }
  };

  return (
    <section
      className="relative min-h-[calc(100dvh-var(--app-top-bar-height))] w-full overflow-x-hidden px-5 pb-12 pt-4 sm:px-8 md:pt-6"
      aria-label="Skills catalog"
    >
      <div className="mx-auto grid w-full max-w-[1360px] gap-6">
        <Card className="gap-0 rounded-xl bg-card p-0 shadow-sm">
          <header className="grid gap-3 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    Skills
                  </h1>
                  <Badge
                    variant="outline"
                    className="h-6 rounded-full bg-muted px-2.5 text-[10px] font-medium tabular-nums text-muted-foreground"
                  >
                    {enabledCount} enabled
                  </Badge>
                  <Badge
                    variant="outline"
                    className="h-6 rounded-full bg-muted px-2.5 text-[10px] font-medium tabular-nums text-muted-foreground"
                  >
                    {disabledCount} disabled
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  General skills are provided by your organization. Your skills
                  are learned from conversations and available across your
                  workspaces. Toggles apply only to your agent.
                </p>
              </div>
              <Button
                variant="outline"
                className="h-9 w-full rounded-full sm:w-auto"
                onClick={refresh}
                disabled={loading}
                aria-busy={loading || undefined}
              >
                <RefreshCwIcon
                  data-icon="inline-start"
                  className={loading ? "animate-spin" : undefined}
                />
                {isRefreshing ? "Updating catalog…" : "Refresh"}
              </Button>
            </div>
            <div className="grid gap-2 border-t pt-3 xl:grid-cols-[minmax(240px,1fr)_minmax(390px,auto)] xl:items-center">
              <div className="relative min-w-0">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) =>
                    updateFilters({
                      ...filtersRef.current,
                      query: event.target.value,
                    })
                  }
                  placeholder="Search skills, IDs, paths, or capabilities"
                  aria-label="Search skills"
                  className="h-9 rounded-full bg-card pl-9 pr-3"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 xl:justify-end">
                <ToggleGroup
                  value={[status]}
                  onValueChange={(values) => {
                    const next = values[0] as SkillStatusFilter | undefined;
                    if (next)
                      updateFilters({ ...filtersRef.current, status: next });
                  }}
                  aria-label="Filter skills by status"
                  variant="outline"
                  size="sm"
                  className="min-w-0 overflow-x-auto rounded-full border-border bg-muted/50 p-1"
                >
                  {(["all", "enabled", "disabled"] as const).map((value) => (
                    <ToggleGroupItem
                      key={value}
                      value={value}
                      className="rounded-full px-3 text-xs aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                      {value === "all"
                        ? "All"
                        : value === "enabled"
                          ? "Enabled"
                          : "Disabled"}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <LanguageDropdown
                  value={language}
                  languages={languages}
                  onValueChange={(next) =>
                    updateFilters({ ...filtersRef.current, language: next })
                  }
                />
                <SortDropdown
                  value={sort}
                  onValueChange={(next) =>
                    updateFilters({ ...filtersRef.current, sort: next })
                  }
                />
                <Badge
                  variant="outline"
                  className="h-8 justify-center rounded-full bg-card px-3 text-xs font-medium tabular-nums text-muted-foreground"
                  aria-live="polite"
                >
                  {resultCount} results
                </Badge>
              </div>
            </div>
          </header>
        </Card>

        {error ? (
          <Alert className="border-warning/40 bg-warning/10 text-warning">
            <AlertTriangleIcon />
            <AlertTitle>
              {skills
                ? "Catalog update failed"
                : catalogErrorCopy(errorKind).title}
            </AlertTitle>
            <AlertDescription className="text-warning">
              {skills
                ? "Showing the most recently loaded catalog. Retry to check for newer skills."
                : catalogErrorCopy(errorKind).description}
            </AlertDescription>
            <AlertAction>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full bg-card"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCwIcon className={loading ? "animate-spin" : ""} />{" "}
                Retry
              </Button>
            </AlertAction>
          </Alert>
        ) : null}

        {organizationSharingError ? (
          <Alert className="border-warning/40 bg-warning/10 text-warning">
            <AlertTriangleIcon />
            <AlertTitle>Organization sharing failed</AlertTitle>
            <AlertDescription className="text-warning">
              {organizationSharingError}
            </AlertDescription>
          </Alert>
        ) : null}

        <Tabs defaultValue="general" className="gap-4">
          <TabsList
            variant="line"
            aria-label="Skill categories"
            className="w-full justify-start gap-2 border-b border-border pb-1"
          >
            <TabsTrigger value="general" className="flex-none gap-2 px-3">
              General Skills
              <Badge
                aria-hidden="true"
                variant="outline"
                className="h-5 rounded-full px-2 text-[10px] tabular-nums"
              >
                {generalSkills.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="your" className="flex-none gap-2 px-3">
              Your Skills
              <Badge
                aria-hidden="true"
                variant="outline"
                className="h-5 rounded-full px-2 text-[10px] tabular-nums"
              >
                {yourSkills.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="mt-0">
            {renderSkillTab(
              "General Skills",
              generalEnabledSkills,
              generalDisabledSkills,
              "Bootstrap skills provided for everyone in your organization.",
            )}
          </TabsContent>
          <TabsContent value="your" className="mt-0">
            {renderSkillTab(
              "Your Skills",
              yourEnabledSkills,
              yourDisabledSkills,
              "Skills learned from conversations and available across your workspaces.",
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Dialog
        open={pendingBulkAction !== null}
        onOpenChange={(open) => {
          if (!open && !bulkBusy) setPendingBulkAction(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bulkBusy
                ? `${pendingBulkAction === "enable" ? "Enabling" : "Disabling"} skills...`
                : `${pendingBulkAction === "enable" ? "Enable" : "Disable"} ${pendingBulkSkillCount} skills?`}
            </DialogTitle>
            <DialogDescription>
              {bulkBusy
                ? "Updating all visible skills in one request."
                : "This changes your personal skill preferences only and applies to your next agent run."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {bulkBusy ? (
              <Button type="button" variant="outline" disabled>
                Updating skills...
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPendingBulkAction(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant={
                    pendingBulkAction === "enable" ? "default" : "destructive"
                  }
                  onClick={() => void runBulkAction()}
                  disabled={pendingBulkSkillCount === 0}
                >
                  {pendingBulkAction === "enable" ? "Enable" : "Disable"}{" "}
                  {pendingBulkSkillCount} skills
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
