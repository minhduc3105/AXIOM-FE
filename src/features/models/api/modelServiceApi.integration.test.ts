import { describe, expect, it } from "vitest";
import { normalizeProvider } from "./modelServiceMappers";

const baseUrl = import.meta.env.VITE_MODEL_SERVICE_E2E_URL?.replace(/\/$/, "");
const liveIt = baseUrl ? it : it.skip;

describe("Model Service live contract", () => {
  liveIt("loads the deployed provider registry and adapts it to the UI contract", async () => {
    const response = await fetch(`${baseUrl}/api/v2/providers`, {
      headers: {
        "X-Consumer-Service": "axiom-fe-e2e",
        "X-User-ID": "axiom-fe-e2e",
        "X-Org-ID": "test-org",
        "X-Org-Role": "org_admin",
      },
    });
    expect(response.ok).toBe(true);
    const providers: unknown[] = await response.json();
    expect(Array.isArray(providers)).toBe(true);
    for (const provider of providers) {
      const normalized = normalizeProvider(provider, "test-org");
      expect(normalized.resource_id).toBeTruthy();
      expect(normalized.scope).toMatch(/^(system|organization)$/);
      expect(normalized.connection_status).toBeTruthy();
      expect(normalized.credential_source).toMatch(/^(database|environment|none)$/);
    }
  });
});
