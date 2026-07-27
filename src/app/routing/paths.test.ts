import { describe, expect, it } from "vitest";
import {
  createDataIngestionRoute,
  createDataRoute,
  createReportsRoute,
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
    });
  });

  it("normalizes the former ingestion URL to the ingestion workspace", () => {
    expect(parseAppRoute("/ingest")).toEqual({
      surface: "data",
      page: "ingestion",
      sessionId: null,
    });
  });

  it("creates a stable data URL", () => {
    expect(getAppRoutePath(createDataRoute())).toBe("/data");
  });

  it("creates a stable data ingestion URL", () => {
    expect(getAppRoutePath(createDataIngestionRoute())).toBe(
      "/data/ingestion",
    );
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
