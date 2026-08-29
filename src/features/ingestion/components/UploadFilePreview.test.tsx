import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { UploadFilePreview } from "./UploadFilePreview";

afterEach(cleanup);

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

    expect(await screen.findByText("name")).toBeTruthy();
    expect(await screen.findByText("city")).toBeTruthy();
    expect(await screen.findByText("Minh")).toBeTruthy();
    expect(
      screen.queryByText(
        "CSV preview generated from the selected upload file.",
      ),
    ).toBeNull();
    expect(screen.queryByText("Type: CSV")).toBeNull();
  });

  it("unwraps CSV rows that are quoted as complete lines", async () => {
    const file = new File(['"name,city"\n"Minh,Da Nang"'], "wrapped.csv", {
      type: "text/csv",
    });

    render(
      <UploadFilePreview
        file={{
          id: "wrapped",
          file,
          name: file.name,
          extension: "CSV",
          sizeLabel: "25 B",
        }}
      />,
    );

    expect(await screen.findByText("name")).toBeTruthy();
    expect(await screen.findByText("city")).toBeTruthy();
    expect(await screen.findByText("Minh")).toBeTruthy();
  });
});
