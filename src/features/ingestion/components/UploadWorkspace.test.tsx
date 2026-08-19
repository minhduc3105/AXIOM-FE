import { render, screen } from "@testing-library/react";
import { vi, describe, expect, it } from "vitest";
import { UploadWorkspace } from "./UploadWorkspace";

vi.mock("./UploadFilePreview", () => ({
  UploadFilePreview: () => <div data-testid="shared-upload-file-preview" />,
}));

describe("UploadWorkspace", () => {
  it("uses the shared browser-side file preview", () => {
    render(
      <UploadWorkspace
        files={[]}
        selectedFileId={null}
        uploadResult={null}
        uploadStatus="idle"
        onBack={() => {}}
        onFiles={() => {}}
        onProcessing={() => {}}
        onRemoveFile={() => {}}
        onSelectFile={() => {}}
        onUpload={() => {}}
      />,
    );

    expect(screen.getByTestId("shared-upload-file-preview")).toBeTruthy();
  });
});
