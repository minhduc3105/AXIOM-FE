import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppExperience } from "./AppExperience";

const mocks = vi.hoisted(() => ({
  createConversation: vi.fn(),
  submitQuestion: vi.fn(),
}));

type ChatPageStubProps = {
  onSubmit: (message: string, engine: "auto", files: File[]) => void;
};

type AppShellStubProps = {
  children: ReactNode;
  chatControls?: ReactNode;
};

type ChatSelectorStubProps = {
  onModelChange: (modelAlias: string | null) => void;
  onExecutionModeChange: (mode: "instant" | "thinking") => void;
};

vi.mock("@/features/auth/model/AuthProvider", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      organization_id: "org-1",
      org_role: "owner",
    },
    accessToken: "token",
    logout: vi.fn(),
  }),
}));

vi.mock("@/features/data/model/DataWorkspaceProvider", () => ({
  useDataWorkspace: () => ({
    selectedWorkspace: { id: "workspace-1", name: "Operations" },
    workspaces: [],
    loading: false,
    selectWorkspace: vi.fn(),
  }),
}));

vi.mock("@/features/ingestion/model/GlobalIngestionProvider", () => ({
  GlobalIngestionProvider: ({ children }: { children: ReactNode }) => children,
  useGlobalIngestion: () => ({ jobs: [], openDialog: vi.fn() }),
}));

vi.mock("@/features/ingestion/components/IngestionDialog", () => ({
  IngestionDialog: () => null,
}));

vi.mock("@/features/ingestion/components/GlobalIngestionDock", () => ({
  GlobalIngestionDock: () => null,
}));

vi.mock("@/features/models/model/useModelRegistry", () => ({
  useModelRegistry: () => ({
    modelsByProvider: {
      provider: [
        {
          resource_id: "provider:model-primary",
          model_id: "model-primary",
          name: "Primary model",
          capability: "llm",
          status: "active",
        },
        {
          resource_id: "provider:model-secondary",
          model_id: "model-secondary",
          name: "Secondary model",
          capability: "llm",
          status: "active",
        },
      ],
    },
  }),
}));

vi.mock("@/shared/hooks/use-app-scope", () => ({
  useAppScope: () => null,
}));

vi.mock("@/shared/lib/intelligence-api", () => ({
  createConversation: mocks.createConversation,
}));

vi.mock("@/features/chat/model/useChatWorkflow", () => ({
  useChatWorkflow: () => ({
    activeConversationId: null,
    stage: "welcome",
    evidenceOpen: false,
    investigation: null,
    draft: null,
    processEvents: [],
    result: null,
    history: [],
    error: null,
    loading: false,
    loadConversation: vi.fn(),
    newChat: vi.fn(),
    submitQuestion: mocks.submitQuestion,
    updateSpecification: vi.fn(),
    reviseSpecification: vi.fn(),
    resetSpecification: vi.fn(),
    approveAndRun: vi.fn(),
    retryProcess: vi.fn(),
    closeEvidence: vi.fn(),
  }),
}));

vi.mock("@/app/AppShell", () => ({
  AppShell: ({ children, chatControls }: AppShellStubProps) => (
    <TooltipProvider>
      {chatControls}
      {children}
    </TooltipProvider>
  ),
}));

vi.mock("@/features/chat/ChatPage", () => ({
  ChatPage: ({ onSubmit }: ChatPageStubProps) => (
    <button type="button" onClick={() => onSubmit("Compare reports", "auto", [])}>
      Submit question
    </button>
  ),
}));

vi.mock("@/features/chat/components/ChatModelReasoningSelector", () => ({
  ChatModelReasoningSelector: ({
    onModelChange,
    onExecutionModeChange,
  }: ChatSelectorStubProps) => (
    <>
      <button
        type="button"
        onClick={() => onModelChange("provider:model-secondary")}
      >
        Select secondary model
      </button>
      <button type="button" onClick={() => onExecutionModeChange("thinking")}>
        Select Thinking
      </button>
    </>
  ),
}));

describe("AppExperience chat controls", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("submits the model and reasoning selected from the chat top bar", async () => {
    const actor = userEvent.setup();
    mocks.createConversation.mockResolvedValue({ conversation_id: "conversation-42" });

    render(
      <AppExperience
        route={{ surface: "chat", page: "compose", sessionId: null }}
        navigate={vi.fn()}
      />,
    );

    await actor.click(
      screen.getByRole("button", { name: "Select secondary model" }),
    );
    await actor.click(screen.getByRole("button", { name: "Select Thinking" }));
    await actor.click(screen.getByRole("button", { name: "Submit question" }));

    await waitFor(() =>
      expect(mocks.submitQuestion).toHaveBeenCalledWith(
        "Compare reports",
        "conversation-42",
        "auto",
        [],
        "org-1",
        "workspace-1",
        "provider:model-secondary",
        "thinking",
      ),
    );
  });
});
