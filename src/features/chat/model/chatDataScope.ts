export type ChatDataResourceKind = "database" | "file" | "connector";
export type ChatDataResourceStatus = "ready" | "syncing" | "unavailable";

export type ChatDataResourceReference = {
  resourceId: string;
  filename: string;
  objectKey: string;
  bucket: string;
  contentType?: string;
  status: ChatDataResourceStatus;
};

export type ChatDataResource = {
  id: string;
  name: string;
  kind: ChatDataResourceKind;
  source: string;
  detail: string;
  updatedAt: string;
  status: ChatDataResourceStatus;
  resourceRef?: ChatDataResourceReference;
};

export type ChatDataScope =
  | {
      mode: "all";
      resourceIds: [];
      resourceNames: [];
    }
  | {
      mode: "none";
      resourceIds: [];
      resourceNames: [];
    }
  | {
      mode: "selected";
      resourceIds: string[];
      resourceNames: string[];
      resourceRefs?: ChatDataResourceReference[];
    };

export const allChatDataScope: ChatDataScope = {
  mode: "all",
  resourceIds: [],
  resourceNames: [],
};

export const noChatDataScope: ChatDataScope = {
  mode: "none",
  resourceIds: [],
  resourceNames: [],
};

export function isSelectableChatDataResource(resource: ChatDataResource) {
  return resource.status === "ready" || Boolean(resource.resourceRef);
}

export function createSelectedChatDataScope(
  resourceIds: string[],
  resources: ChatDataResource[],
): ChatDataScope {
  const selectableResourcesById = new Map(
    resources
      .filter(isSelectableChatDataResource)
      .map((resource) => [resource.id, resource]),
  );
  const uniqueIds = [...new Set(resourceIds)].filter((id) =>
    selectableResourcesById.has(id),
  );

  if (uniqueIds.length === 0) return allChatDataScope;

  const selectedResources = uniqueIds.flatMap((id) => {
    const resource = selectableResourcesById.get(id);
    return resource ? [resource] : [];
  });
  const resourceRefs = selectedResources.flatMap((resource) =>
    resource.resourceRef ? [resource.resourceRef] : [],
  );

  return {
    mode: "selected",
    resourceIds: uniqueIds,
    resourceNames: uniqueIds.map(
      (id) => selectableResourcesById.get(id)?.name ?? id,
    ),
    ...(resourceRefs.length ? { resourceRefs } : {}),
  };
}

export function createChatDataScopeFromExclusions(
  resources: ChatDataResource[],
  excludedResourceIds: Iterable<string>,
): ChatDataScope {
  const selectableResources = resources.filter(isSelectableChatDataResource);
  const excludedIds = new Set(excludedResourceIds);
  const selectedIds = selectableResources
    .filter((resource) => !excludedIds.has(resource.id))
    .map((resource) => resource.id);

  if (selectedIds.length === 0) return noChatDataScope;
  if (
    selectedIds.length === selectableResources.length &&
    selectableResources.every((resource) => resource.status === "ready")
  ) {
    return allChatDataScope;
  }
  return createSelectedChatDataScope(selectedIds, resources);
}

export function chatDataScopeLabel(scope: ChatDataScope) {
  if (scope.mode === "all") return "All workspace data";
  if (scope.mode === "none") return "No workspace files";
  if (scope.resourceNames.length === 1) return scope.resourceNames[0];
  return `${scope.resourceNames.length} selected sources`;
}
