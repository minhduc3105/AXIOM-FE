import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IngestionFile } from "../model/types";
import { UploadWorkspace } from "./UploadWorkspace";

describe("UploadWorkspace", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:image-preview"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows the real local preview for a JPEG file", async () => {
    const browserFile = new File(["image"], "cover.jpg", { type: "image/jpeg" });
    const file: IngestionFile = {
      id: "cover-jpg",
      file: browserFile,
      name: browserFile.name,
      extension: "JPG",
      sizeLabel: "5 B",
    };

    render(
      <UploadWorkspace
        files={[file]}
        selectedFileId={file.id}
        uploadStatus="idle"
        uploadResult={null}
        onFiles={vi.fn()}
        onSelectFile={vi.fn()}
        onUpload={vi.fn()}
        onProcessing={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const image = await screen.findByRole("img", { name: "Image preview for cover.jpg" });
    await waitFor(() => expect(image.getAttribute("src")).toBe("blob:image-preview"));
    expect(screen.getByLabelText(/drop or browse/i).getAttribute("accept")).toContain(".jpeg");
  });
});
