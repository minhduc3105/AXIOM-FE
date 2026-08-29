import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UploadFilePreview } from "./UploadFilePreview";

vi.mock("@/shared/lib/docx-preview", () => ({
  convertDocxToHtml: vi.fn().mockResolvedValue(
    '<h1>Quarterly review</h1><p>Summary content</p><img src="x" onerror="window.injected = true"><script>window.injected = true</script>',
  ),
}));

describe("UploadFilePreview", () => {
  it("renders parsed CSV content for the selected upload", async () => {
    const file = new File(["name,city\nMinh,Da Nang"], "people.csv", {
      type: "text/csv",
    });

    render(
      <UploadFilePreview
        file={{
          id: "people",
          file,
          name: file.name,
          extension: "CSV",
          sizeLabel: "23 B",
        }}
      />,
    );

    expect(
      await screen.findByText(
        "CSV preview generated from the selected upload file.",
      ),
    ).toBeTruthy();
    expect(await screen.findByText("Minh")).toBeTruthy();
  });

  it("renders sanitized DOCX content from the shared converter", async () => {
    const file = new File(["docx"], "review.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const { container } = render(
      <UploadFilePreview
        file={{
          id: "review",
          file,
          name: file.name,
          extension: "DOCX",
          sizeLabel: "4 B",
        }}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Quarterly review" })).toBeTruthy();
    expect(screen.getByText("Summary content")).toBeTruthy();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")?.getAttribute("onerror")).toBeNull();

    const previewPane = container.querySelector<HTMLElement>(
      '[aria-label="Upload file preview"]',
    );
    expect(previewPane).toBeTruthy();
    if (!previewPane) throw new Error("Upload preview pane was not rendered.");
    expect(previewPane.className).toContain("h-full");
    expect(previewPane.className).not.toContain("max-h-[34rem]");
  });
});
