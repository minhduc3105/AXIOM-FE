import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Building2Icon,
  CircleAlertIcon,
  FolderKanbanIcon,
  LoaderCircleIcon,
  PlusIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  UserRoundPlusIcon,
  UsersRoundIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  createOrganizationUser,
  listOrganizationUsers,
} from '@/features/auth/api/authApi'
import {
  createWorkspace,
  deleteWorkspaceMembership,
  listWorkspaceMemberships,
  listWorkspaces,
  type Workspace,
  type WorkspaceMembership,
  type WorkspaceRole,
  upsertWorkspaceMembership,
} from '@/features/auth/api/authzApi'
import { useAuth } from '@/features/auth/model/AuthProvider'
import type { AuthUser } from '@/features/auth/model/types'
import { cn } from '@/shared/lib/utils'

const panelClass = 'rounded-[22px] border border-[#d8d0c2]/80 bg-[#fffdf8]/88 shadow-[0_16px_46px_rgba(24,24,18,0.055)] backdrop-blur-xl dark:border-[#38372f]/80 dark:bg-[#1a1a17]/88'
const inputClass = 'h-10 border-[#d8d0c2]/80 bg-[#f7f3eb] shadow-none dark:border-[#49483f] dark:bg-[#20201c]'

function roleLabel(role: AuthUser['org_role']) {
  return role === 'org_admin' ? 'Org Admin' : 'Org Member'
}

function workspaceRoleLabel(role: WorkspaceRole) {
  if (role === 'workspace_admin') return 'Workspace Admin'
  return role === 'editor' ? 'Editor' : 'Viewer'
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function OrganizationUsersPage() {
  const { accessToken, user } = useAuth()
  const organizationId = user?.organization_id ?? ''
  const canManage = user?.org_role === 'org_admin'
  const [view, setView] = useState<'members' | 'workspaces'>('members')
  const [users, setUsers] = useState<AuthUser[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const [memberships, setMemberships] = useState<WorkspaceMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<AuthUser['org_role']>('org_member')
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceSlug, setWorkspaceSlug] = useState('')
  const [workspaceDescription, setWorkspaceDescription] = useState('')

  const selectedWorkspace = workspaces.find((item) => item.id === selectedWorkspaceId) ?? null
  const membershipByUser = useMemo(
    () => new Map(memberships.map((membership) => [membership.user_id, membership.role])),
    [memberships],
  )

  const loadUsers = useCallback(async () => {
    if (!accessToken || !organizationId || !canManage) return
    setLoading(true)
    setError(null)
    try {
      setUsers(await listOrganizationUsers(organizationId, accessToken))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load organization users.')
    } finally {
      setLoading(false)
    }
  }, [accessToken, canManage, organizationId])

  const loadWorkspaces = useCallback(async () => {
    if (!accessToken || !organizationId || !canManage) return
    setWorkspaceLoading(true)
    setError(null)
    try {
      const next = await listWorkspaces(organizationId, accessToken)
      setWorkspaces(next)
      setSelectedWorkspaceId((current) => current && next.some((item) => item.id === current) ? current : next[0]?.id ?? null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load workspaces.')
    } finally {
      setWorkspaceLoading(false)
    }
  }, [accessToken, canManage, organizationId])

  const loadMemberships = useCallback(async () => {
    if (!accessToken || !organizationId || !selectedWorkspaceId || !canManage) {
      setMemberships([])
      return
    }
    setWorkspaceLoading(true)
    try {
      setMemberships(await listWorkspaceMemberships(organizationId, selectedWorkspaceId, accessToken))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load workspace members.')
    } finally {
      setWorkspaceLoading(false)
    }
  }, [accessToken, canManage, organizationId, selectedWorkspaceId])

  useEffect(() => { void loadUsers(); void loadWorkspaces() }, [loadUsers, loadWorkspaces])
  useEffect(() => { void loadMemberships() }, [loadMemberships])

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken || !organizationId) return
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const created = await createOrganizationUser(organizationId, { displayName: displayName.trim(), email: email.trim(), password, orgRole: role }, accessToken)
      setUsers((current) => [...current, created].sort((left, right) => left.email.localeCompare(right.email)))
      setDisplayName(''); setEmail(''); setPassword(''); setConfirmPassword(''); setRole('org_member')
      toast.success(`${created.display_name || created.email} was added to the organization.`)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create organization user.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessToken || !organizationId) return
    setSaving(true)
    setError(null)
    try {
      const created = await createWorkspace(organizationId, accessToken, { name: workspaceName.trim(), slug: workspaceSlug.trim() || slugify(workspaceName), description: workspaceDescription.trim() || null })
      setWorkspaces((current) => [...current, created])
      setSelectedWorkspaceId(created.id)
      setWorkspaceName(''); setWorkspaceSlug(''); setWorkspaceDescription('')
      toast.success(`${created.name} workspace was created.`)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create workspace.')
    } finally {
      setSaving(false)
    }
  }

  async function handleMembershipChange(userId: string, value: string) {
    if (!accessToken || !organizationId || !selectedWorkspaceId) return
    setSaving(true)
    setError(null)
    try {
      if (value === 'none') {
        await deleteWorkspaceMembership(organizationId, selectedWorkspaceId, userId, accessToken)
        setMemberships((current) => current.filter((membership) => membership.user_id !== userId))
      } else {
        const membership = await upsertWorkspaceMembership(organizationId, selectedWorkspaceId, accessToken, { user_id: userId, role: value as WorkspaceRole })
        setMemberships((current) => [...current.filter((item) => item.user_id !== userId), membership])
      }
      toast.success('Workspace access updated.')
    } catch (membershipError) {
      setError(membershipError instanceof Error ? membershipError.message : 'Unable to update workspace access.')
    } finally {
      setSaving(false)
    }
  }

  if (!canManage) {
    return <section className="min-h-screen px-5 pb-12 pt-20 sm:px-8 md:pt-10"><div className="mx-auto grid w-full max-w-[720px] gap-5"><Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100"><CircleAlertIcon /><AlertTitle>Org Admin access required</AlertTitle><AlertDescription>Only an Org Admin can manage organization members and workspaces.</AlertDescription></Alert></div></section>
  }

  return (
    <section className="min-h-screen px-5 pb-12 pt-20 sm:px-8 md:pt-10" aria-label="Organization management">
      <div className="mx-auto grid w-full max-w-[1280px] gap-6">
        <header className={cn(panelClass, 'flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between')}>
          <div className="flex min-w-0 items-start gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#edf2ff] text-[#2456e8] dark:bg-[#7895ff]/12 dark:text-[#9aafff]"><Building2Icon className="size-5" /></div><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-[0.12em] text-[#777064] dark:text-[#aaa397]">Organization settings</p><h1 className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-3xl">Members and workspaces</h1><p className="mt-1.5 text-sm leading-6 text-[#625d53] dark:text-[#c5bcaf]">Control who belongs to the organization and what each member can access.</p></div></div>
          <div className="flex items-center gap-2"><Badge variant="outline" className="h-8 rounded-full border-[#d8d0c2] bg-[#fffdf8]/70 px-3 text-xs text-[#625d53] dark:border-[#49483f] dark:bg-white/5 dark:text-[#c5bcaf]"><UsersRoundIcon className="size-3.5" /> {users.length} members</Badge><Badge variant="outline" className="h-8 rounded-full border-[#d8d0c2] bg-[#fffdf8]/70 px-3 text-xs text-[#625d53] dark:border-[#49483f] dark:bg-white/5 dark:text-[#c5bcaf]"><FolderKanbanIcon className="size-3.5" /> {workspaces.length} workspaces</Badge><Button variant="outline" size="icon-sm" className="rounded-lg border-[#d8d0c2] dark:border-[#49483f]" onClick={() => { void loadUsers(); void loadWorkspaces() }} disabled={loading || workspaceLoading} aria-label="Refresh organization"><RefreshCwIcon className={loading || workspaceLoading ? 'animate-spin' : ''} /></Button></div>
        </header>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-200">{error}</div>}

        <Tabs value={view} onValueChange={(value) => setView(value as 'members' | 'workspaces')} className="gap-4">
          <TabsList className="h-10 w-fit rounded-full border border-[#d8d0c2] bg-[#f4efe5]/70 p-1 dark:border-[#49483f] dark:bg-white/5" aria-label="Organization management views">
            <TabsTrigger value="members" className="rounded-full px-4 text-xs"><UsersRoundIcon /> Members</TabsTrigger>
            <TabsTrigger value="workspaces" className="rounded-full px-4 text-xs"><FolderKanbanIcon /> Workspaces</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="m-0">
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <section className={cn(panelClass, 'overflow-hidden')} aria-labelledby="organization-members-title">
                <div className="flex items-center justify-between gap-3 border-b border-[#e1dacc] p-4 sm:p-5 dark:border-[#38372f]"><div><h2 id="organization-members-title" className="text-base font-semibold">Organization members</h2><p className="mt-1 text-xs text-[#777064] dark:text-[#aaa397]">Accounts that can access organization-scoped AXIOM resources.</p></div><ShieldCheckIcon className="size-5 text-[#2456e8] dark:text-[#9aafff]" /></div>
                {loading ? <div className="grid gap-2 p-5">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)}</div> : users.length ? <div className="divide-y divide-[#e9e2d6] dark:divide-[#38372f]">{users.map((member) => <article key={member.id} className="flex min-w-0 items-center gap-3 px-4 py-4 sm:px-5"><div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f4efe5] text-xs font-semibold text-[#2456e8] dark:bg-white/5 dark:text-[#9aafff]">{member.display_name.slice(0, 1).toUpperCase() || member.email.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{member.display_name || member.email}</p><p className="mt-0.5 truncate text-xs text-[#777064] dark:text-[#aaa397]">{member.email}</p></div><Badge variant="outline" className={cn('shrink-0 text-[10px]', member.org_role === 'org_admin' && 'border-[#b7c6ff] bg-[#eef3ff] text-[#1237b4] dark:border-[#7895ff]/30 dark:bg-[#7895ff]/12 dark:text-[#bcc9ff]')}>{roleLabel(member.org_role)}</Badge></article>)}</div> : <div className="grid min-h-48 place-items-center p-5 text-center"><div><UsersRoundIcon className="mx-auto size-5 text-[#8a8377]" /><p className="mt-2 text-sm font-medium">No organization users yet</p><p className="mt-1 text-xs text-[#777064] dark:text-[#aaa397]">Create the first member from the form.</p></div></div>}
              </section>
              <section className={cn(panelClass, 'p-4 sm:p-5 xl:sticky xl:top-6')} aria-labelledby="create-organization-user-title"><div className="flex items-start gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf2ff] text-[#2456e8] dark:bg-[#7895ff]/12 dark:text-[#9aafff]"><UserRoundPlusIcon className="size-4" /></div><div><h2 id="create-organization-user-title" className="text-base font-semibold">Create organization user</h2><p className="mt-1 text-xs leading-5 text-[#777064] dark:text-[#aaa397]">Assign the organization role before sharing credentials.</p></div></div><form className="mt-5 grid gap-4" onSubmit={handleCreateUser}><div className="grid gap-1.5"><Label htmlFor="org-user-name">Full name</Label><Input id="org-user-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" required placeholder="e.g. Linh Nguyen" className={inputClass} /></div><div className="grid gap-1.5"><Label htmlFor="org-user-email">Account email</Label><Input id="org-user-email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required type="email" placeholder="linh@company.com" className={inputClass} /></div><div className="grid gap-1.5"><Label htmlFor="org-user-role">Organization role</Label><select id="org-user-role" value={role} onChange={(event) => setRole(event.target.value as AuthUser['org_role'])} className={cn(inputClass, 'rounded-md px-3 text-sm')}><option value="org_member">Org Member — assigned workspace access</option><option value="org_admin">Org Admin — manages members and access</option></select></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1"><div className="grid gap-1.5"><Label htmlFor="org-user-password">Password</Label><Input id="org-user-password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required type="password" className={inputClass} /></div><div className="grid gap-1.5"><Label htmlFor="org-user-confirm-password">Confirm password</Label><Input id="org-user-confirm-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required type="password" className={inputClass} /></div></div><Button type="submit" disabled={saving} className="h-10 rounded-lg bg-[#2456e8] text-white hover:bg-[#1d48c7] dark:bg-[#7895ff] dark:text-[#0e142c]"><UserRoundPlusIcon />{saving ? 'Creating account...' : 'Create user account'}</Button></form></section>
            </div>
          </TabsContent>

          <TabsContent value="workspaces" className="m-0">
            <div className="grid items-start gap-6 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
              <section className={cn(panelClass, 'overflow-hidden')} aria-labelledby="workspace-list-title"><div className="flex items-center justify-between border-b border-[#e1dacc] p-4 dark:border-[#38372f]"><div><h2 id="workspace-list-title" className="text-sm font-semibold">Workspaces</h2><p className="mt-1 text-xs text-[#777064] dark:text-[#aaa397]">Select a workspace to manage access.</p></div><FolderKanbanIcon className="size-4 text-[#2456e8] dark:text-[#9aafff]" /></div><div className="grid gap-2 p-3">{workspaceLoading && !workspaces.length ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />) : workspaces.length ? workspaces.map((workspace) => <button key={workspace.id} type="button" onClick={() => setSelectedWorkspaceId(workspace.id)} className={cn('rounded-xl border p-3 text-left transition-colors', selectedWorkspaceId === workspace.id ? 'border-[#2456e8]/45 bg-[#edf2ff]/55 dark:border-[#7895ff]/45 dark:bg-[#7895ff]/8' : 'border-[#e1dacc] hover:border-[#2456e8]/30 dark:border-[#38372f]')}><span className="block truncate text-sm font-semibold">{workspace.name}</span><span className="mt-1 block truncate text-xs text-[#777064] dark:text-[#aaa397]">{workspace.slug}{workspace.is_default ? ' · Default' : ''}</span></button>) : <div className="px-3 py-8 text-center text-xs text-[#777064] dark:text-[#aaa397]">No workspaces yet.</div>}</div></section>

              <section className={cn(panelClass, 'overflow-hidden')} aria-labelledby="workspace-access-title"><div className="flex items-start justify-between gap-3 border-b border-[#e1dacc] p-4 sm:p-5 dark:border-[#38372f]"><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-[0.12em] text-[#777064] dark:text-[#aaa397]">Workspace access</p><h2 id="workspace-access-title" className="mt-1 truncate text-base font-semibold">{selectedWorkspace?.name ?? 'Select a workspace'}</h2><p className="mt-1 text-xs text-[#777064] dark:text-[#aaa397]">Choose a workspace role for every organization member.</p></div><Badge variant="outline" className="shrink-0 text-[10px]">{memberships.length} assigned</Badge></div>{selectedWorkspace ? <div className="divide-y divide-[#e9e2d6] dark:divide-[#38372f]">{users.map((member) => <div key={member.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="min-w-0"><p className="truncate text-sm font-medium">{member.display_name || member.email}</p><p className="truncate text-xs text-[#777064] dark:text-[#aaa397]">{member.email}</p></div><select aria-label={`Workspace role for ${member.email}`} value={membershipByUser.get(member.id) ?? 'none'} onChange={(event) => void handleMembershipChange(member.id, event.target.value)} disabled={saving} className={cn(inputClass, 'h-9 w-full rounded-lg px-2 text-xs sm:w-48')}><option value="none">No access</option><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="workspace_admin">Workspace Admin</option></select></div>)}</div> : <div className="grid min-h-64 place-items-center p-5 text-center"><FolderKanbanIcon className="mx-auto size-5 text-[#8a8377]" /><p className="mt-2 text-sm font-medium">Select a workspace</p></div>}</section>

              <section className={cn(panelClass, 'p-4 sm:p-5 xl:sticky xl:top-6')} aria-labelledby="create-workspace-title"><div className="flex items-start gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf2ff] text-[#2456e8] dark:bg-[#7895ff]/12 dark:text-[#9aafff]"><PlusIcon className="size-4" /></div><div><h2 id="create-workspace-title" className="text-base font-semibold">Create workspace</h2><p className="mt-1 text-xs leading-5 text-[#777064] dark:text-[#aaa397]">Add a focused area for a team or investigation.</p></div></div><form className="mt-5 grid gap-4" onSubmit={handleCreateWorkspace}><div className="grid gap-1.5"><Label htmlFor="workspace-name">Workspace name</Label><Input id="workspace-name" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} required placeholder="e.g. Research" className={inputClass} /></div><div className="grid gap-1.5"><Label htmlFor="workspace-slug">Workspace ID</Label><Input id="workspace-slug" value={workspaceSlug} onChange={(event) => setWorkspaceSlug(slugify(event.target.value))} placeholder="research" className={inputClass} /></div><div className="grid gap-1.5"><Label htmlFor="workspace-description">Description</Label><textarea id="workspace-description" value={workspaceDescription} onChange={(event) => setWorkspaceDescription(event.target.value)} placeholder="What belongs in this workspace?" className={cn(inputClass, 'min-h-24 resize-y rounded-md px-3 py-2 text-sm')} /></div><Button type="submit" disabled={saving} className="h-10 rounded-lg bg-[#2456e8] text-white hover:bg-[#1d48c7] dark:bg-[#7895ff] dark:text-[#0e142c]"><PlusIcon />{saving ? 'Creating workspace...' : 'Create workspace'}</Button></form></section>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
