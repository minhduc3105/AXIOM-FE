import { describe, expect, it } from "vitest";
import type { AutoReportSource } from "../api/reportsApi";
import { getReportSourcePath } from "./reportSourceLinks";

const source: AutoReportSource = {
  source_id: "source-1",
  document_id: "document-1",
  object_key:
    "organizations/test-org/workspaces/workspace-1/sources/WMO report.pdf",
  filename: "WMO report.pdf",
  content_type: "application/pdf",
  source_last_modified: null,
  role: "primary",
};

describe("getReportSourcePath", () => {
  it("builds a link to the data document viewer", () => {
    expect(getReportSourcePath(source)).toBe(
      "/data/document/organizations%2Ftest-org%2Fworkspaces%2Fworkspace-1%2Fsources%2FWMO%20report.pdf?bucket=axiom-documents&source=All+workspace+files&filename=WMO+report.pdf&document_id=document-1",
    );
  });

  it("omits the document id when the source has none", () => {
    expect(getReportSourcePath({ ...source, document_id: null })).not.toContain(
      "document_id=",
    );
  });
});
