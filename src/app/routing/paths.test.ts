import { describe, expect, it } from "vitest";
import {
  createChatRoute,
  createDataRoute,
  createReportsRoute,
  createMemoryRoute,
  createModelsRoute,
  createOrganizationRoute,
  createSettingsRoute,
  createToolDetailRoute,
  createToolsRoute,
  createSkillDetailRoute,
  createSkillsRoute,
  getAppRoutePath,
  parseAppRoute,
} from "./paths";

describe("data routing", () => {
  it("parses the data path", () => {
    expect(parseAppRoute("/data")).toEqual({
      surface: "data",
      page: "dashboard",
      sessionId: null,
    });
  });

  it.each(["/data/ingestion", "/data/ingestion?connector=s3", "/ingest"])(
    "treats obsolete ingestion path %s as the data dashboard",
    (path) => {
      const [pathname, search = ""] = path.split("?");
      expect(parseAppRoute(pathname, search ? `?${search}` : "")).toEqual(
        createDataRoute(),
      );
    },
  );

  it("creates a stable data URL", () => {
    expect(getAppRoutePath(createDataRoute())).toBe("/data");
  });
});

describe("report routing", () => {
  it("parses the reports path", () => {
    expect(parseAppRoute("/reports")).toEqual({
      surface: "reports",
      sessionId: null,
    });
  });

  it("creates a stable reports URL", () => {
    expect(getAppRoutePath(createReportsRoute())).toBe("/reports");
  });
});

describe("tools routing", () => {
  it("parses the tool catalog path", () => {
    expect(parseAppRoute("/tools")).toEqual({
      surface: "tools",
      page: "list",
      toolName: null,
      sessionId: null,
    });
  });

  it("parses and decodes a tool detail path", () => {
    expect(parseAppRoute("/tools/document_search_text")).toEqual({
      surface: "tools",
      page: "detail",
      toolName: "document_search_text",
      sessionId: null,
    });
  });

  it("creates stable tool URLs", () => {
    expect(getAppRoutePath(createToolsRoute())).toBe("/tools");
    expect(getAppRoutePath(createToolDetailRoute("text_normalize"))).toBe(
      "/tools/text_normalize",
    );
  });
});

describe("skills routing", () => {
  it("parses the skill catalog path", () => {
    expect(parseAppRoute("/skills")).toEqual(createSkillsRoute());
  });

  it("parses and decodes a skill detail path", () => {
    expect(parseAppRoute("/skills/report%2Fbuilder")).toEqual(
      createSkillDetailRoute("report/builder"),
    );
  });

  it("creates stable skill URLs", () => {
    expect(getAppRoutePath(createSkillsRoute())).toBe("/skills");
    expect(getAppRoutePath(createSkillDetailRoute("report/builder"))).toBe(
      "/skills/report%2Fbuilder",
    );
  });
});

describe("application routing", () => {
  it.each(["/", "/chat"])("opens %s as a blank chat composer", (path) => {
    expect(parseAppRoute(path)).toEqual({
      surface: "chat",
      page: "compose",
      sessionId: null,
    });
  });

  it("parses a chat conversation and keeps /chat as the composer URL", () => {
    expect(parseAppRoute("/chat/conversation-42")).toEqual({
      surface: "chat",
      page: "conversation",
      sessionId: "conversation-42",
    });
    expect(getAppRoutePath(createChatRoute())).toBe("/chat");
  });

  it("parses the models path as its own surface", () => {
    expect(parseAppRoute("/models")).toEqual({
      surface: "models",
      sessionId: null,
    });
    expect(getAppRoutePath(createModelsRoute())).toBe("/models");
  });

  it("parses the memory path", () => {
    expect(parseAppRoute("/memory")).toEqual({
      surface: "memory",
      sessionId: null,
    });
  });

  it("creates a stable memory URL", () => {
    expect(getAppRoutePath(createMemoryRoute())).toBe("/memory");
  });

  it("parses the organization administration path", () => {
    expect(parseAppRoute("/organization")).toEqual({
      surface: "organization",
      tab: "overview",
      sessionId: null,
    });
    expect(getAppRoutePath(createOrganizationRoute())).toBe("/organization");
  });

  it("keeps organization administration tabs outside Settings", () => {
    expect(parseAppRoute("/organization/members")).toEqual({
      surface: "organization",
      tab: "members",
      sessionId: null,
    });
    expect(parseAppRoute("/settings")).toEqual({
      surface: "settings",
      page: "overview",
      sessionId: null,
    });
    expect(getAppRoutePath(createSettingsRoute())).toBe("/settings");
    expect(parseAppRoute("/settings/password")).toEqual({
      surface: "settings",
      page: "password",
      sessionId: null,
    });
    expect(getAppRoutePath(createSettingsRoute("password"))).toBe(
      "/settings/password",
    );
  });
});
