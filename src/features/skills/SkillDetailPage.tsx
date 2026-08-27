import { useState } from "react";
import {
  ActivityIcon,
  ArrowLeftIcon,
  ArchiveIcon,
  AlertTriangleIcon,
  CircleAlertIcon,
  CodeXmlIcon,
  DownloadIcon,
  FileCode2Icon,
  FolderTreeIcon,
  LockKeyholeIcon,
  RefreshCwIcon,
  SparklesIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownContent } from "@/features/chat/components/MarkdownContent";
import {
  downloadSkillArchive,
  getSkillRegistryErrorKind,
} from "./api/skillRegistryApi";
import { SkillStatusSwitch } from "./components/SkillStatusSwitch";
import { useSkillsState } from "./model/SkillsProvider";
import {
  formatSkillLanguage,
  formatSkillName,
  formatSkillVersion,
  getSkillScope,
  skillArchiveFileName,
} from "./model/skillPresentation";
import { useSkillDetail } from "./model/useSkillDetail";

type SkillDetailPageProps = {
  skillId: string;
  workspaceId: string | null;
  onBack: () => void;
};

function SkillDetailSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-[1320px] gap-6">
      <Skeleton className="h-9 w-40" />
      <div className="flex gap-4">
        <Skeleton className="size-14 rounded-lg" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-[520px] max-w-full" />
        </div>
      </div>
      <Skeleton className="h-[480px]" />
    </div>
  );
}

function detailErrorCopy(
  errorKind: ReturnType<typeof getSkillRegistryErrorKind> | null,
) {
  switch (errorKind) {
    case "unauthorized":
      return {
        title: "Skill Hub session expired",
        description:
          "Your session could not access this skill. Sign in again or retry the request.",
      };
    case "workspace_forbidden":
      return {
        title: "Workspace access denied",
        description:
          "This workspace is not authorized to inspect the selected skill. Select another workspace and retry.",
      };
    case "skill_not_found":
      return {
        title: "Skill is no longer available",
        description:
          "The selected skill was not returned by the current Skill Registry scope.",
      };
    case "skill_registry_unavailable":
      return {
        title: "Skill Registry is unavailable",
        description:
          "The live skill details could not be loaded. Check the gateway and retry.",
      };
    default:
      return {
        title: "Skill details could not be loaded",
        description:
          "Skill Registry rejected the detail request. Check your access and retry.",
      };
  }
}

export function SkillDetailPage({
  skillId,
  workspaceId,
  onBack,
}: SkillDetailPageProps) {
  const {
    summary,
    detail,
    requiresEnable,
    loading,
    error,
    errorKind,
    refresh,
  } = useSkillDetail(skillId, workspaceId);
  const {
    isSkillEnabled,
    isSkillUpdating,
    getSkillUpdateError,
    retrySkillUpdate,
    setSkillEnabled,
  } = useSkillsState();
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [sha256, setSha256] = useState<string | null>(null);

  if (loading && !summary) {
    return (
      <section className="min-h-0 px-4 py-4 sm:px-6 md:p-6">
        <SkillDetailSkeleton />
      </section>
    );
  }

  if (!summary) {
    const copy = detailErrorCopy(errorKind);
    return (
      <section className="grid min-h-0 place-items-center px-4 py-8 sm:px-6 md:p-6">
        <div className="max-w-md text-center">
          <CircleAlertIcon className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-semibold">{copy.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {copy.description}
          </p>
          {errorKind !== "skill_not_found" ? (
            <Button variant="outline" className="mt-5" onClick={refresh}>
              <RefreshCwIcon /> Retry
            </Button>
          ) : null}
          <Button variant="outline" className="ml-2 mt-5" onClick={onBack}>
            <ArrowLeftIcon /> Back to Skill Hub
          </Button>
        </div>
      </section>
    );
  }

  const displayName = formatSkillName(summary);
  const enabled = isSkillEnabled(summary.id, summary.user_enabled);
  const updating = isSkillUpdating(summary.id);
  const updateError = getSkillUpdateError(summary.id);
  const activeDetail = detail;

  const handleEnabledChange = async (nextEnabled: boolean) => {
    const succeeded = await setSkillEnabled(
      summary.id,
      workspaceId,
      nextEnabled,
    );
    if (succeeded) {
      setArchiveError(null);
      setSha256(null);
      refresh();
    }
  };

  const handleRetryUpdate = async () => {
    const succeeded = await retrySkillUpdate(summary.id, workspaceId);
    if (succeeded) refresh();
  };

  const handleDownload = async () => {
    setArchiveBusy(true);
    setArchiveError(null);
    try {
      const result = await downloadSkillArchive(
        summary.id,
        workspaceId,
        new AbortController().signal,
      );
      const fileName = skillArchiveFileName(summary, result.fileName);
      setSha256(result.sha256);
      const objectUrl = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch (downloadError: unknown) {
      setArchiveError(
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to download the skill archive.",
      );
    } finally {
      setArchiveBusy(false);
    }
  };

  return (
    <section
      className="relative min-h-0 w-full overflow-x-hidden px-4 py-4 sm:px-6 md:p-6"
      aria-label={`${displayName} details`}
    >
      <div className="mx-auto grid w-full min-w-0 max-w-[1360px] gap-4">
        <Button
          variant="ghost"
          className="h-9 w-fit rounded-full px-3 text-text-secondary"
          onClick={onBack}
        >
          <ArrowLeftIcon /> Back to Skill Hub
        </Button>

        <Card className="gap-0 rounded-lg border border-line bg-card p-0 shadow-none">
          <header className="grid min-w-0 gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="flex w-full min-w-0 max-w-full items-start gap-3 sm:gap-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary sm:size-12">
                <SparklesIcon className="size-5 sm:size-6" />
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
                  <h1 className="min-w-0 max-w-full break-words text-xl font-semibold leading-tight text-foreground sm:text-2xl">
                    {displayName}
                  </h1>
                  <Badge
                    variant="outline"
                    className="h-6 rounded-full border-line bg-soft px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary"
                  >
                    {formatSkillLanguage(summary.language)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="h-6 rounded-full border-line bg-soft px-2.5 text-[10px] font-medium text-text-secondary"
                  >
                    {formatSkillVersion(summary.version)}
                  </Badge>
                </div>
                <code className="mt-1.5 block break-all text-xs text-muted-foreground">
                  {summary.id}
                </code>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                  {summary.description ||
                    "No description is available for this skill."}
                </p>
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 border-t border-line pt-3 sm:w-auto sm:min-w-52 sm:border-t-0 sm:pt-0 lg:justify-self-end">
              <Badge
                variant="outline"
                className="h-7 w-fit rounded-full border-line bg-soft px-3 text-[10px] font-medium text-text-secondary"
              >
                <LockKeyholeIcon className="mr-1.5 size-3" /> User preference
              </Badge>
              <SkillStatusSwitch
                checked={enabled}
                onCheckedChange={(nextEnabled) =>
                  void handleEnabledChange(nextEnabled)
                }
                label={displayName}
                disabled={updating}
              />
              <p className="max-w-xs text-xs leading-5 text-muted-foreground">
                {workspaceId
                  ? "Visible in the selected workspace"
                  : "Visible in all authorized workspaces"}
              </p>
              {updateError ? (
                <div
                  role="alert"
                  className="max-w-xs text-left text-xs leading-5 text-destructive"
                >
                  <p>Update failed: {updateError}</p>
                  <Button
                    type="button"
                    variant="link"
                    size="xs"
                    className="mt-1 h-auto px-0 text-destructive"
                    onClick={() => void handleRetryUpdate()}
                  >
                    <RefreshCwIcon /> Retry update
                  </Button>
                </div>
              ) : null}
            </div>
          </header>
        </Card>

        {error && !requiresEnable ? (
          <Alert className="border-warning/40 bg-warning/10 text-warning">
            <AlertTriangleIcon />
            <AlertTitle>
              {activeDetail
                ? "Showing cached skill metadata"
                : detailErrorCopy(errorKind).title}
            </AlertTitle>
            <AlertDescription className="text-warning">
              {activeDetail
                ? "The last loaded bundle is still available, but the latest detail request failed."
                : detailErrorCopy(errorKind).description}{" "}
              <Button
                variant="link"
                className="h-auto px-1 text-warning"
                onClick={refresh}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {requiresEnable || !enabled ? (
          <Alert className="border-primary/30 bg-primary/5 text-primary">
            <LockKeyholeIcon />
            <AlertTitle>Enable this skill to inspect its bundle</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              Skill metadata is visible, but the Registry only returns SKILL.md
              content and archive files for a skill enabled for your agent.
              <Button
                type="button"
                size="sm"
                className="mt-3 w-fit"
                onClick={() => void handleEnabledChange(true)}
                disabled={updating}
              >
                {updating ? (
                  <RefreshCwIcon className="animate-spin" />
                ) : (
                  <SparklesIcon />
                )}{" "}
                Enable skill
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <section
          className="overflow-hidden rounded-xl border border-line bg-card p-5 shadow-sm"
          aria-labelledby="skill-overview-title"
        >
          <div className="mb-4 flex items-center gap-2">
            <ActivityIcon className="size-4 text-brand" />
            <h2 id="skill-overview-title" className="text-sm font-semibold">
              Overview
            </h2>
          </div>
          <dl className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
            <div className="bg-soft p-3.5">
              <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <CodeXmlIcon className="size-3.5" /> Entry file
              </dt>
              <dd className="mt-1.5 break-all text-sm font-semibold">
                <code>{summary.entry || "SKILL.md"}</code>
              </dd>
            </div>
            <div className="bg-soft p-3.5">
              <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ArchiveIcon className="size-3.5" /> Version
              </dt>
              <dd className="mt-1.5 text-sm font-semibold">
                {formatSkillVersion(summary.version)}
              </dd>
            </div>
            <div className="bg-soft p-3.5">
              <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <FolderTreeIcon className="size-3.5" /> Scope
              </dt>
              <dd className="mt-1.5 text-sm font-semibold">
                {getSkillScope(summary.path)}
              </dd>
            </div>
            <div className="bg-soft p-3.5">
              <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <FileCode2Icon className="size-3.5" /> Bundle files
              </dt>
              <dd className="mt-1.5 text-sm font-semibold tabular-nums">
                {activeDetail?.files.length ?? "—"}
              </dd>
            </div>
          </dl>
          <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
            <span>Published path</span>
            <code className="break-all rounded-md bg-soft px-2.5 py-2 text-text-secondary">
              {summary.path || "Path unavailable"}
            </code>
          </div>
        </section>

        {activeDetail && enabled ? (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
            <section
              className="min-w-0 overflow-hidden rounded-xl border border-line bg-card p-5 shadow-sm"
              aria-labelledby="skill-markdown-title"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileCode2Icon className="size-4 text-brand" />
                  <h2
                    id="skill-markdown-title"
                    className="text-sm font-semibold"
                  >
                    SKILL.md
                  </h2>
                </div>
                <Badge variant="outline" className="rounded-full text-[10px]">
                  {activeDetail.body ? "Loaded" : "Empty"}
                </Badge>
              </div>
              {activeDetail.body ? (
                <MarkdownContent markdown={activeDetail.body} />
              ) : (
                <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted-foreground">
                  SKILL.md content is unavailable. The complete ZIP remains
                  available below.
                </div>
              )}
            </section>
            <aside className="grid gap-6">
              <section
                className="rounded-xl border border-line bg-card p-5 shadow-sm"
                aria-labelledby="skill-files-title"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FolderTreeIcon className="size-4 text-brand" />
                    <h2
                      id="skill-files-title"
                      className="text-sm font-semibold"
                    >
                      Bundle files
                    </h2>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {activeDetail.files.length}
                  </span>
                </div>
                {activeDetail.files.length ? (
                  <ul className="max-h-96 overflow-y-auto rounded-lg border border-line bg-soft/40 p-2 text-xs">
                    {activeDetail.files.map((file) => (
                      <li
                        key={file}
                        className="flex items-start gap-2 border-b border-line/70 px-2 py-2 last:border-0"
                      >
                        <FileCode2Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        <code className="break-all text-text-secondary">
                          {file}
                        </code>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-muted-foreground">
                    No bundled files were returned.
                  </p>
                )}
              </section>
              <section
                className="rounded-xl border border-line bg-card p-5 shadow-sm"
                aria-labelledby="skill-download-title"
              >
                <div className="mb-3 flex items-center gap-2">
                  <DownloadIcon className="size-4 text-brand" />
                  <h2
                    id="skill-download-title"
                    className="text-sm font-semibold"
                  >
                    Installable archive
                  </h2>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  Download the complete immutable bundle, including all files
                  listed above.
                </p>
                <Button
                  type="button"
                  className="mt-4 w-full"
                  onClick={() => void handleDownload()}
                  disabled={archiveBusy}
                >
                  {archiveBusy ? (
                    <RefreshCwIcon className="animate-spin" />
                  ) : (
                    <DownloadIcon />
                  )}{" "}
                  {archiveBusy ? "Preparing download…" : "Download skill ZIP"}
                </Button>
                {archiveError ? (
                  <p
                    role="alert"
                    className="mt-3 text-xs leading-5 text-destructive"
                  >
                    {archiveError}{" "}
                    <Button
                      variant="link"
                      className="h-auto px-1 text-destructive"
                      onClick={() => void handleDownload()}
                    >
                      Retry
                    </Button>
                  </p>
                ) : null}
                {sha256 ? (
                  <p className="mt-3 break-all text-[11px] leading-4 text-muted-foreground">
                    SHA-256: <code>{sha256}</code>
                  </p>
                ) : null}
              </section>
            </aside>
          </div>
        ) : loading ? (
          <div className="grid gap-3 rounded-xl border border-dashed border-line bg-card p-5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
