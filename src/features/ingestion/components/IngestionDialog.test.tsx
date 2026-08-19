import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  GlobalIngestionProvider,
  useGlobalIngestion,
} from "../model/GlobalIngestionProvider";
import { IngestionDialog } from "./IngestionDialog";

const mocks = vi.hoisted(() => ({
  listS3Files: vi.fn(),
  createS3IngestionJob: vi.fn(),
}));

vi.mock("../api/ingestionApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/ingestionApi")>()),
  listS3Files: mocks.listS3Files,
  createS3IngestionJob: mocks.createS3IngestionJob,
}));

function DialogHarness() {
  const ingestion = useGlobalIngestion();
  return (
    <>
      <button type="button" onClick={ingestion.openDialog}>
        Open ingestion dialog
      </button>
      <IngestionDialog />
    </>
  );
}

describe("IngestionDialog", () => {
  afterEach(() => {
    cleanup();
    mocks.listS3Files.mockReset();
    mocks.createS3IngestionJob.mockReset();
    window.sessionStorage.clear();
  });

  it("stages a selected local file after choosing the upload source", async () => {
    const actor = userEvent.setup();
    render(
      <GlobalIngestionProvider organizationId="org-1" workspaceId="workspace-1">
        <DialogHarness />
      </GlobalIngestionProvider>,
    );

    await actor.click(
      screen.getByRole("button", { name: "Open ingestion dialog" }),
    );
    await actor.click(screen.getByRole("button", { name: "Upload files" }));
    await actor.upload(
      screen.getByLabelText("Choose files"),
      new File(["name,city\nLan,Ho Chi Minh City"], "contacts.csv", {
        type: "text/csv",
      }),
    );

    expect(await screen.findByText("contacts.csv")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Start ingestion" }),
    ).toHaveProperty("disabled", false);
  });

  it("keeps the source chooser and upload workspace readable at narrow dialog widths", async () => {
    const actor = userEvent.setup();
    render(
      <GlobalIngestionProvider organizationId="org-1" workspaceId="workspace-1">
        <DialogHarness />
      </GlobalIngestionProvider>,
    );

    await actor.click(
      screen.getByRole("button", { name: "Open ingestion dialog" }),
    );

    expect(screen.getByRole("dialog").getAttribute("class")).toContain(
      "sm:max-w-[66rem]",
    );
    expect(
      screen
        .getByRole("button", { name: "Upload files" })
        .parentElement?.getAttribute("class"),
    ).toContain("grid-cols-1");
    expect(
      screen
        .getByRole("button", { name: "Upload files" })
        .parentElement?.getAttribute("class"),
    ).toContain("md:grid-cols-2");

    await actor.click(screen.getByRole("button", { name: "Upload files" }));
    expect(
      screen
        .getByTestId("upload-ingestion-layout")
        .getAttribute("class"),
    ).toContain("grid-cols-1");
    expect(
      screen
        .getByTestId("upload-ingestion-layout")
        .getAttribute("class"),
    ).toContain(
      "lg:grid-cols-[18rem_minmax(0,1fr)]",
    );
  });

  it("browses S3 objects and requires a selection before starting ingestion", async () => {
    mocks.listS3Files.mockResolvedValue({
      files: [
        {
          key: "reports/2026/invoice.pdf",
          name: "invoice.pdf",
          size: 1280,
          uploadedDate: "2026-08-19T00:00:00.000Z",
        },
      ],
      nextToken: null,
    });
    const actor = userEvent.setup();
    render(
      <GlobalIngestionProvider organizationId="org-1" workspaceId="workspace-1">
        <DialogHarness />
      </GlobalIngestionProvider>,
    );

    await actor.click(
      screen.getByRole("button", { name: "Open ingestion dialog" }),
    );
    await actor.click(screen.getByRole("button", { name: "Amazon S3" }));
    await actor.type(screen.getByLabelText("AWS access key ID"), "access-key");
    await actor.type(screen.getByLabelText("AWS secret access key"), "secret-key");
    await actor.clear(screen.getByLabelText("AWS region"));
    await actor.type(screen.getByLabelText("AWS region"), "ap-southeast-1");
    await actor.type(screen.getByLabelText("Source bucket"), "finance-reports");
    await actor.click(screen.getByRole("button", { name: "Browse S3 objects" }));

    expect(await screen.findByText("invoice.pdf")).toBeTruthy();
    expect(screen.queryByText("Preview")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Start ingestion" }),
    ).toHaveProperty("disabled", true);

    await actor.click(
      screen.getByRole("checkbox", {
        name: "Select reports/2026/invoice.pdf",
      }),
    );
    expect(
      screen.getByRole("button", { name: "Start ingestion" }),
    ).toHaveProperty("disabled", false);
  });

  it("keeps the S3 draft open when the import job cannot be created", async () => {
    mocks.listS3Files.mockResolvedValue({
      files: [
        {
          key: "reports/2026/invoice.pdf",
          name: "invoice.pdf",
          size: 1280,
          uploadedDate: "2026-08-19T00:00:00.000Z",
        },
      ],
      nextToken: null,
    });
    mocks.createS3IngestionJob.mockRejectedValue(new Error("Access denied"));
    const actor = userEvent.setup();
    render(
      <GlobalIngestionProvider organizationId="org-1" workspaceId="workspace-1">
        <DialogHarness />
      </GlobalIngestionProvider>,
    );

    await actor.click(
      screen.getByRole("button", { name: "Open ingestion dialog" }),
    );
    await actor.click(screen.getByRole("button", { name: "Amazon S3" }));
    await actor.type(screen.getByLabelText("AWS access key ID"), "access-key");
    await actor.type(screen.getByLabelText("AWS secret access key"), "secret-key");
    await actor.type(screen.getByLabelText("Source bucket"), "finance-reports");
    await actor.click(screen.getByRole("button", { name: "Browse S3 objects" }));
    await actor.click(
      await screen.findByRole("checkbox", {
        name: "Select reports/2026/invoice.pdf",
      }),
    );
    await actor.click(screen.getByRole("button", { name: "Start ingestion" }));

    expect(await screen.findByText("Access denied")).toBeTruthy();
    expect(screen.getByRole("dialog", { name: "Import from Amazon S3" })).toBeTruthy();
    expect(screen.getByLabelText("Source bucket")).toHaveProperty("value", "finance-reports");
  });
});
