import { describe, expect, it } from "vitest";
import { MODEL_SERVICE_API_VERSION, modelServiceRoutes } from "./modelServiceContract";

describe("Model Service v2 routes", () => {
  it("keeps every published endpoint under one v2 prefix", () => {
    const routes = [
      modelServiceRoutes.healthReady,
      modelServiceRoutes.providers,
      modelServiceRoutes.provider("provider/id"),
      modelServiceRoutes.providerCredential("provider/id"),
      modelServiceRoutes.providerTest("provider/id"),
      modelServiceRoutes.providerDiscoverModels("provider/id"),
      modelServiceRoutes.providerModels("provider/id"),
      modelServiceRoutes.model("model/id"),
      modelServiceRoutes.modelTest("model/id"),
      modelServiceRoutes.inferenceResponses,
      modelServiceRoutes.inferenceVisionResponses,
      modelServiceRoutes.inferenceEmbeddings,
      modelServiceRoutes.inferenceReranks,
      modelServiceRoutes.inferenceRequest("request/id"),
      modelServiceRoutes.inferenceAttempts("request/id"),
      modelServiceRoutes.auditOutbox,
      modelServiceRoutes.modelTasks,
      modelServiceRoutes.taskAssignments,
    ];

    expect(MODEL_SERVICE_API_VERSION).toBe("/api/v2");
    expect(routes.every((route) => route.startsWith("/api/v2/"))).toBe(true);
    expect(routes.some((route) => route.includes("/api/v1"))).toBe(false);
  });

  it("encodes all dynamic identifiers", () => {
    expect(modelServiceRoutes.provider("provider/id")).toBe(
      "/api/v2/providers/provider%2Fid",
    );
    expect(modelServiceRoutes.providerCredential("provider/id")).toBe(
      "/api/v2/providers/provider%2Fid/credential",
    );
    expect(modelServiceRoutes.modelTest("model/id")).toBe(
      "/api/v2/models/model%2Fid:test",
    );
  });

  it("publishes the task routing endpoints beside the registry endpoints", () => {
    expect(modelServiceRoutes.modelTasks).toBe("/api/v2/model-tasks");
    expect(modelServiceRoutes.taskAssignments).toBe("/api/v2/task-assignments");
  });
});
