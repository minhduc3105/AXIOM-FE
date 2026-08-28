import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Building2Icon,
  ArchiveIcon,
  CheckIcon,
  CircleAlertIcon,
  ChevronDownIcon,
  FolderKanbanIcon,
  KeyRoundIcon,
  LoaderCircleIcon,
  MailPlusIcon,
  PlusIcon,
  PencilIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  UsersRoundIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createOrganizationUser,
  listOrganizationUsers,
  updateOrganizationUser,
} from "@/features/auth/api/authApi";
import {
  archiveWorkspace,
  createWorkspace,
  deleteWorkspaceMembership,
  listWorkspaceMemberships,
  listWorkspaces,
  updateWorkspace,
  upsertWorkspaceMembership,
  type Workspace,
  type WorkspaceMembership,
  type WorkspaceRole,
} from "@/features/auth/api/authzApi";
import { useAuth } from "@/features/auth/model/AuthProvider";
import type { AuthUser } from "@/features/auth/model/types";
import { cn } from "@/shared/lib/utils";

const panelClass = "rounded-xl border bg-card text-card-foreground shadow-sm";
const organizationRoleOptions = [
  { value: "org_member", label: "Organization member" },
  { value: "org_admin", label: "Organization admin" },
] as const;
const workspaceRoleOptions = [
  { value: "none", label: "No access" },
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "workspace_admin", label: "Workspace admin" },
] as const;
type OrganizationTab = "overview" | "workspaces" | "members";
type PendingRoleChange =
  | {
      scope: "organization";
      member: AuthUser;
      previousRole: AuthUser["org_role"];
      nextRole: AuthUser["org_role"];
    }
  | {
      scope: "workspace";
      member: AuthUser;
      workspace: Workspace;
      previousRole: WorkspaceRole | "none";
      nextRole: WorkspaceRole | "none";
    };
type RoleChangeResult = { status: "success" | "error"; message: string };
type FieldErrors = Record<string, string>;

function initials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "AX"
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function errorText(cause: unknown, fallback: string) {
  const error = cause instanceof Error ? cause : null;
  const status =
    typeof (cause as { status?: unknown })?.status === "number"
      ? (cause as { status: number }).status
      : undefined;
  if (status === 401)
    return "Your session has expired. Sign in again, then retry the change.";
  if (status === 403)
    return "You no longer have permission to change organization access.";
  if (status === 404)
    return "This member, workspace, or access record no longer exists. Refresh to see the latest data.";
  if (status === 409)
    return "This role was changed by someone else. Refresh the list and review the latest access before trying again.";
  return error?.message || fallback;
}

function useConfirmationDialogFocus(
  open: boolean,
  warningRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const origin =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const frame = window.requestAnimationFrame(() =>
      warningRef.current?.focus(),
    );
    return () => {
      window.cancelAnimationFrame(frame);
      if (origin?.isConnected) origin.focus();
    };
  }, [open, warningRef]);
}

function validateMemberForm(form: FormData): FieldErrors {
  const errors: FieldErrors = {};
  const name = String(form.get("member-name") ?? "").trim();
  const email = String(form.get("member-email") ?? "").trim();
  const password = String(form.get("member-password") ?? "");
  if (!name) errors["member-name"] = "Name is required.";
  if (!email) errors["member-email"] = "Work email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors["member-email"] = "Enter a valid work email.";
  if (password.length < 8)
    errors["member-password"] =
      "Temporary password must be at least 8 characters.";
  return errors;
}

function validateWorkspaceForm(form: FormData): FieldErrors {
  const errors: FieldErrors = {};
  const name = String(form.get("workspace-name") ?? "").trim();
  const slug = String(form.get("workspace-slug") ?? "").trim();
  if (!name) errors["workspace-name"] = "Workspace name is required.";
  if (!slug) errors["workspace-slug"] = "Workspace slug is required.";
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    errors["workspace-slug"] =
      "Use lowercase letters, numbers, and single hyphens only.";
  return errors;
}

export function OrganizationUsersPage({
  initialTab = "overview",
  onBack,
  organizationName,
}: {
  initialTab?: OrganizationTab;
  onBack: () => void;
  organizationName: string;
}) {
  const { user, accessToken } = useAuth();
  const [tab, setTab] = useState<OrganizationTab>(initialTab);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null,
  );
  const [memberships, setMemberships] = useState<WorkspaceMembership[]>([]);
  const [workspaceMemberships, setWorkspaceMemberships] = useState<
    Record<string, WorkspaceMembership[]>
  >({});
  const [membershipErrors, setMembershipErrors] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(false);
  const [membershipsLoading, setMembershipsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceEditing, setWorkspaceEditing] = useState<Workspace | null>(
    null,
  );
  const [workspaceArchiving, setWorkspaceArchiving] =
    useState<Workspace | null>(null);
  const [assignmentWorkspaceId, setAssignmentWorkspaceId] = useState<
    string | null
  >(null);
  const [memberWorkspaceAccess, setMemberWorkspaceAccess] =
    useState<AuthUser | null>(null);
  const [pendingRoleChange, setPendingRoleChange] =
    useState<PendingRoleChange | null>(null);
  const [roleChangeResult, setRoleChangeResult] =
    useState<RoleChangeResult | null>(null);
  const [memberErrors, setMemberErrors] = useState<FieldErrors>({});
  const [workspaceErrors, setWorkspaceErrors] = useState<FieldErrors>({});
  const [workspaceEditErrors, setWorkspaceEditErrors] = useState<FieldErrors>(
    {},
  );

  const canManage = user?.org_role === "org_admin";
  const organizationId = user?.organization_id ?? "";
  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ??
    workspaces[0] ??
    null;

  async function loadAdminData() {
    if (!canManage || !organizationId || !accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [nextUsers, nextWorkspaces] = await Promise.all([
        listOrganizationUsers(organizationId, accessToken),
        listWorkspaces(organizationId, accessToken),
      ]);
      setUsers(nextUsers);
      setWorkspaces(nextWorkspaces);
      setSelectedWorkspaceId((current) =>
        current && nextWorkspaces.some((workspace) => workspace.id === current)
          ? current
          : (nextWorkspaces[0]?.id ?? null),
      );
      const membershipResults = await Promise.allSettled(
        nextWorkspaces.map(
          async (workspace) =>
            [
              workspace.id,
              await listWorkspaceMemberships(
                organizationId,
                workspace.id,
                accessToken,
              ),
            ] as const,
        ),
      );
      const nextMemberships: Record<string, WorkspaceMembership[]> = {};
      const nextErrors: Record<string, string> = {};
      membershipResults.forEach((result, index) => {
        const workspace = nextWorkspaces[index];
        if (result.status === "fulfilled")
          nextMemberships[result.value[0]] = result.value[1];
        else
          nextErrors[workspace.id] = errorText(
            result.reason,
            "Unable to load workspace membership.",
          );
      });
      setWorkspaceMemberships((current) => ({
        ...current,
        ...nextMemberships,
      }));
      setMembershipErrors(nextErrors);
    } catch (cause) {
      setError(errorText(cause, "Unable to load organization administration."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAdminData();
  }, [accessToken, canManage, organizationId]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!canManage || !selectedWorkspace || !accessToken) {
      setMemberships([]);
      return;
    }
    const controller = new AbortController();
    setMembershipsLoading(true);
    listWorkspaceMemberships(organizationId, selectedWorkspace.id, accessToken)
      .then((nextMemberships) => {
        if (!controller.signal.aborted) {
          setMemberships(nextMemberships);
          setWorkspaceMemberships((current) => ({
            ...current,
            [selectedWorkspace.id]: nextMemberships,
          }));
          setMembershipErrors((current) => {
            const { [selectedWorkspace.id]: _, ...remaining } = current;
            return remaining;
          });
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setMembershipErrors((current) => ({
            ...current,
            [selectedWorkspace.id]: errorText(
              cause,
              "Unable to load workspace membership.",
            ),
          }));
      })
      .finally(() => {
        if (!controller.signal.aborted) setMembershipsLoading(false);
      });
    return () => controller.abort();
  }, [accessToken, canManage, organizationId, selectedWorkspace?.id]);

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !canManage || saving) return;
    const form = new FormData(event.currentTarget);
    const errors = validateMemberForm(form);
    if (Object.keys(errors).length) {
      setMemberErrors(errors);
      return;
    }
    setMemberErrors({});
    setSaving(true);
    try {
      const created = await createOrganizationUser(
        organizationId,
        {
          displayName: String(form.get("member-name") ?? "").trim(),
          email: String(form.get("member-email") ?? "").trim(),
          password: String(form.get("member-password") ?? ""),
          orgRole: String(form.get("member-role")) as AuthUser["org_role"],
        },
        accessToken,
      );
      setUsers((current) =>
        [...current, created].sort((left, right) =>
          left.email.localeCompare(right.email),
        ),
      );
      setMemberOpen(false);
      toast.success(`${created.email} was added to the organization.`);
    } catch (cause) {
      const message = errorText(cause, "Unable to add member.");
      setMemberErrors({ form: message });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function addWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !canManage || saving) return;
    const form = new FormData(event.currentTarget);
    const errors = validateWorkspaceForm(form);
    if (Object.keys(errors).length) {
      setWorkspaceErrors(errors);
      return;
    }
    setWorkspaceErrors({});
    const name = String(form.get("workspace-name") ?? "").trim();
    const slug = String(form.get("workspace-slug") ?? "").trim();
    setSaving(true);
    try {
      const workspace = await createWorkspace(organizationId, accessToken, {
        name,
        slug,
        description:
          String(form.get("workspace-description") ?? "").trim() || null,
      });
      setWorkspaces((current) => [...current, workspace]);
      setSelectedWorkspaceId(workspace.id);
      setAssignmentWorkspaceId(workspace.id);
      setWorkspaceOpen(false);
      toast.success(
        `${workspace.name} was created. Assign its workspace admin and members next.`,
      );
    } catch (cause) {
      const message = errorText(cause, "Unable to create workspace.");
      setWorkspaceErrors({ form: message });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function requestWorkspaceRoleChange(
    workspace: Workspace,
    member: AuthUser,
    value: string,
  ) {
    const previousRole =
      (workspaceMemberships[workspace.id] ?? []).find(
        (membership) => membership.user_id === member.id,
      )?.role ?? "none";
    const nextRole = value as WorkspaceRole | "none";
    if (
      previousRole === nextRole ||
      workspace.status.toLowerCase() !== "active"
    )
      return;
    setRoleChangeResult(null);
    setPendingRoleChange({
      scope: "workspace",
      member,
      workspace,
      previousRole,
      nextRole,
    });
  }

  async function applyWorkspaceRoleChange(
    workspace: Workspace,
    member: AuthUser,
    value: WorkspaceRole | "none",
  ) {
    if (
      !accessToken ||
      !canManage ||
      workspace.status.toLowerCase() !== "active"
    )
      throw new Error("This workspace cannot be updated.");
    setSaving(true);
    try {
      if (value === "none") {
        await deleteWorkspaceMembership(
          organizationId,
          workspace.id,
          member.id,
          accessToken,
        );
        const update = (current: WorkspaceMembership[]) =>
          current.filter((membership) => membership.user_id !== member.id);
        if (selectedWorkspace?.id === workspace.id) setMemberships(update);
        setWorkspaceMemberships((current) => ({
          ...current,
          [workspace.id]: update(current[workspace.id] ?? []),
        }));
        return `${member.email} no longer has workspace access.`;
      } else {
        const membership = await upsertWorkspaceMembership(
          organizationId,
          workspace.id,
          accessToken,
          { user_id: member.id, role: value as WorkspaceRole },
        );
        const update = (current: WorkspaceMembership[]) => [
          ...current.filter((item) => item.user_id !== member.id),
          membership,
        ];
        if (selectedWorkspace?.id === workspace.id) setMemberships(update);
        setWorkspaceMemberships((current) => ({
          ...current,
          [workspace.id]: update(current[workspace.id] ?? []),
        }));
        return `Workspace role updated for ${member.email}.`;
      }
    } finally {
      setSaving(false);
    }
  }

  function changeMembership(member: AuthUser, value: string) {
    if (selectedWorkspace)
      requestWorkspaceRoleChange(selectedWorkspace, member, value);
  }

  function requestOrganizationRoleChange(
    member: AuthUser,
    orgRole: AuthUser["org_role"],
  ) {
    if (member.org_role === orgRole) return;
    const administratorCount = users.filter(
      (candidate) => candidate.org_role === "org_admin",
    ).length;
    if (
      member.org_role === "org_admin" &&
      orgRole !== "org_admin" &&
      administratorCount <= 1
    ) {
      toast.error(
        "The last organization admin cannot be downgraded. Assign another admin first.",
      );
      return;
    }
    setRoleChangeResult(null);
    setPendingRoleChange({
      scope: "organization",
      member,
      previousRole: member.org_role,
      nextRole: orgRole,
    });
  }

  async function applyOrganizationRoleChange(
    member: AuthUser,
    orgRole: AuthUser["org_role"],
  ) {
    if (!accessToken || !canManage)
      throw new Error("Organization role cannot be updated.");
    setSaving(true);
    try {
      const updated = await updateOrganizationUser(
        organizationId,
        member.id,
        orgRole,
        accessToken,
      );
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      return `${updated.email} is now ${updated.org_role === "org_admin" ? "an organization admin" : "an organization member"}.`;
    } finally {
      setSaving(false);
    }
  }

  async function confirmRoleChange() {
    if (!pendingRoleChange) return;
    setRoleChangeResult(null);
    try {
      const message =
        (pendingRoleChange.scope === "organization"
          ? await applyOrganizationRoleChange(
              pendingRoleChange.member,
              pendingRoleChange.nextRole,
            )
          : await applyWorkspaceRoleChange(
              pendingRoleChange.workspace,
              pendingRoleChange.member,
              pendingRoleChange.nextRole,
            )) ?? "Role updated.";
      setRoleChangeResult({ status: "success", message });
      toast.success(message);
    } catch (cause) {
      const message = errorText(cause, "Unable to update role.");
      setRoleChangeResult({ status: "error", message });
      toast.error(message);
    }
  }

  async function saveWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !canManage || !workspaceEditing || saving) return;
    const form = new FormData(event.currentTarget);
    const errors = validateWorkspaceForm(form);
    if (Object.keys(errors).length) {
      setWorkspaceEditErrors(errors);
      return;
    }
    setWorkspaceEditErrors({});
    const name = String(form.get("workspace-name") ?? "").trim();
    const slug = String(form.get("workspace-slug") ?? "").trim();
    setSaving(true);
    try {
      const updated = await updateWorkspace(
        organizationId,
        workspaceEditing.id,
        accessToken,
        {
          name,
          slug,
          description:
            String(form.get("workspace-description") ?? "").trim() || null,
        },
      );
      setWorkspaces((current) =>
        current.map((workspace) =>
          workspace.id === updated.id ? updated : workspace,
        ),
      );
      setWorkspaceEditing(null);
      toast.success(`${updated.name} was updated.`);
    } catch (cause) {
      const message = errorText(cause, "Unable to update workspace.");
      setWorkspaceEditErrors({ form: message });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function archiveSelectedWorkspace() {
    if (!accessToken || !canManage || !workspaceArchiving) return;
    setSaving(true);
    try {
      await archiveWorkspace(
        organizationId,
        workspaceArchiving.id,
        accessToken,
      );
      setWorkspaces((current) =>
        current.map((workspace) =>
          workspace.id === workspaceArchiving.id
            ? { ...workspace, status: "archived", is_default: false }
            : workspace,
        ),
      );
      setWorkspaceArchiving(null);
      toast.success(`${workspaceArchiving.name} was archived.`);
    } catch (cause) {
      toast.error(errorText(cause, "Unable to archive workspace."));
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  if (!canManage) {
    return (
      <main className="min-h-0 px-4 py-4 sm:px-6 md:p-6">
        <section className="mx-auto grid max-w-3xl gap-5">
          <Card>
            <CardHeader>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-destructive">
                Access denied
              </p>
              <CardTitle className="text-2xl">
                Organization administration
              </CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">
                Your account does not have permission to manage this
                organization.
              </p>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <ShieldAlertIcon />
                <AlertTitle>Access denied</AlertTitle>
                <AlertDescription>
                  <span className="block">
                    Organization: <code>{organizationId}</code>
                  </span>
                  <span className="block">Your role: Organization member</span>
                  <span className="mt-2 block">
                    Ask an organization admin if you need access.
                  </span>
                </AlertDescription>
              </Alert>
              <Button type="button" className="mt-5" onClick={onBack}>
                Return to workspace
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  const administrators = users.filter(
    (member) => member.org_role === "org_admin",
  );

  const initialLoading =
    loading && users.length === 0 && workspaces.length === 0;
  const refreshing = loading && !initialLoading;
  const membershipError = Object.values(membershipErrors)[0];

  return (
    <main className="min-h-0 px-4 py-4 sm:px-6 md:p-6">
      <div className="mx-auto grid w-full max-w-6xl gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <OrganizationAdministrationHeader />
          <div className="flex flex-wrap items-center justify-end gap-2">
            {refreshing && (
              <Badge
                variant="outline"
                className="border-info/30 bg-info/10 text-info"
              >
                <LoaderCircleIcon className="animate-spin" /> Updating
              </Badge>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void loadAdminData()}
            >
              <RefreshCwIcon className={cn(loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>
              Organization administration could not be loaded
            </AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {membershipError && (
          <Alert>
            <CircleAlertIcon />
            <AlertTitle>Some workspace access is unavailable</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              <span>{membershipError}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => void loadAdminData()}
              >
                Retry access load
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as OrganizationTab)}
          className="gap-5"
        >
          <TabsList
            variant="line"
            className="h-auto w-full flex-wrap justify-start gap-1 border-border p-0"
          >
            <TabsTrigger value="overview" className="h-10 flex-none px-3">
              Overview
            </TabsTrigger>
            <TabsTrigger value="workspaces" className="h-10 flex-none px-3">
              Workspaces
            </TabsTrigger>
            <TabsTrigger value="members" className="h-10 flex-none px-3">
              Members
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <Overview
              organizationName={organizationName}
              organizationId={organizationId}
              role={user.org_role}
              workspaceCount={
                workspaces.filter((workspace) => workspace.status === "active")
                  .length
              }
              memberCount={users.length}
              administrators={administrators}
              loading={initialLoading}
              onMembers={() => setTab("members")}
              onWorkspaces={() => setTab("workspaces")}
            />
          </TabsContent>
          <TabsContent value="members">
            <MembersPanel
              users={users}
              workspaces={workspaces}
              workspaceMemberships={workspaceMemberships}
              loading={initialLoading}
              refreshing={refreshing}
              saving={saving}
              currentUserId={user.id}
              onAdd={() => setMemberOpen(true)}
              onRoleChange={requestOrganizationRoleChange}
              onManageWorkspaceAccess={setMemberWorkspaceAccess}
            />
          </TabsContent>
          <TabsContent value="workspaces">
            <WorkspacesPanel
              workspaces={workspaces}
              selectedWorkspace={selectedWorkspace}
              users={users}
              memberships={memberships}
              loading={initialLoading}
              refreshing={refreshing}
              membershipsLoading={membershipsLoading}
              membershipError={
                selectedWorkspace
                  ? membershipErrors[selectedWorkspace.id]
                  : undefined
              }
              saving={saving}
              showAssignmentPrompt={
                assignmentWorkspaceId === selectedWorkspace?.id
              }
              onCreate={() => setWorkspaceOpen(true)}
              onSelect={setSelectedWorkspaceId}
              onEdit={setWorkspaceEditing}
              onArchive={setWorkspaceArchiving}
              onRoleChange={changeMembership}
            />
          </TabsContent>
        </Tabs>
        <MemberDialog
          open={memberOpen}
          onOpenChange={(open) => {
            setMemberOpen(open);
            if (!open) setMemberErrors({});
          }}
          saving={saving}
          errors={memberErrors}
          onSubmit={addMember}
        />
        <WorkspaceDialog
          open={workspaceOpen}
          onOpenChange={(open) => {
            setWorkspaceOpen(open);
            if (!open) setWorkspaceErrors({});
          }}
          saving={saving}
          errors={workspaceErrors}
          onSubmit={addWorkspace}
        />
        <EditWorkspaceDialog
          workspace={workspaceEditing}
          open={Boolean(workspaceEditing)}
          onOpenChange={(open) => {
            if (!open) {
              setWorkspaceEditing(null);
              setWorkspaceEditErrors({});
            }
          }}
          saving={saving}
          errors={workspaceEditErrors}
          onSubmit={saveWorkspace}
        />
        <ArchiveWorkspaceDialogWithFocus
          workspace={workspaceArchiving}
          open={Boolean(workspaceArchiving)}
          onOpenChange={(open) => !open && setWorkspaceArchiving(null)}
          saving={saving}
          onConfirm={archiveSelectedWorkspace}
        />
        <MemberWorkspaceAccessDialog
          member={memberWorkspaceAccess}
          workspaces={workspaces}
          workspaceMemberships={workspaceMemberships}
          open={Boolean(memberWorkspaceAccess)}
          onOpenChange={(open) => !open && setMemberWorkspaceAccess(null)}
          saving={saving}
          onRoleChange={requestWorkspaceRoleChange}
        />
        <RoleChangeDialogWithFocus
          change={pendingRoleChange}
          result={roleChangeResult}
          saving={saving}
          onOpenChange={(open) => {
            if (!open) {
              setPendingRoleChange(null);
              setRoleChangeResult(null);
            }
          }}
          onConfirm={confirmRoleChange}
        />
      </div>
    </main>
  );
}

function OrganizationAdministrationHeader() {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <p className="text-sm font-semibold text-foreground">
        Organization access
      </p>
      <Badge variant="outline" className="shrink-0 rounded-full text-primary">
        <ShieldCheckIcon className="size-3.5" /> Organization admin
      </Badge>
    </div>
  );
}

function MembersPanel({
  users,
  workspaces,
  workspaceMemberships,
  loading,
  refreshing,
  saving,
  currentUserId,
  onAdd,
  onRoleChange,
  onManageWorkspaceAccess,
}: {
  users: AuthUser[];
  workspaces: Workspace[];
  workspaceMemberships: Record<string, WorkspaceMembership[]>;
  loading: boolean;
  refreshing: boolean;
  saving: boolean;
  currentUserId: string;
  onAdd: () => void;
  onRoleChange: (member: AuthUser, role: AuthUser["org_role"]) => void;
  onManageWorkspaceAccess: (member: AuthUser) => void;
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AuthUser["org_role"]>(
    "all",
  );
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const filteredUsers = useMemo(
    () =>
      users.filter((member) => {
        const matchesQuery = `${member.display_name} ${member.email}`
          .toLowerCase()
          .includes(query.trim().toLowerCase());
        const matchesRole =
          roleFilter === "all" || member.org_role === roleFilter;
        const assignedWorkspaceIds = workspaces
          .filter((workspace) =>
            (workspaceMemberships[workspace.id] ?? []).some(
              (membership) => membership.user_id === member.id,
            ),
          )
          .map((workspace) => workspace.id);
        const matchesWorkspace =
          workspaceFilter === "all" ||
          (workspaceFilter === "unassigned"
            ? assignedWorkspaceIds.length === 0
            : assignedWorkspaceIds.includes(workspaceFilter));
        return matchesQuery && matchesRole && matchesWorkspace;
      }),
    [
      query,
      roleFilter,
      users,
      workspaceFilter,
      workspaceMemberships,
      workspaces,
    ],
  );
  const canCurrentUserChangeRole =
    users.filter((member) => member.org_role === "org_admin").length > 1;
  const hasFilters =
    Boolean(query.trim()) || roleFilter !== "all" || workspaceFilter !== "all";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Organization members
          </p>
          <CardTitle className="mt-1">People and access</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Organization Admin manages the organization. Workspace Admin manages
            access within a workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {refreshing && (
            <Badge
              variant="outline"
              className="border-info/30 bg-info/10 text-info"
            >
              <LoaderCircleIcon className="animate-spin" /> Updating
            </Badge>
          )}
          <Button onClick={onAdd}>
            <PlusIcon /> Add member
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 border-b py-4 sm:grid-cols-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name or email"
          aria-label="Search members"
        />
        <DropdownField
          value={roleFilter}
          onValueChange={(value) =>
            setRoleFilter(value as "all" | AuthUser["org_role"])
          }
          ariaLabel="Filter members by organization role"
          options={[
            { value: "all", label: "All organization roles" },
            { value: "org_admin", label: "Organization admins" },
            { value: "org_member", label: "Organization members" },
          ]}
        />
        <DropdownField
          value={workspaceFilter}
          onValueChange={setWorkspaceFilter}
          ariaLabel="Filter members by workspace access"
          options={[
            { value: "all", label: "All workspace access" },
            { value: "unassigned", label: "No workspace assigned" },
            ...workspaces.map((workspace) => ({
              value: workspace.id,
              label: workspace.name,
            })),
          ]}
        />
      </CardContent>
      <MemberList
        users={filteredUsers}
        organizationMemberCount={users.length}
        hasFilters={hasFilters}
        workspaces={workspaces}
        workspaceMemberships={workspaceMemberships}
        loading={loading}
        saving={saving}
        currentUserId={currentUserId}
        canCurrentUserChangeRole={canCurrentUserChangeRole}
        onRoleChange={onRoleChange}
        onManageWorkspaceAccess={onManageWorkspaceAccess}
      />
    </Card>
  );
}
function WorkspacesPanel({
  workspaces,
  selectedWorkspace,
  users,
  memberships,
  loading,
  refreshing,
  membershipsLoading,
  membershipError,
  saving,
  showAssignmentPrompt,
  onCreate,
  onSelect,
  onEdit,
  onArchive,
  onRoleChange,
}: {
  workspaces: Workspace[];
  selectedWorkspace: Workspace | null;
  users: AuthUser[];
  memberships: WorkspaceMembership[];
  loading: boolean;
  refreshing: boolean;
  membershipsLoading: boolean;
  membershipError?: string;
  saving: boolean;
  showAssignmentPrompt: boolean;
  onCreate: () => void;
  onSelect: (workspaceId: string) => void;
  onEdit: (workspace: Workspace) => void;
  onArchive: (workspace: Workspace) => void;
  onRoleChange: (member: AuthUser, value: string) => void;
}) {
  return (
    <div
      className="grid items-start gap-5 md:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.5fr)]"
      onKeyDown={(event) => {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
          return;
        const buttons = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>(
            "[data-workspace-id]",
          ),
        );
        const activeButton =
          event.target instanceof HTMLElement
            ? event.target.closest<HTMLButtonElement>("[data-workspace-id]")
            : null;
        if (!activeButton) return;
        const index = buttons.indexOf(activeButton);
        event.preventDefault();
        const nextIndex =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? buttons.length - 1
              : (index +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  buttons.length) %
                buttons.length;
        const next = buttons[nextIndex];
        onSelect(next.dataset.workspaceId ?? "");
        next.focus();
      }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b">
          <div>
            <CardTitle>Workspaces</CardTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Each workspace has its own member roles.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {refreshing && (
              <Badge
                variant="outline"
                className="border-info/30 bg-info/10 text-info"
              >
                <LoaderCircleIcon className="animate-spin" /> Updating
              </Badge>
            )}
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onCreate}
              aria-label="Create workspace"
            >
              <PlusIcon />
            </Button>
          </div>
        </CardHeader>
        {loading ? (
          <CardContent className="grid gap-1.5 py-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-20 rounded-lg" />
            ))}
          </CardContent>
        ) : workspaces.length ? (
          <CardContent className="grid gap-1.5 py-3">
            {workspaces.map((workspace) => (
              <Button
                key={workspace.id}
                type="button"
                data-workspace-id={workspace.id}
                onClick={() => onSelect(workspace.id)}
                aria-pressed={selectedWorkspace?.id === workspace.id}
                variant={
                  selectedWorkspace?.id === workspace.id ? "secondary" : "ghost"
                }
                className="h-auto w-full flex-col items-stretch gap-1.5 p-3 text-left whitespace-normal"
              >
                <span className="flex items-center justify-between gap-2">
                  <strong className="truncate text-sm">{workspace.name}</strong>
                  <WorkspaceStatus status={workspace.status} />
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {workspace.description || workspace.slug}
                </span>
                {workspace.is_default && (
                  <span className="mt-2 block text-xs font-medium text-primary">
                    Default workspace
                  </span>
                )}
              </Button>
            ))}
          </CardContent>
        ) : (
          <OrganizationEmptyState
            icon={FolderKanbanIcon}
            title="No workspaces yet"
            detail="Create a workspace, then assign its admins and members."
          />
        )}
      </Card>
      <WorkspaceInspector
        workspace={selectedWorkspace}
        users={users}
        memberships={memberships}
        loading={membershipsLoading || loading}
        membershipError={membershipError}
        saving={saving}
        showAssignmentPrompt={showAssignmentPrompt}
        onEdit={onEdit}
        onArchive={onArchive}
        onRoleChange={onRoleChange}
      />
    </div>
  );
}
function Overview({
  organizationName,
  organizationId,
  role,
  workspaceCount,
  memberCount,
  administrators,
  loading,
  onMembers,
  onWorkspaces,
}: {
  organizationName: string;
  organizationId: string;
  role: AuthUser["org_role"];
  workspaceCount: number;
  memberCount: number;
  administrators: AuthUser[];
  loading: boolean;
  onMembers: () => void;
  onWorkspaces: () => void;
}) {
  const issues = loading
    ? []
    : [
        ...(memberCount === 0
          ? [
              {
                title: "No organization members",
                detail: "Add the first member to begin assigning access.",
                action: "Manage members",
                onClick: onMembers,
              },
            ]
          : []),
        ...(workspaceCount === 0
          ? [
              {
                title: "No active workspaces",
                detail: "Create a workspace before assigning workspace access.",
                action: "Manage workspaces",
                onClick: onWorkspaces,
              },
            ]
          : []),
        ...(administrators.length < 2 && memberCount > 0
          ? [
              {
                title: "Only one organization admin",
                detail:
                  "Assign a second admin to avoid a single point of access.",
                action: "Manage members",
                onClick: onMembers,
              },
            ]
          : []),
      ];

  return (
    <div className="grid gap-5">
      <section
        aria-label="Organization summary"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        <MetricCard
          label="Members"
          value={loading ? "—" : String(memberCount)}
          detail="Organization access"
        />
        <MetricCard
          label="Workspaces"
          value={loading ? "—" : String(workspaceCount)}
          detail="Active workspaces"
        />
        <MetricCard
          label="Organization admins"
          value={loading ? "—" : String(administrators.length)}
          detail="Can manage this organization"
        />
      </section>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>
              Manage people and workspace access.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-5">
            <Button onClick={onMembers}>
              <UsersRoundIcon /> Manage members
            </Button>
            <Button variant="outline" onClick={onWorkspaces}>
              <FolderKanbanIcon /> Manage workspaces
            </Button>
          </CardContent>
        </Card>
        <OrganizationContext
          organizationName={organizationName}
          organizationId={organizationId}
          role={role}
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tracking-tight">{value}</CardTitle>
      </CardHeader>
      <CardFooter>
        <CardDescription>{detail}</CardDescription>
      </CardFooter>
    </Card>
  );
}

function OrganizationContext({
  organizationName,
  organizationId,
  role,
}: {
  organizationName: string;
  organizationId: string;
  role: AuthUser["org_role"];
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Organization context</CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <dl className="grid gap-3 text-sm">
          <Summary label="Organization name" value={organizationName} />
          <Summary
            label="Your role"
            value={
              role === "org_admin"
                ? "Organization admin"
                : "Organization member"
            }
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function Summary({
  label,
  value,
  technical = false,
}: {
  label: string;
  value: string;
  technical?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "max-w-[65%] truncate font-medium",
          technical && "font-mono text-xs",
        )}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function DropdownField({
  id,
  value,
  options,
  onValueChange,
  ariaLabel,
  ariaLabelledBy,
  disabled = false,
  className,
}: {
  id?: string;
  value: string;
  options: readonly { value: string; label: string; disabled?: boolean }[];
  onValueChange: (value: string) => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  disabled?: boolean;
  className?: string;
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            className={cn("w-full justify-between", className)}
          >
            <span className="truncate">
              {selectedOption?.label ?? "Choose an option"}
            </span>
            <ChevronDownIcon data-icon="inline-end" />
          </Button>
        }
      />
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MemberList({
  users,
  organizationMemberCount,
  hasFilters,
  workspaces,
  workspaceMemberships,
  loading,
  saving,
  currentUserId,
  canCurrentUserChangeRole,
  onRoleChange,
  onManageWorkspaceAccess,
}: {
  users: AuthUser[];
  organizationMemberCount: number;
  hasFilters: boolean;
  workspaces: Workspace[];
  workspaceMemberships: Record<string, WorkspaceMembership[]>;
  loading: boolean;
  saving: boolean;
  currentUserId: string;
  canCurrentUserChangeRole: boolean;
  onRoleChange: (member: AuthUser, role: AuthUser["org_role"]) => void;
  onManageWorkspaceAccess: (member: AuthUser) => void;
}) {
  if (loading)
    return (
      <div className="grid gap-2 p-4">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  if (!users.length) {
    const title =
      organizationMemberCount === 0
        ? "No organization members yet"
        : "No matching members";
    const detail =
      organizationMemberCount === 0
        ? "Add the first member before assigning organization or workspace access."
        : hasFilters
          ? "No members match the current search or filters. Adjust them to continue."
          : "Add an organization member to begin assigning access.";
    return (
      <OrganizationEmptyState
        icon={UsersRoundIcon}
        title={title}
        detail={detail}
      />
    );
  }
  return (
    <div className="divide-y divide-border">
      {users.map((member) => {
        const isCurrentUser = member.id === currentUserId;
        const workspaceAccess = workspaces.flatMap((workspace) => {
          const membership = (workspaceMemberships[workspace.id] ?? []).find(
            (item) => item.user_id === member.id,
          );
          return membership ? [{ workspace, role: membership.role }] : [];
        });
        return (
          <article
            key={member.id}
            className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(180px,0.85fr)_minmax(160px,0.6fr)_minmax(0,1.45fr)_auto] lg:items-center sm:px-5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="size-9 shrink-0">
                <AvatarFallback className="bg-muted text-xs font-semibold text-primary">
                  {initials(member.display_name || member.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {member.display_name || member.email}{" "}
                  {isCurrentUser && (
                    <span className="font-normal text-muted-foreground">
                      (you)
                    </span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {member.email}
                </p>
              </div>
            </div>
            <div className="grid gap-1">
              <p className="text-xs text-muted-foreground">Organization role</p>
              {isCurrentUser && !canCurrentUserChangeRole ? (
                <Badge
                  variant="outline"
                  className="w-fit rounded-full text-primary"
                  title="Assign another organization admin before lowering your own role"
                >
                  Organization admin
                </Badge>
              ) : (
                <DropdownField
                  value={member.org_role}
                  onValueChange={(value) =>
                    onRoleChange(member, value as AuthUser["org_role"])
                  }
                  ariaLabel={`Organization role for ${member.email}`}
                  options={organizationRoleOptions}
                  disabled={saving}
                />
              )}
            </div>
            <div className="grid gap-1">
              <p className="text-xs text-muted-foreground">Workspace access</p>
              {workspaceAccess.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {workspaceAccess.map(({ workspace, role }) => (
                    <Badge
                      key={workspace.id}
                      variant="outline"
                      className={
                        role === "workspace_admin"
                          ? "border-primary/30 bg-primary/5 text-primary"
                          : ""
                      }
                    >
                      {workspace.name} ·{" "}
                      {role === "workspace_admin" ? "Workspace admin" : role}
                    </Badge>
                  ))}
                </div>
              ) : (
                <Badge
                  variant="outline"
                  className="w-fit text-muted-foreground"
                >
                  No workspace assigned
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => onManageWorkspaceAccess(member)}
            >
              Manage access
            </Button>
          </article>
        );
      })}
    </div>
  );
}

function WorkspaceInspector({
  workspace,
  users,
  memberships,
  loading,
  membershipError,
  saving,
  showAssignmentPrompt,
  onEdit,
  onArchive,
  onRoleChange,
}: {
  workspace: Workspace | null;
  users: AuthUser[];
  memberships: WorkspaceMembership[];
  loading: boolean;
  membershipError?: string;
  saving: boolean;
  showAssignmentPrompt: boolean;
  onEdit: (workspace: Workspace) => void;
  onArchive: (workspace: Workspace) => void;
  onRoleChange: (member: AuthUser, value: string) => void;
}) {
  if (!workspace && loading)
    return (
      <Card>
        <CardHeader className="gap-3 border-b">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </CardHeader>
        <CardContent className="grid gap-2 py-4">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-20 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  if (!workspace)
    return (
      <section className={cn(panelClass, "overflow-hidden")}>
        <OrganizationEmptyState
          icon={FolderKanbanIcon}
          title="Select a workspace"
          detail="Select one to review and configure member access."
        />
      </section>
    );
  const roles = new Map(
    memberships.map((membership) => [membership.user_id, membership.role]),
  );
  const canAssignMembers = workspace.status === "active";
  const canArchive = canAssignMembers && !workspace.is_default;
  return (
    <Card aria-labelledby="workspace-members-title">
      <CardHeader className="gap-3 border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Workspace access
            </p>
            <CardTitle id="workspace-members-title" className="mt-1">
              {workspace.name}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {workspace.description || workspace.slug}
            </p>
          </div>
          <WorkspaceStatus status={workspace.status} />
        </div>
        <dl className="grid gap-2 text-xs sm:grid-cols-2">
          <Summary label="Slug" value={workspace.slug} technical />
          <Summary label="Workspace ID" value={workspace.id} technical />
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={saving || !canAssignMembers}
            onClick={() => onEdit(workspace)}
          >
            <PencilIcon /> Edit details
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={saving || !canArchive}
            onClick={() => onArchive(workspace)}
          >
            <ArchiveIcon /> Archive workspace
          </Button>
        </div>
      </CardHeader>
      {workspace.is_default && (
        <Alert className="mx-5 mt-5">
          <ShieldAlertIcon />
          <AlertTitle>Default workspace is protected</AlertTitle>
          <AlertDescription>
            Choose another default workspace before archiving or deleting this
            one.
          </AlertDescription>
        </Alert>
      )}
      {showAssignmentPrompt && (
        <Alert className="mx-5 mt-5">
          <ShieldCheckIcon />
          <AlertTitle>Assign access next</AlertTitle>
          <AlertDescription>
            Set a workspace admin, then add members below.
          </AlertDescription>
        </Alert>
      )}
      {!canAssignMembers && (
        <Alert className="mx-5 mt-5">
          <CircleAlertIcon />
          <AlertTitle>Archived workspace</AlertTitle>
          <AlertDescription>
            Workspace access is read-only while this workspace is archived.
          </AlertDescription>
        </Alert>
      )}
      {membershipError && (
        <Alert variant="destructive" className="mx-5 mt-5">
          <CircleAlertIcon />
          <AlertTitle>Workspace access could not be refreshed</AlertTitle>
          <AlertDescription>
            {membershipError} Existing access data is still shown where
            available.
          </AlertDescription>
        </Alert>
      )}
      {loading ? (
        <CardContent className="grid gap-2 py-4">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-20 rounded-lg" />
          ))}
        </CardContent>
      ) : users.length ? (
        <div className="divide-y divide-border">
          {users.map((member) => (
            <div
              key={member.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {member.display_name || member.email}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.email}
                </p>
              </div>
              <DropdownField
                value={roles.get(member.id) ?? "none"}
                onValueChange={(value) => onRoleChange(member, value)}
                ariaLabel={`Workspace role for ${member.email}`}
                options={workspaceRoleOptions}
                disabled={saving || !canAssignMembers}
                className="sm:w-48"
              />
            </div>
          ))}
        </div>
      ) : (
        <OrganizationEmptyState
          icon={UsersRoundIcon}
          title="No organization members yet"
          detail="Add a member before assigning workspace access."
        />
      )}
    </Card>
  );
}

function WorkspaceStatus({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const styles =
    normalized === "active"
      ? "border-status-success/30 bg-status-success/10 text-status-success"
      : normalized === "archived" || normalized === "failed"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : normalized === "updating"
          ? "border-status-warning/30 bg-status-warning/10 text-status-warning"
          : "border-warning/30 bg-warning/10 text-warning";
  return (
    <Badge variant="outline" className={styles}>
      {normalized === "active"
        ? "Active"
        : normalized === "archived"
          ? "Archived"
          : normalized === "updating"
            ? "Updating"
            : normalized === "failed"
              ? "Failed"
              : status}
    </Badge>
  );
}

function OrganizationEmptyState({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof FolderKanbanIcon;
  title: string;
  detail: string;
}) {
  return (
    <Empty className="min-h-44">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{detail}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function MemberDialog({
  open,
  onOpenChange,
  saving,
  errors,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  errors: FieldErrors;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [role, setRole] = useState<AuthUser["org_role"]>("org_member");

  useEffect(() => {
    if (open) setRole("org_member");
  }, [open]);

  return (
    <AdministrationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add organization member"
      description="Create an active user with a temporary password. Workspace access is assigned separately."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="add-member-form" disabled={saving}>
            {saving && <LoaderCircleIcon className="animate-spin" />}Add member
          </Button>
        </>
      }
    >
      <form id="add-member-form" onSubmit={onSubmit}>
        <FieldGroup className="gap-3">
          {errors.form && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          )}
          <FormField
            id="member-name"
            label="Name"
            placeholder="e.g. Linh Nguyen"
            error={errors["member-name"]}
          />
          <FormField
            id="member-email"
            label="Work email"
            type="email"
            placeholder="linh@company.com"
            error={errors["member-email"]}
          />
          <FormField
            id="member-password"
            label="Temporary password"
            type="password"
            minLength={8}
            error={errors["member-password"]}
          />
          <Field>
            <FieldLabel htmlFor="member-role">Organization role</FieldLabel>
            <input type="hidden" name="member-role" value={role} />
            <DropdownField
              id="member-role"
              value={role}
              onValueChange={(value) => setRole(value as AuthUser["org_role"])}
              options={organizationRoleOptions}
              ariaLabel="Organization role"
            />
          </Field>
        </FieldGroup>
      </form>
    </AdministrationDialog>
  );
}

function WorkspaceDialog({
  open,
  onOpenChange,
  saving,
  errors,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  errors: FieldErrors;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <WorkspaceFormDialog
      open={open}
      onOpenChange={onOpenChange}
      saving={saving}
      errors={errors}
      onSubmit={onSubmit}
      title="Create workspace"
      description="Create a scoped place for a team or investigation, then assign its members."
      submitLabel="Create workspace"
      formId="create-workspace-form"
    />
  );
}

function EditWorkspaceDialog({
  workspace,
  open,
  onOpenChange,
  saving,
  errors,
  onSubmit,
}: {
  workspace: Workspace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  errors: FieldErrors;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!workspace) return null;
  return (
    <WorkspaceFormDialog
      open={open}
      onOpenChange={onOpenChange}
      saving={saving}
      errors={errors}
      onSubmit={onSubmit}
      title="Edit workspace"
      description="Update the workspace information used throughout this organization."
      submitLabel="Save changes"
      formId="edit-workspace-form"
      workspace={workspace}
    />
  );
}

function AdministrationDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-lg", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WorkspaceFormDialog({
  open,
  onOpenChange,
  saving,
  errors,
  onSubmit,
  title,
  description,
  submitLabel,
  formId,
  workspace,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  errors: FieldErrors;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  title: string;
  description: string;
  submitLabel: string;
  formId: string;
  workspace?: Workspace;
}) {
  const [workspaceName, setWorkspaceName] = useState(workspace?.name ?? "");
  const [workspaceSlug, setWorkspaceSlug] = useState(workspace?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(workspace));

  useEffect(() => {
    if (!open) return;
    setWorkspaceName(workspace?.name ?? "");
    setWorkspaceSlug(workspace?.slug ?? "");
    setSlugEdited(Boolean(workspace));
  }, [open, workspace?.id, workspace?.name, workspace?.slug]);

  function handleWorkspaceNameChange(event: ChangeEvent<HTMLInputElement>) {
    const nextName = event.target.value;
    setWorkspaceName(nextName);
    if (!slugEdited) setWorkspaceSlug(slugify(nextName));
  }

  return (
    <AdministrationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={saving}>
            {saving && <LoaderCircleIcon className="animate-spin" />}
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit}>
        <FieldGroup className="gap-3">
          {errors.form && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          )}
          <FormField
            id="workspace-name"
            label="Workspace name"
            placeholder="e.g. Research"
            value={workspaceName}
            onChange={handleWorkspaceNameChange}
            error={errors["workspace-name"]}
          />
          <FormField
            id="workspace-slug"
            label="Workspace slug"
            placeholder="e.g. research"
            value={workspaceSlug}
            onChange={(event) => {
              setSlugEdited(true);
              setWorkspaceSlug(event.target.value);
            }}
            error={errors["workspace-slug"]}
          />
          <Field
            data-invalid={Boolean(errors["workspace-description"]) || undefined}
          >
            <FieldLabel htmlFor="workspace-description">Description</FieldLabel>
            <Textarea
              id="workspace-description"
              name="workspace-description"
              defaultValue={workspace?.description ?? ""}
              placeholder="What belongs in this workspace?"
              aria-invalid={Boolean(errors["workspace-description"])}
              aria-describedby={
                errors["workspace-description"]
                  ? "workspace-description-error"
                  : undefined
              }
            />
            {errors["workspace-description"] && (
              <FieldError id="workspace-description-error">
                {errors["workspace-description"]}
              </FieldError>
            )}
          </Field>
        </FieldGroup>
      </form>
    </AdministrationDialog>
  );
}

function ArchiveWorkspaceDialog({
  workspace,
  open,
  onOpenChange,
  saving,
  onConfirm,
}: {
  workspace: Workspace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  onConfirm: () => void;
}) {
  const [confirmationName, setConfirmationName] = useState("");
  useEffect(() => setConfirmationName(""), [open, workspace?.id]);
  if (!workspace) return null;
  const confirmed = confirmationName === workspace.name;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Archive workspace?</DialogTitle>
          <DialogDescription>
            <strong>{workspace.name}</strong> will remain visible for audit, but
            its member access will become read-only.
          </DialogDescription>
        </DialogHeader>
        <Alert>
          <ArchiveIcon />
          <AlertTitle>Permanent delete is unavailable</AlertTitle>
          <AlertDescription>
            AXIOM only allows permanent deletion after dependency checks are
            supported by the backend.
          </AlertDescription>
        </Alert>
        <Field>
          <FieldLabel htmlFor="archive-workspace-confirmation">
            Type <strong>{workspace.name}</strong> to confirm
          </FieldLabel>
          <Input
            id="archive-workspace-confirmation"
            value={confirmationName}
            onChange={(event) => setConfirmationName(event.target.value)}
            autoComplete="off"
          />
        </Field>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={saving || !confirmed}
            onClick={onConfirm}
          >
            {saving && <LoaderCircleIcon className="animate-spin" />}Archive
            workspace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoleChangeDialog({
  change,
  result,
  saving,
  onOpenChange,
  onConfirm,
}: {
  change: PendingRoleChange | null;
  result: RoleChangeResult | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  if (!change) return null;
  const organizationScope = change.scope === "organization";
  const oldRole = organizationScope
    ? change.previousRole === "org_admin"
      ? "Organization admin"
      : "Organization member"
    : workspaceRoleLabel(change.previousRole);
  const newRole = organizationScope
    ? change.nextRole === "org_admin"
      ? "Organization admin"
      : "Organization member"
    : workspaceRoleLabel(change.nextRole);
  const grantsOrganizationAdmin =
    organizationScope && change.nextRole === "org_admin";
  const removesPrivilege =
    (organizationScope &&
      change.previousRole === "org_admin" &&
      change.nextRole !== "org_admin") ||
    (!organizationScope && change.nextRole === "none");
  const scopeLabel = organizationScope
    ? "Entire organization — manage members, workspaces, and organization settings"
    : `${change.workspace.name} — this workspace only`;
  const actionLabel = grantsOrganizationAdmin
    ? "Grant organization admin"
    : removesPrivilege
      ? "Confirm access removal"
      : "Confirm role change";
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Confirm role change</DialogTitle>
          <DialogDescription>
            Review the affected person, role change, and permission scope before
            applying it.
          </DialogDescription>
        </DialogHeader>
        <dl className="grid gap-3 rounded-lg border bg-muted/50 p-4 text-sm">
          <Summary
            label="Member"
            value={change.member.display_name || change.member.email}
          />
          <Summary label="Email" value={change.member.email} />
          <Summary label="Current role" value={oldRole} />
          <Summary label="New role" value={newRole} />
          <Summary label="Permission scope" value={scopeLabel} />
        </dl>
        {grantsOrganizationAdmin && (
          <Alert>
            <ShieldAlertIcon />
            <AlertTitle>Organization-wide administrator access</AlertTitle>
            <AlertDescription>
              This grants {change.member.display_name || change.member.email}{" "}
              control over all members and workspaces in this organization.
            </AlertDescription>
          </Alert>
        )}
        {removesPrivilege && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>
              {organizationScope
                ? "Organization admin access will be removed"
                : "Workspace access will be revoked"}
            </AlertTitle>
            <AlertDescription>
              {organizationScope
                ? "This member will no longer manage organization-level users or workspaces."
                : `This member will lose access to ${change.workspace.name}.`}
            </AlertDescription>
          </Alert>
        )}
        {saving && (
          <Alert>
            <LoaderCircleIcon className="animate-spin" />
            <AlertTitle>Applying role change</AlertTitle>
            <AlertDescription>
              Updating access for {change.member.email}.
            </AlertDescription>
          </Alert>
        )}
        {result && (
          <Alert
            variant={result.status === "error" ? "destructive" : "default"}
            className={
              result.status === "success"
                ? "border-success/30 bg-success/10"
                : undefined
            }
          >
            <ShieldCheckIcon />
            <AlertTitle>
              {result.status === "success"
                ? "Role updated"
                : "Role change failed"}
            </AlertTitle>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          {result?.status === "success" ? (
            <Button type="button" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={removesPrivilege ? "destructive" : "default"}
                disabled={saving}
                onClick={onConfirm}
              >
                {saving && <LoaderCircleIcon className="animate-spin" />}
                {result?.status === "error" ? "Try again" : actionLabel}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function workspaceRoleLabel(role: WorkspaceRole | "none") {
  if (role === "workspace_admin") return "Workspace admin";
  if (role === "none") return "No access";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function ArchiveWorkspaceDialogWithFocus({
  workspace,
  open,
  onOpenChange,
  saving,
  onConfirm,
}: {
  workspace: Workspace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  onConfirm: () => void;
}) {
  const warningRef = useRef<HTMLDivElement>(null);
  useConfirmationDialogFocus(open && Boolean(workspace), warningRef);
  const [confirmationName, setConfirmationName] = useState("");
  useEffect(() => setConfirmationName(""), [open, workspace?.id]);
  if (!workspace) return null;
  const confirmed = confirmationName === workspace.name;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Archive workspace?</DialogTitle>
          <DialogDescription>
            <strong>{workspace.name}</strong> will remain visible for audit, but
            its member access will become read-only.
          </DialogDescription>
        </DialogHeader>
        <div
          ref={warningRef}
          tabIndex={-1}
          aria-label="Archive workspace warning"
          className="rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <Alert>
            <ArchiveIcon />
            <AlertTitle>Permanent delete is unavailable</AlertTitle>
            <AlertDescription>
              AXIOM only allows permanent deletion after dependency checks are
              supported by the backend.
            </AlertDescription>
          </Alert>
        </div>
        <Field>
          <FieldLabel htmlFor="archive-workspace-confirmation">
            Type <strong>{workspace.name}</strong> to confirm
          </FieldLabel>
          <Input
            id="archive-workspace-confirmation"
            value={confirmationName}
            onChange={(event) => setConfirmationName(event.target.value)}
            autoComplete="off"
          />
        </Field>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={saving || !confirmed}
            onClick={onConfirm}
          >
            {saving && <LoaderCircleIcon className="animate-spin" />}Archive
            workspace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoleChangeDialogWithFocus({
  change,
  result,
  saving,
  onOpenChange,
  onConfirm,
}: {
  change: PendingRoleChange | null;
  result: RoleChangeResult | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const warningRef = useRef<HTMLDivElement>(null);
  useConfirmationDialogFocus(Boolean(change), warningRef);
  if (!change) return null;
  const organizationScope = change.scope === "organization";
  const oldRole = organizationScope
    ? change.previousRole === "org_admin"
      ? "Organization admin"
      : "Organization member"
    : workspaceRoleLabel(change.previousRole);
  const newRole = organizationScope
    ? change.nextRole === "org_admin"
      ? "Organization admin"
      : "Organization member"
    : workspaceRoleLabel(change.nextRole);
  const grantsOrganizationAdmin =
    organizationScope && change.nextRole === "org_admin";
  const removesPrivilege =
    (organizationScope &&
      change.previousRole === "org_admin" &&
      change.nextRole !== "org_admin") ||
    (!organizationScope && change.nextRole === "none");
  const scopeLabel = organizationScope
    ? "Entire organization — manage members, workspaces, and organization settings"
    : `${change.workspace.name} — this workspace only`;
  const actionLabel = grantsOrganizationAdmin
    ? "Grant organization admin"
    : removesPrivilege
      ? "Confirm access removal"
      : "Confirm role change";
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Confirm role change</DialogTitle>
          <DialogDescription>
            Review the affected person, role change, and permission scope before
            applying it.
          </DialogDescription>
        </DialogHeader>
        <div
          ref={warningRef}
          tabIndex={-1}
          aria-label="Role change warning and summary"
          className="rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <dl className="grid gap-3 rounded-lg border bg-muted/50 p-4 text-sm">
            <Summary
              label="Member"
              value={change.member.display_name || change.member.email}
            />
            <Summary label="Email" value={change.member.email} />
            <Summary label="Current role" value={oldRole} />
            <Summary label="New role" value={newRole} />
            <Summary label="Permission scope" value={scopeLabel} />
          </dl>
        </div>
        {grantsOrganizationAdmin && (
          <Alert>
            <ShieldAlertIcon />
            <AlertTitle>Organization-wide administrator access</AlertTitle>
            <AlertDescription>
              This grants {change.member.display_name || change.member.email}{" "}
              control over all members and workspaces in this organization.
            </AlertDescription>
          </Alert>
        )}
        {removesPrivilege && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>
              {organizationScope
                ? "Organization admin access will be removed"
                : "Workspace access will be revoked"}
            </AlertTitle>
            <AlertDescription>
              {organizationScope
                ? "This member will no longer manage organization-level users or workspaces."
                : `This member will lose access to ${change.workspace.name}.`}
            </AlertDescription>
          </Alert>
        )}
        {saving && (
          <Alert>
            <LoaderCircleIcon className="animate-spin" />
            <AlertTitle>Applying role change</AlertTitle>
            <AlertDescription>
              Updating access for {change.member.email}.
            </AlertDescription>
          </Alert>
        )}
        {result && (
          <Alert
            variant={result.status === "error" ? "destructive" : "default"}
            className={
              result.status === "success"
                ? "border-success/30 bg-success/10"
                : undefined
            }
          >
            <ShieldCheckIcon />
            <AlertTitle>
              {result.status === "success"
                ? "Role updated"
                : "Role change failed"}
            </AlertTitle>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          {result?.status === "success" ? (
            <Button type="button" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={removesPrivilege ? "destructive" : "default"}
                disabled={saving}
                onClick={onConfirm}
              >
                {saving && <LoaderCircleIcon className="animate-spin" />}
                {result?.status === "error" ? "Try again" : actionLabel}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MemberWorkspaceAccessDialog({
  member,
  workspaces,
  workspaceMemberships,
  open,
  onOpenChange,
  saving,
  onRoleChange,
}: {
  member: AuthUser | null;
  workspaces: Workspace[];
  workspaceMemberships: Record<string, WorkspaceMembership[]>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  onRoleChange: (workspace: Workspace, member: AuthUser, value: string) => void;
}) {
  if (!member) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage workspace access</DialogTitle>
          <DialogDescription>
            Assign, change, or revoke access for{" "}
            {member.display_name || member.email}. Organization Admin and
            Workspace Admin are separate roles.
          </DialogDescription>
        </DialogHeader>
        <div className="divide-y divide-border rounded-lg border">
          {workspaces.length ? (
            workspaces.map((workspace) => {
              const membership = (
                workspaceMemberships[workspace.id] ?? []
              ).find((item) => item.user_id === member.id);
              const active = workspace.status.toLowerCase() === "active";
              return (
                <div
                  key={workspace.id}
                  className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {workspace.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {active
                        ? "Workspace role"
                        : "Archived workspace — read-only"}
                    </p>
                  </div>
                  <DropdownField
                    value={membership?.role ?? "none"}
                    onValueChange={(value) =>
                      onRoleChange(workspace, member, value)
                    }
                    ariaLabel={`Workspace role for ${member.email} in ${workspace.name}`}
                    options={workspaceRoleOptions}
                    disabled={saving || !active}
                  />
                </div>
              );
            })
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              Create a workspace before assigning access.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormField({
  id,
  label,
  type = "text",
  placeholder,
  defaultValue,
  value,
  onChange,
  minLength,
  required = true,
  error,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  minLength?: number;
  required?: boolean;
  error?: string;
}) {
  return (
    <Field data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        minLength={minLength}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}
