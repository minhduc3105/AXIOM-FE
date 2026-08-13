export type ScopeIdentity = {
  id: string | null;
  name: string;
};

export type AppScopeContext = {
  organization: ScopeIdentity;
  workspace: ScopeIdentity | null;
};
