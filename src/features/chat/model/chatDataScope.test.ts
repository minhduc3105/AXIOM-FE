import { describe, expect, it } from "vitest";
import {
  createChatDataScopeFromExclusions,
  createSelectedChatDataScope,
  type ChatDataResource,
} from "./chatDataScope";

const resources: ChatDataResource[] = [
  {
    id: "ready-file",
    name: "Ready file.pdf",
    kind: "file",
    source: "Workspace file",
    detail: "Indexed",
    updatedAt: "today",
    status: "ready",
  },
  {
    id: "processing-file",
    name: "Processing file.pdf",
    kind: "file",
    source: "Workspace file",
    detail: "Processing",
    updatedAt: "today",
    status: "syncing",
    resourceRef: {
      resourceId: "processing-file",
      filename: "Processing file.pdf",
      objectKey: "workspace/processing.pdf",
      bucket: "org-bucket",
      status: "syncing",
    },
  },
  {
    id: "failed-file",
    name: "Failed file.pdf",
    kind: "file",
    source: "Workspace file",
    detail: "Ingestion failed",
    updatedAt: "today",
    status: "unavailable",
    resourceRef: {
      resourceId: "failed-file",
      filename: "Failed file.pdf",
      objectKey: "workspace/failed.pdf",
      bucket: "org-bucket",
      status: "unavailable",
    },
  },
];

describe("chat data scope", () => {
  it("derives a scope from exclusions without depending on pagination", () => {
    const scope = createChatDataScopeFromExclusions(resources, [
      "ready-file",
      "stale-file",
    ]);

    expect(scope).toMatchObject({
      mode: "selected",
      resourceIds: ["processing-file", "failed-file"],
    });
  });

  it("selects new resources and preserves the all state when everything is ready", () => {
    const readyResources = [
      ...resources.filter((resource) => resource.status === "ready"),
      {
        ...resources[0],
        id: "new-ready-file",
        name: "New ready file.pdf",
      },
    ];

    expect(createChatDataScopeFromExclusions(readyResources, []).mode).toBe(
      "all",
    );
    expect(
      createChatDataScopeFromExclusions(readyResources, ["ready-file"]).mode,
    ).toBe("selected");
    expect(
      createChatDataScopeFromExclusions(
        readyResources,
        readyResources.map((resource) => resource.id),
      ),
    ).toMatchObject({ mode: "none", resourceIds: [] });
  });

  it("keeps processing and failed file refs in a selected scope", () => {
    const scope = createSelectedChatDataScope(
      ["processing-file", "failed-file"],
      resources,
    );

    expect(scope).toMatchObject({
      mode: "selected",
      resourceIds: ["processing-file", "failed-file"],
      resourceNames: ["Processing file.pdf", "Failed file.pdf"],
    });
    expect(scope.mode).toBe("selected");
    if (scope.mode !== "selected") throw new Error("expected selected scope");
    expect(scope.resourceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceId: "processing-file",
          status: "syncing",
        }),
        expect.objectContaining({
          resourceId: "failed-file",
          status: "unavailable",
        }),
      ]),
    );
  });
});
