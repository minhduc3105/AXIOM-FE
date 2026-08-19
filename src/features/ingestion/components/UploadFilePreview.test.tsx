import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { UploadFilePreview } from "./UploadFilePreview";

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
});
