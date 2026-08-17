import { describe, expect, it } from "vitest";
import {
  createDataIngestionRoute,
  createDataRoute,
  createReportsRoute,
  createMemoryRoute,
  createModelsRoute,
  createOrganizationRoute,
  createSettingsRoute,
  createToolDetailRoute,
  createToolsRoute,
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

  it("parses the ingestion workspace path", () => {
    expect(parseAppRoute("/data/ingestion")).toEqual({
      surface: "data",
      page: "ingestion",
      sessionId: null,
      connector: null,
      profileId: null,
    });
  });

  it("parses a safe saved-source launch context", () => {
    expect(
      parseAppRoute(
        "/data/ingestion",
        "?connector=s3&profile=source-123&aws_secret_access_key=ignored",
      ),
    ).toEqual({
      surface: "data",
      page: "ingestion",
      sessionId: null,
      connector: "s3",
      profileId: "source-123",
    });
  });

  it("normalizes the former ingestion URL to the ingestion workspace", () => {
    expect(parseAppRoute("/ingest")).toEqual({
      surface: "data",
      page: "ingestion",
      sessionId: null,
      connector: null,
      profileId: null,
    });
  });

  it("creates a stable data URL", () => {
    expect(getAppRoutePath(createDataRoute())).toBe("/data");
  });

  it("creates a stable data ingestion URL", () => {
    expect(getAppRoutePath(createDataIngestionRoute())).toBe("/data/ingestion");
  });

  it("creates an ingestion URL with connector and profile identifiers only", () => {
    expect(
      getAppRoutePath(
        createDataIngestionRoute({
          connector: "snowflake",
          profileId: "finance",
        }),
      ),
    ).toBe("/data/ingestion?connector=snowflake&profile=finance");
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

describe("application routing", () => {
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
      sessionId: null,
    });
    expect(getAppRoutePath(createSettingsRoute())).toBe("/settings");
  });
});
