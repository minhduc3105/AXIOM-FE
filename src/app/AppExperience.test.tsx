import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppExperience } from "./AppExperience";

const mocks = vi.hoisted(() => ({
  submitQuestion: vi.fn(),
  workflow: {
    activeConversationId: null as string | null,
    stage: "welcome" as "welcome" | "pending",
    evidenceOpen: false,
    investigation: null,
    draft: null,
    processEvents: [],
    result: null,
    history: [],
    error: null,
    historyLoading: false,
    loading: false,
    canRetry: false,
    loadConversation: vi.fn(),
    newChat: vi.fn(),
    submitQuestion: vi.fn(),
    updateSpecification: vi.fn(),
    reviseSpecification: vi.fn(),
    resetSpecification: vi.fn(),
    approveAndRun: vi.fn(),
    retryProcess: vi.fn(),
    closeEvidence: vi.fn(),
  },
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

type SkillsPageStubProps = {
  workspaceId: string | null;
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

vi.mock("@/shared/hooks/use-media-query", () => ({
  useMediaQuery: () => true,
}));

vi.mock("@/features/chat/model/useChatWorkflow", () => ({
  useChatWorkflow: () => mocks.workflow,
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
    <button
      type="button"
      onClick={() => onSubmit("Compare reports", "auto", [])}
    >
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

vi.mock("@/features/skills/SkillsPage", () => ({
  SkillsPage: ({ workspaceId }: SkillsPageStubProps) => (
    <div>Skill Hub catalog for {workspaceId}</div>
  ),
}));

vi.mock("@/features/skills/SkillDetailPage", () => ({
  SkillDetailPage: ({ workspaceId }: SkillsPageStubProps) => (
    <div>Skill Hub detail for {workspaceId}</div>
  ),
}));

describe("AppExperience chat controls", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.workflow = {
      ...mocks.workflow,
      activeConversationId: null,
      stage: "welcome",
    };
  });

  it("submits the model and reasoning selected from the chat top bar", async () => {
    const actor = userEvent.setup();
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

    await waitFor(() => {
      expect(mocks.workflow.submitQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          question: "Compare reports",
          conversationId: null,
          engine: "auto",
          files: [],
          organizationId: "org-1",
          workspaceId: "workspace-1",
          modelAlias: "provider:model-secondary",
          executionMode: "thinking",
          onConversationCreated: expect.any(Function),
        }),
      );
    });
  });

  it("keeps an optimistic new conversation while its route navigation is in flight", async () => {
    const actor = userEvent.setup();
    const navigate = vi.fn();
    const view = render(
      <AppExperience
        route={{ surface: "chat", page: "compose", sessionId: null }}
        navigate={navigate}
      />,
    );

    await actor.click(screen.getByRole("button", { name: "Submit question" }));
    const submission = mocks.workflow.submitQuestion.mock.calls[0]?.[0];
    mocks.workflow = {
      ...mocks.workflow,
      activeConversationId: "conversation-new",
      stage: "pending",
    };

    submission.onConversationCreated("conversation-new");
    view.rerender(
      <AppExperience
        route={{ surface: "chat", page: "compose", sessionId: null }}
        navigate={navigate}
      />,
    );

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: "conversation-new" }),
      );
      expect(mocks.workflow.newChat).not.toHaveBeenCalled();
    });
  });
});

describe("AppExperience Skill Hub routing", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the catalog route with the selected workspace context", () => {
    render(
      <AppExperience
        route={{
          surface: "skills",
          page: "list",
          skillId: null,
          sessionId: null,
        }}
        navigate={vi.fn()}
      />,
    );

    expect(screen.getByText("Skill Hub catalog for workspace-1")).toBeTruthy();
  });
});
