import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  configureAuthFetch,
  type AuthRefreshResult,
} from "@/features/auth/model/authFetch";
import {
  downloadSkillArchive,
  getSkill,
  getSkillRegistryErrorKind,
  listUserSkills,
  SkillRegistryError,
  updateSkillEnabled,
} from "./skillRegistryApi";
import type { UserSkillSummary } from "../model/types";

const skill: UserSkillSummary = {
  id: "docx-en",
  name: "docx",
  language: "en",
  enabled: true,
  user_enabled: false,
  version: "1.0.0",
  path: "skills/global/docx-en/versions/1.0.0/archive.zip",
  entry: "SKILL.md",
  description: "Read and write documents.",
  metadata: {},
};

describe("Skill Registry API", () => {
  beforeEach(() => {
    configureAuthFetch({
      getAccessToken: () => "token",
      refreshAccessToken: async (): Promise<AuthRefreshResult> => "refreshed",
      onUnauthorized: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    configureAuthFetch({
      getAccessToken: () => null,
      refreshAccessToken: async (): Promise<AuthRefreshResult> => "expired",
      onUnauthorized: vi.fn(),
    });
  });

  it("lists skills with workspace and language query parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json([skill]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      listUserSkills(
        { workspaceId: "workspace-1", language: "vi" },
        new AbortController().signal,
      ),
    ).resolves.toEqual([skill]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "/skill-registry/me/skills?workspace_id=workspace-1&language=vi",
    );
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer token");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("omits an empty workspace query", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json([]));
    vi.stubGlobal("fetch", fetchMock);

    await listUserSkills(
      { workspaceId: "", language: "" },
      new AbortController().signal,
    );

    expect(fetchMock.mock.calls[0][0]).toBe("/skill-registry/me/skills");
  });

  it("updates one immutable skill preference with the exact JSON body", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ skill_id: "docx-en", enabled: true, changed: true }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      updateSkillEnabled("docx-en", "workspace-1", true),
    ).resolves.toEqual({
      skill_id: "docx-en",
      enabled: true,
      changed: true,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "/skill-registry/me/skills/docx-en?workspace_id=workspace-1",
    );
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ enabled: true });
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer token");
  });

  it("uses the immutable id for detail requests", async () => {
    const detail = {
      ...skill,
      user_enabled: true,
      body: "# Document skill",
      files: ["SKILL.md"],
    };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(detail));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getSkill("docx/en", "workspace-1", new AbortController().signal),
    ).resolves.toEqual(detail);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/skill-registry/skills/docx%2Fen?workspace_id=workspace-1",
    );
  });

  it("returns archive blob metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("zip-bytes", {
        headers: {
          "Content-Disposition": 'attachment; filename="docx-en-1.0.0.zip"',
          "X-Skill-Sha256": "a".repeat(64),
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await downloadSkillArchive(
      "docx-en",
      "workspace-1",
      new AbortController().signal,
    );
    expect(result.fileName).toBe("docx-en-1.0.0.zip");
    expect(result.sha256).toBe("a".repeat(64));
    // Response.blob() can come from a different runtime realm in CI's JSDOM setup.
    expect(Object.prototype.toString.call(result.blob)).toBe("[object Blob]");
    expect(result.blob.type).toBe("text/plain;charset=utf-8");
    expect(result.blob.size).toBe(9);
  });

  it("classifies missing detail and registry outage separately", async () => {
    const missing = new SkillRegistryError("missing", 404, "detail");
    const unavailable = new SkillRegistryError("down", 503, "catalog");
    expect(getSkillRegistryErrorKind(missing)).toBe("skill_not_found");
    expect(getSkillRegistryErrorKind(unavailable)).toBe(
      "skill_registry_unavailable",
    );
  });

  it("classifies workspace authorization failures", async () => {
    const forbidden = new SkillRegistryError("denied", 403, "catalog");
    expect(getSkillRegistryErrorKind(forbidden)).toBe("workspace_forbidden");
  });
});
