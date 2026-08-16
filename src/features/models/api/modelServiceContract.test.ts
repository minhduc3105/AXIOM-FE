import { describe, expect, it } from "vitest";
import { MODEL_SERVICE_API_VERSION, modelServiceRoutes } from "./modelServiceContract";

describe("Model Service v1 routes", () => {
  it("keeps every published endpoint under one v1 prefix", () => {
    const routes = [
      modelServiceRoutes.healthReady,
      modelServiceRoutes.providerCatalog,
      modelServiceRoutes.providers,
      modelServiceRoutes.provider("provider/id"),
      modelServiceRoutes.providerCredential("provider/id"),
      modelServiceRoutes.providerTest("provider/id"),
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
    ];

    expect(MODEL_SERVICE_API_VERSION).toBe("/api/v1");
    expect(routes.every((route) => route.startsWith("/api/v1/"))).toBe(true);
    expect(routes.some((route) => route.includes("/api/v2"))).toBe(false);
  });

  it("encodes all dynamic identifiers", () => {
    expect(modelServiceRoutes.provider("provider/id")).toBe(
      "/api/v1/providers/provider%2Fid",
    );
    expect(modelServiceRoutes.providerCredential("provider/id")).toBe(
      "/api/v1/providers/provider%2Fid/credential",
    );
    expect(modelServiceRoutes.modelTest("model/id")).toBe(
      "/api/v1/models/model%2Fid:test",
    );
  });
});
