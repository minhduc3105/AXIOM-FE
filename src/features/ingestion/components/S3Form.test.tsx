import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { S3Form } from "./S3Form";

function renderForm(
  overrides: Partial<React.ComponentProps<typeof S3Form>> = {},
) {
  const props: React.ComponentProps<typeof S3Form> = {
    connection: {
      accessKeyId: "",
      secretAccessKey: "",
      region: "",
      bucketName: "",
    },
    browserStatus: "idle",
    error: null,
    onChange: vi.fn(),
    onBrowse: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
  render(<S3Form {...props} />);
  return props;
}

afterEach(cleanup);

describe("S3Form connection overview", () => {
  it("shows incomplete connection details and disables browsing", () => {
    renderForm();

    expect(screen.getByText("Details required")).toBeTruthy();
    expect(screen.getAllByText("Not provided")).toHaveLength(2);
    expect(screen.getByText("Incomplete")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Browse bucket files" }),
    ).toBeDisabled();
  });

  it("shows a ready summary without exposing credential values", () => {
    const accessKeyId = "test-access-key-id";
    const secretAccessKey = "test-secret-access-key";
    renderForm({
      connection: {
        accessKeyId,
        secretAccessKey,
        region: "us-east-1",
        bucketName: "source-bucket",
      },
    });

    expect(screen.getByText("Ready to browse")).toBeTruthy();
    expect(screen.getByText("source-bucket")).toBeTruthy();
    expect(screen.getByText("us-east-1")).toBeTruthy();
    expect(screen.getByText("Added")).toBeTruthy();
    expect(screen.queryByText(accessKeyId)).toBeNull();
    expect(screen.queryByText(secretAccessKey)).toBeNull();
    expect(
      screen.getByRole("button", { name: "Browse bucket files" }),
    ).toBeEnabled();
  });

  it("shows listing status and locks the form while browsing", () => {
    renderForm({
      connection: {
        accessKeyId: "test-access",
        secretAccessKey: "test-secret",
        region: "us-east-1",
        bucketName: "source-bucket",
      },
      browserStatus: "loading",
    });

    expect(screen.getByRole("status")).toHaveTextContent("Listing objects");
    expect(screen.getByLabelText("AWS access key ID")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Loading bucket files..." }),
    ).toBeDisabled();
  });

  it("shows access failure status alongside the actionable error", () => {
    renderForm({
      browserStatus: "error",
      error: "The bucket could not be listed.",
    });

    expect(screen.getByRole("status")).toHaveTextContent("Access failed");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The bucket could not be listed.",
    );
  });
});
