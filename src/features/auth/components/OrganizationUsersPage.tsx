import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Building2Icon,
  CheckIcon,
  CircleAlertIcon,
  FolderKanbanIcon,
  KeyRoundIcon,
  LoaderCircleIcon,
  MailPlusIcon,
  PlusIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  UsersRoundIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createOrganizationUser, listOrganizationUsers, updateOrganizationUser } from "@/features/auth/api/authApi";
import { createWorkspace, deleteWorkspaceMembership, listWorkspaceMemberships, listWorkspaces, upsertWorkspaceMembership, type Workspace, type WorkspaceMembership, type WorkspaceRole } from "@/features/auth/api/authzApi";
import { useAuth } from "@/features/auth/model/AuthProvider";
import type { AuthUser } from "@/features/auth/model/types";
import { cn } from "@/shared/lib/utils";

const panelClass = "rounded-2xl border border-[#d8d0c2]/90 bg-[#fffdf8]/88 shadow-[0_16px_46px_rgba(24,24,18,0.055)] backdrop-blur-xl dark:border-[#38372f]/80 dark:bg-[#1a1a17]/88";
const inputClass = "h-10 border-[#d8d0c2]/80 bg-[#f7f3eb] shadow-none dark:border-[#49483f] dark:bg-[#20201c]";
type OrganizationTab = "overview" | "workspaces" | "members";

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "AX";
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function errorText(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}

export function OrganizationUsersPage({
  initialTab = "overview",
  onBack,
}: {
  initialTab?: OrganizationTab;
  onBack: () => void;
}) {
  const { user, accessToken } = useAuth();
  const [tab, setTab] = useState<OrganizationTab>(initialTab);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<WorkspaceMembership[]>([]);
  const [loading, setLoading] = useState(false);
  const [membershipsLoading, setMembershipsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  const canManage = user?.org_role === "org_admin";
  const organizationId = user?.organization_id ?? "";
  const selectedWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? workspaces[0] ?? null;
  const membershipByUser = useMemo(() => new Map(memberships.map((membership) => [membership.user_id, membership])), [memberships]);

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
      setWorkspaces(nextWorkspaces.filter((workspace) => workspace.status !== "archived"));
      setSelectedWorkspaceId((current) => current && nextWorkspaces.some((workspace) => workspace.id === current) ? current : nextWorkspaces[0]?.id ?? null);
    } catch (cause) {
      setError(errorText(cause, "Unable to load organization administration."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadAdminData(); }, [accessToken, canManage, organizationId]);

  useEffect(() => { setTab(initialTab); }, [initialTab]);

  useEffect(() => {
    if (!canManage || !selectedWorkspace || !accessToken) {
      setMemberships([]);
      return;
    }
    const controller = new AbortController();
    setMembershipsLoading(true);
    listWorkspaceMemberships(organizationId, selectedWorkspace.id, accessToken)
      .then((nextMemberships) => { if (!controller.signal.aborted) setMemberships(nextMemberships); })
      .catch((cause) => { if (!controller.signal.aborted) setError(errorText(cause, "Unable to load workspace membership.")); })
      .finally(() => { if (!controller.signal.aborted) setMembershipsLoading(false); });
    return () => controller.abort();
  }, [accessToken, canManage, organizationId, selectedWorkspace?.id]);

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !canManage) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const created = await createOrganizationUser(organizationId, {
        displayName: String(form.get("member-name") ?? "").trim(),
        email: String(form.get("member-email") ?? "").trim(),
        password: String(form.get("member-password") ?? ""),
        orgRole: String(form.get("member-role")) as AuthUser["org_role"],
      }, accessToken);
      setUsers((current) => [...current, created].sort((left, right) => left.email.localeCompare(right.email)));
      setMemberOpen(false);
      toast.success(`${created.email} was added to the organization.`);
    } catch (cause) {
      toast.error(errorText(cause, "Unable to add member."));
    } finally {
      setSaving(false);
    }
  }

  async function addWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !canManage) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("workspace-name") ?? "").trim();
    const slug = slugify(String(form.get("workspace-slug") ?? name));
    setSaving(true);
    try {
      const workspace = await createWorkspace(organizationId, accessToken, { name, slug, description: String(form.get("workspace-description") ?? "").trim() || null });
      setWorkspaces((current) => [...current, workspace]);
      setSelectedWorkspaceId(workspace.id);
      setWorkspaceOpen(false);
      toast.success(`${workspace.name} was created. Assign its workspace admin next.`);
    } catch (cause) {
      toast.error(errorText(cause, "Unable to create workspace."));
    } finally {
      setSaving(false);
    }
  }

  async function changeMembership(member: AuthUser, value: string) {
    if (!accessToken || !canManage || !selectedWorkspace) return;
    setSaving(true);
    try {
      if (value === "none") {
        await deleteWorkspaceMembership(organizationId, selectedWorkspace.id, member.id, accessToken);
        setMemberships((current) => current.filter((membership) => membership.user_id !== member.id));
        toast.success(`${member.email} no longer has workspace access.`);
      } else {
        const membership = await upsertWorkspaceMembership(organizationId, selectedWorkspace.id, accessToken, { user_id: member.id, role: value as WorkspaceRole });
        setMemberships((current) => [...current.filter((item) => item.user_id !== member.id), membership]);
        toast.success(`Workspace role updated for ${member.email}.`);
      }
    } catch (cause) {
      toast.error(errorText(cause, "Unable to change workspace access."));
    } finally {
      setSaving(false);
    }
  }

  async function changeOrganizationRole(member: AuthUser, orgRole: AuthUser["org_role"]) {
    if (!accessToken || !canManage || member.id === user?.id || member.org_role === orgRole) return;
    setSaving(true);
    try {
      const updated = await updateOrganizationUser(organizationId, member.id, orgRole, accessToken);
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
      toast.success(`${updated.email} is now ${updated.org_role === "org_admin" ? "an organization admin" : "an organization member"}.`);
    } catch (cause) {
      toast.error(errorText(cause, "Unable to change organization role."));
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  if (!canManage) {
    return <main className="min-h-screen px-5 pb-12 pt-20 sm:px-8 md:pt-10"><section className="mx-auto grid max-w-3xl gap-5"><header className={cn(panelClass, "p-5 sm:p-6")}><p className="text-xs font-medium uppercase tracking-[0.12em] text-[#a33333] dark:text-[#ffb3b3]">Access denied</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Organization administration</h1><p className="mt-1.5 text-sm leading-6 text-[#625d53] dark:text-[#c5bcaf]">Your account does not have permission to manage this organization.</p><Alert variant="destructive" className="mt-5"><ShieldAlertIcon /><AlertTitle>Access denied</AlertTitle><AlertDescription><span className="block">Organization: <code>{organizationId}</code></span><span className="block">Your role: Organization member</span><span className="mt-2 block">Ask an organization admin if you need access.</span></AlertDescription></Alert><Button type="button" className="mt-5" onClick={onBack}>Return to workspace</Button></header></section></main>;
  }

  return <main className="min-h-screen px-5 pb-12 pt-20 sm:px-8 md:pt-10"><div className="mx-auto grid w-full max-w-[1320px] gap-5"><header className={cn(panelClass, "flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between")}><div className="flex min-w-0 items-start gap-3.5"><Avatar size="lg" className="size-12 rounded-xl border border-[#d8d0c2] bg-[#edf2ff] text-[#2456e8] dark:border-[#49483f] dark:bg-[#7895ff]/12 dark:text-[#9aafff]"><AvatarFallback className="rounded-xl bg-transparent text-sm font-semibold">{initials(user.display_name || user.email)}</AvatarFallback></Avatar><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-[0.12em] text-[#777064] dark:text-[#aaa397]">Organization administration</p><h1 className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-3xl">Organization administration</h1><p className="mt-1.5 text-sm leading-6 text-[#625d53] dark:text-[#c5bcaf]">Configure people and workspace access.</p></div></div><Badge variant="outline" className="h-8 w-fit rounded-full border-[#b7c6ff] bg-[#eef3ff] px-3 text-xs text-[#1237b4] dark:border-[#7895ff]/30 dark:bg-[#7895ff]/12 dark:text-[#bcc9ff]"><ShieldCheckIcon className="size-3.5" /> Organization admin</Badge></header>{error && <Alert variant="destructive"><CircleAlertIcon /><AlertTitle>Organization administration could not be loaded</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}<Tabs value={tab} onValueChange={(value) => setTab(value as OrganizationTab)} className="gap-5"><TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-1 border-b border-[#d8d0c2] p-0 dark:border-[#38372f]"><TabsTrigger value="overview" className="h-10 flex-none px-3">Overview</TabsTrigger><TabsTrigger value="workspaces" className="h-10 flex-none px-3">Workspaces</TabsTrigger><TabsTrigger value="members" className="h-10 flex-none px-3">Members</TabsTrigger></TabsList>
    <TabsContent value="overview"><Overview user={user} workspaceCount={workspaces.length} memberCount={users.length} loading={loading} onMembers={() => setTab("members")} onWorkspaces={() => setTab("workspaces")} /></TabsContent>
    <TabsContent value="members"><section className={cn(panelClass, "overflow-hidden")}><div className="flex flex-col gap-3 border-b border-[#e1dacc] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-[#38372f]"><div><p className="text-xs font-medium uppercase tracking-[0.12em] text-[#777064] dark:text-[#aaa397]">Organization members</p><h2 className="mt-1 text-lg font-semibold">People and organization roles</h2><p className="mt-1 text-xs text-[#777064] dark:text-[#aaa397]">Organization roles control admin access. Workspace access is assigned separately.</p></div><Button className="h-9 rounded-lg bg-[#2456e8] text-white hover:bg-[#1d48c7] dark:bg-[#7895ff] dark:text-[#0e142c]" onClick={() => setMemberOpen(true)}><PlusIcon /> Add member</Button></div><MemberList users={users} loading={loading} saving={saving} currentUserId={user.id} onRoleChange={changeOrganizationRole} /></section></TabsContent>
    <TabsContent value="workspaces"><div className="grid items-start gap-5 xl:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.5fr)]"><section className={cn(panelClass, "overflow-hidden")}><div className="flex items-center justify-between border-b border-[#e1dacc] px-4 py-3 dark:border-[#38372f]"><div><p className="text-sm font-semibold">Workspaces</p><p className="mt-0.5 text-xs text-[#777064] dark:text-[#aaa397]">Each workspace has its own member roles.</p></div><Button size="icon-sm" variant="ghost" onClick={() => setWorkspaceOpen(true)} aria-label="Create workspace"><PlusIcon /></Button></div>{loading ? <div className="grid gap-2 p-3">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-16 rounded-xl" />)}</div> : workspaces.length ? <div className="grid gap-1.5 p-2.5">{workspaces.map((workspace) => <button key={workspace.id} type="button" onClick={() => setSelectedWorkspaceId(workspace.id)} className={cn("rounded-xl border p-3 text-left transition-colors", selectedWorkspace?.id === workspace.id ? "border-[#2456e8]/40 bg-[#edf2ff]/70 dark:border-[#7895ff]/45 dark:bg-[#7895ff]/10" : "border-transparent hover:border-[#d8d0c2] hover:bg-[#f8f4eb] dark:hover:border-[#49483f] dark:hover:bg-white/5")}><span className="flex items-center justify-between gap-2"><strong className="truncate text-sm">{workspace.name}</strong>{workspace.is_default && <Badge variant="outline" className="h-5 px-1.5 text-[9px]">DEFAULT</Badge>}</span><span className="mt-1 block truncate text-xs text-[#777064] dark:text-[#aaa397]">{workspace.description || workspace.slug}</span></button>)}</div> : <Empty icon={FolderKanbanIcon} title="No workspaces yet" detail="Create a workspace, then assign its admins and members." />}</section><WorkspaceInspector workspace={selectedWorkspace} users={users} memberships={memberships} loading={membershipsLoading} saving={saving} onRoleChange={changeMembership} /></div></TabsContent>
  </Tabs>
  <MemberDialog open={memberOpen} onOpenChange={setMemberOpen} saving={saving} onSubmit={addMember} />
  <WorkspaceDialog open={workspaceOpen} onOpenChange={setWorkspaceOpen} saving={saving} onSubmit={addWorkspace} />
  </div></main>;
}

function Overview({ user, workspaceCount, memberCount, loading, onMembers, onWorkspaces }: { user: AuthUser; workspaceCount: number; memberCount: number; loading: boolean; onMembers: () => void; onWorkspaces: () => void }) {
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]"><section className={cn(panelClass, "p-5 sm:p-6")}><p className="text-xs font-medium uppercase tracking-[0.12em] text-[#777064] dark:text-[#aaa397]">Organization scope</p><h2 className="mt-1 text-xl font-semibold tracking-tight">A shared control plane for your workspaces</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#625d53] dark:text-[#c5bcaf]">Members belong to the organization first. Workspace roles then grant the least access each person needs. Providers and models are shared across every workspace.</p><div className="mt-5 flex flex-wrap gap-2"><Button variant="outline" className="rounded-lg" onClick={onMembers}><UsersRoundIcon /> Manage members</Button><Button variant="outline" className="rounded-lg" onClick={onWorkspaces}><FolderKanbanIcon /> Manage workspaces</Button></div></section><aside className={cn(panelClass, "p-5")}><p className="text-sm font-semibold">Current context</p><dl className="mt-4 grid gap-3 text-sm"><Summary label="Organization ID" value={user.organization_id} /><Summary label="Your role" value="Organization admin" /><Summary label="Members" value={loading ? "Loading…" : String(memberCount)} /><Summary label="Workspaces" value={loading ? "Loading…" : String(workspaceCount)} /></dl></aside></div>;
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3"><dt className="text-[#777064] dark:text-[#aaa397]">{label}</dt><dd className="max-w-[65%] truncate font-medium" title={value}>{value}</dd></div>; }

function MemberList({ users, loading, saving, currentUserId, onRoleChange }: { users: AuthUser[]; loading: boolean; saving: boolean; currentUserId: string; onRoleChange: (member: AuthUser, role: AuthUser["org_role"]) => void }) {
  if (loading) return <div className="grid gap-2 p-4">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-14 rounded-xl" />)}</div>;
  if (!users.length) return <Empty icon={UsersRoundIcon} title="No members returned" detail="Try refreshing the page, or add the first organization member." />;
  return <div className="divide-y divide-[#e9e2d6] dark:divide-[#38372f]">{users.map((member) => {
    const isCurrentUser = member.id === currentUserId;
    return <article key={member.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5"><Avatar className="size-9 shrink-0"><AvatarFallback className="bg-[#f4efe5] text-xs font-semibold text-[#2456e8] dark:bg-white/6 dark:text-[#9aafff]">{initials(member.display_name || member.email)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{member.display_name || member.email} {isCurrentUser && <span className="font-normal text-[#777064] dark:text-[#aaa397]">(you)</span>}</p><p className="mt-0.5 truncate text-xs text-[#777064] dark:text-[#aaa397]">{member.email}</p></div>{isCurrentUser ? <Badge variant="outline" className="h-7 w-fit shrink-0 rounded-full border-[#b7c6ff] bg-[#eef3ff] px-2.5 text-[10px] text-[#1237b4] dark:border-[#7895ff]/30 dark:bg-[#7895ff]/12 dark:text-[#bcc9ff]">Org admin</Badge> : <select aria-label={`Organization role for ${member.email}`} value={member.org_role} onChange={(event) => onRoleChange(member, event.target.value as AuthUser["org_role"])} disabled={saving} className={cn(inputClass, "w-full rounded-lg px-2 text-xs sm:w-48")}><option value="org_member">Organization member</option><option value="org_admin">Organization admin</option></select>}</article>;
  })}</div>;
}

function WorkspaceInspector({ workspace, users, memberships, loading, saving, onRoleChange }: { workspace: Workspace | null; users: AuthUser[]; memberships: WorkspaceMembership[]; loading: boolean; saving: boolean; onRoleChange: (member: AuthUser, value: string) => void }) {
  if (!workspace) return <section className={cn(panelClass, "overflow-hidden")}><Empty icon={FolderKanbanIcon} title="Select a workspace" detail="Select one to review and configure member access." /></section>;
  const roles = new Map(memberships.map((membership) => [membership.user_id, membership.role]));
  return <section className={cn(panelClass, "overflow-hidden")} aria-labelledby="workspace-members-title"><div className="border-b border-[#e1dacc] p-4 sm:p-5 dark:border-[#38372f]"><p className="text-xs font-medium uppercase tracking-[0.12em] text-[#777064] dark:text-[#aaa397]">Workspace access</p><h2 id="workspace-members-title" className="mt-1 text-lg font-semibold">{workspace.name}</h2><p className="mt-1 text-xs text-[#777064] dark:text-[#aaa397]">Organization admins choose a workspace role per member.</p></div>{loading ? <div className="grid gap-2 p-4">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-14 rounded-xl" />)}</div> : <div className="divide-y divide-[#e9e2d6] dark:divide-[#38372f]">{users.map((member) => <div key={member.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="min-w-0"><p className="truncate text-sm font-medium">{member.display_name || member.email}</p><p className="truncate text-xs text-[#777064] dark:text-[#aaa397]">{member.email}</p></div><select aria-label={`Workspace role for ${member.email}`} value={roles.get(member.id) ?? "none"} onChange={(event) => onRoleChange(member, event.target.value)} disabled={saving} className={cn(inputClass, "w-full rounded-lg px-2 text-xs sm:w-48")}><option value="none">No access</option><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="workspace_admin">Workspace admin</option></select></div>)}</div>}</section>;
}

function Empty({ icon: Icon, title, detail }: { icon: typeof FolderKanbanIcon; title: string; detail: string }) { return <div className="grid min-h-44 place-items-center p-5 text-center"><div><Icon className="mx-auto size-5 text-[#8a8377]" /><p className="mt-2 text-sm font-medium">{title}</p><p className="mt-1 text-xs text-[#777064] dark:text-[#aaa397]">{detail}</p></div></div>; }

function MemberDialog({ open, onOpenChange, saving, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) { return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg border-[#d8d0c2] bg-[#fffdf8] dark:border-[#38372f] dark:bg-[#1a1a17]"><form className="grid gap-4" onSubmit={onSubmit}><DialogHeader><DialogTitle>Add organization member</DialogTitle><DialogDescription>Create an active user with a temporary password. Workspace access is assigned separately.</DialogDescription></DialogHeader><div className="grid gap-3"><FormField id="member-name" label="Name" placeholder="e.g. Linh Nguyen" /><FormField id="member-email" label="Work email" type="email" placeholder="linh@company.com" /><FormField id="member-password" label="Temporary password" type="password" minLength={8} /><label className="grid gap-1.5"><Label htmlFor="member-role">Organization role</Label><select id="member-role" name="member-role" defaultValue="org_member" className={cn(inputClass, "rounded-lg px-3 text-sm")}><option value="org_member">Member</option><option value="org_admin">Organization admin</option></select></label></div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <LoaderCircleIcon className="animate-spin" />}Add member</Button></DialogFooter></form></DialogContent></Dialog>; }

function WorkspaceDialog({ open, onOpenChange, saving, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) { return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg border-[#d8d0c2] bg-[#fffdf8] dark:border-[#38372f] dark:bg-[#1a1a17]"><form className="grid gap-4" onSubmit={onSubmit}><DialogHeader><DialogTitle>Create workspace</DialogTitle><DialogDescription>Create a scoped place for a team or investigation, then assign its members.</DialogDescription></DialogHeader><div className="grid gap-3"><FormField id="workspace-name" label="Workspace name" placeholder="e.g. Research" /><FormField id="workspace-slug" label="Workspace slug" placeholder="e.g. research" required={false} /><div className="grid gap-1.5"><Label htmlFor="workspace-description">Description</Label><Textarea id="workspace-description" name="workspace-description" placeholder="What belongs in this workspace?" className="border-[#d8d0c2]/80 bg-[#f7f3eb] shadow-none dark:border-[#49483f] dark:bg-[#20201c]" /></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <LoaderCircleIcon className="animate-spin" />}Create workspace</Button></DialogFooter></form></DialogContent></Dialog>; }

function FormField({ id, label, type = "text", placeholder, minLength, required = true }: { id: string; label: string; type?: string; placeholder?: string; minLength?: number; required?: boolean }) { return <div className="grid gap-1.5"><Label htmlFor={id}>{label}</Label><Input id={id} name={id} type={type} placeholder={placeholder} minLength={minLength} required={required} className={inputClass} /></div>; }
