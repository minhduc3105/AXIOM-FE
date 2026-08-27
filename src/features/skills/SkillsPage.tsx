import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangleIcon,
  ArrowDownAZIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  CircleOffIcon,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getSkillRegistryErrorKind } from "./api/skillRegistryApi";
import { SkillCard } from "./components/SkillCard";
import { SkillCatalogSkeleton } from "./components/SkillCatalogSkeleton";
import {
  formatSkillLanguage,
  formatSkillName,
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
  title,
  description,
  skills,
  enabled,
  workspaceId,
  onOpenSkill,
}: {
  title: string;
  description: string;
  skills: UserSkillSummary[];
  enabled: boolean;
  workspaceId: string | null;
  onOpenSkill: (skillId: string) => void;
}) {
  return (
    <section
      aria-labelledby={`${enabled ? "enabled" : "available"}-skills-title`}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={
              enabled
                ? "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-success/30 bg-success/10 text-success"
                : "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border bg-muted text-muted-foreground"
            }
          >
            {enabled ? (
              <CheckCircle2Icon className="size-4" />
            ) : (
              <CircleOffIcon className="size-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id={`${enabled ? "enabled" : "available"}-skills-title`}
                className="text-lg font-semibold text-foreground"
              >
                {title}
              </h2>
              <Badge
                variant="outline"
                className="h-5 rounded-full bg-card px-2 text-[10px] tabular-nums text-muted-foreground"
              >
                {skills.length}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {skills.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            workspaceId={workspaceId}
            onOpen={onOpenSkill}
          />
        ))}
      </div>
    </section>
  );
}

function catalogErrorCopy(
  errorKind: ReturnType<typeof getSkillRegistryErrorKind> | null,
) {
  switch (errorKind) {
    case "unauthorized":
      return {
        title: "Skill Hub session expired",
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
  const { query, language, status, sort } = filters;
  const { skills, loading, error, errorKind, refresh } = useSkillCatalog({
    workspaceId,
    language,
  });
  const { isSkillEnabled, reconcileCatalogSkills } = useSkillsState();
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

  const { enabledSkills, availableSkills, resultCount, totalCount } =
    useMemo(() => {
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
      const compareSkills = (
        left: UserSkillSummary,
        right: UserSkillSummary,
      ) => {
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
      return {
        enabledSkills: matchingSkills
          .filter((skill) => isSkillEnabled(skill.id, skill.user_enabled))
          .sort(compareSkills),
        availableSkills: matchingSkills
          .filter((skill) => !isSkillEnabled(skill.id, skill.user_enabled))
          .sort(compareSkills),
        resultCount: matchingSkills.length,
        totalCount: skills?.length ?? 0,
      };
    }, [isSkillEnabled, query, skills, sort, status]);

  const hasActiveFilters = Boolean(
    query.trim() || language || status !== "all",
  );
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

  return (
    <section
      className="relative min-h-[calc(100dvh-var(--app-top-bar-height))] w-full overflow-x-hidden px-5 pb-12 pt-4 sm:px-8 md:pt-6"
      aria-label="Skill Hub catalog"
    >
      <div className="mx-auto grid w-full max-w-[1360px] gap-6">
        <Card className="gap-0 rounded-xl bg-card p-0 shadow-sm">
          <header className="grid gap-3 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    Skill Hub
                  </h1>
                  <Badge
                    variant="outline"
                    className="h-6 rounded-full bg-muted px-2.5 text-[10px] font-medium tabular-nums text-muted-foreground"
                  >
                    {totalCount} visible
                  </Badge>
                  <Badge
                    variant="outline"
                    className="h-6 rounded-full bg-muted px-2.5 text-[10px] font-medium tabular-nums text-muted-foreground"
                  >
                    {enabledSkills.length} enabled
                  </Badge>
                  <Badge
                    variant="outline"
                    className="h-6 rounded-full bg-muted px-2.5 text-[10px] font-medium tabular-nums text-muted-foreground"
                  >
                    {availableSkills.length} disabled
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Skills visible in{" "}
                  {workspaceId
                    ? "the selected workspace"
                    : "all authorized workspaces"}
                  . Enabled preferences apply to your agent&apos;s next skill
                  discovery.
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

        <Alert className="border-primary/20 bg-primary/5 text-primary">
          <SparklesIcon />
          <AlertTitle>User skill preferences</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Enable a skill to make its instructions and bundled files available
            to your agent. The Registry remains the authority for workspace
            visibility.
          </AlertDescription>
        </Alert>

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

        {initialLoading ? (
          <SkillCatalogSkeleton />
        ) : skills && resultCount > 0 ? (
          <div className="grid gap-10">
            {status !== "disabled" && enabledSkills.length > 0 ? (
              <SkillSection
                title="Enabled Skills"
                description="These skills are available to your agent."
                skills={enabledSkills}
                enabled
                workspaceId={workspaceId}
                onOpenSkill={handleOpenSkill}
              />
            ) : null}
            {status === "all" &&
            enabledSkills.length > 0 &&
            availableSkills.length > 0 ? (
              <div className="h-px bg-border" />
            ) : null}
            {status !== "enabled" && availableSkills.length > 0 ? (
              <SkillSection
                title="Available Skills"
                description="These skills are visible in scope but disabled for your agent."
                skills={availableSkills}
                enabled={false}
                workspaceId={workspaceId}
                onOpenSkill={handleOpenSkill}
              />
            ) : null}
          </div>
        ) : skills && !hasActiveFilters && skills.length === 0 ? (
          <div className="grid min-h-64 place-items-center rounded-xl border border-dashed bg-card px-5 text-center">
            <div>
              <SparklesIcon className="mx-auto size-6 text-muted-foreground" />
              <h2 className="mt-3 text-sm font-semibold">No skills visible</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Skill Registry returned no skills for the current workspace
                scope.
              </p>
            </div>
          </div>
        ) : skills ? (
          <div className="grid min-h-64 place-items-center rounded-xl border border-dashed bg-card px-5 text-center">
            <div>
              <SparklesIcon className="mx-auto size-6 text-muted-foreground" />
              <h2 className="mt-3 text-sm font-semibold">No matching skills</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different keyword, language, or status.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
