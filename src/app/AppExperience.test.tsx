import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ProcessStepSelectionHandler } from "@/features/chat/components/process/processEvents";
import type { ChatEngine, ProcessEvent } from "@/features/chat/model/types";
import { AppExperience } from "./AppExperience";

const mocks = vi.hoisted(() => ({
  submitQuestion: vi.fn(),
  modelRegistryRefresh: vi.fn(),
  workflow: {
    activeConversationId: null as string | null,
    stage: "welcome" as "welcome" | "pending",
    evidenceOpen: false,
    investigation: null,
    draft: null,
    processEvents: [] as ProcessEvent[],
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
  engine: ChatEngine;
  onEngineChange: (engine: ChatEngine) => void;
  onSubmit: (message: string, engine: ChatEngine, files: File[]) => void;
  activeProcessEventKey?: string | null;
  onProcessEventSelect?: ProcessStepSelectionHandler;
};

type AppShellStubProps = {
  children: ReactNode;
  chatControls?: ReactNode;
};

type ChatSelectorStubProps = {
  models: Array<{
    label: string;
    capability?: string;
    providerId?: string;
  }>;
  selectedModelAlias: string | null;
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
    providers: [{ id: "provider", display_name: "Provider" }],
    modelsByProvider: {
      provider: [
        {
          resource_id: "provider:model-primary",
          model_id: "deepseek-v4-flash-free",
          name: "DeepSeek V4 Flash Free",
          capability: "llm",
          status: "active",
        },
        {
          resource_id: "provider:model-secondary",
          model_id: "mimo-v2.5-free",
          name: "MiMo V2.5 Free",
          capability: "llm",
          status: "active",
        },
        {
          resource_id: "provider:model-vision",
          model_id: "nvidia/nemotron-vision-free",
          name: "Nemotron Vision Free",
          capability: "vlm",
          status: "active",
        },
      ],
    },
    refresh: mocks.modelRegistryRefresh,
  }),
}));

vi.mock("@/features/models/ModelsPage", () => ({
  ModelsPage: () => <div>Models page</div>,
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
  ChatPage: ({
    engine,
    onEngineChange,
    activeProcessEventKey,
    onProcessEventSelect,
    onSubmit,
  }: ChatPageStubProps) => (
    <>
      <output data-testid="selected-chat-engine">{engine}</output>
      <button
        type="button"
        onClick={() => onEngineChange("report")}
      >
        Select Report response type
      </button>
      <button
        type="button"
        onClick={() => onSubmit("Compare reports", "auto", [])}
      >
        Submit question
      </button>
      <button
        type="button"
        onClick={() => {
          onProcessEventSelect?.(
            {
              id: "read-file",
              label: "Read file",
              detail: "Reading a file",
              status: "done",
              phase: "tool",
            },
            "current:read-file",
          );
        }}
      >
        Select process step
      </button>
      <output data-testid="active-process-event-key">
        {activeProcessEventKey ?? "none"}
      </output>
    </>
  ),
}));

vi.mock("@/features/chat/components/ChatModelReasoningSelector", () => ({
  ChatModelReasoningSelector: ({
    models,
    selectedModelAlias,
    onModelChange,
    onExecutionModeChange,
  }: ChatSelectorStubProps) => (
    <>
      <output data-testid="selected-chat-model">
        {selectedModelAlias ?? "none"}
      </output>
      <output data-testid="chat-model-options">
        {models
          .map(
            (model) => `${model.providerId}:${model.label}:${model.capability}`,
          )
          .join("|")}
      </output>
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
    <div>Skills catalog for {workspaceId}</div>
  ),
}));

vi.mock("@/features/skills/SkillDetailPage", () => ({
  SkillDetailPage: ({ workspaceId }: SkillsPageStubProps) => (
    <div>Skills detail for {workspaceId}</div>
  ),
}));

describe("AppExperience chat controls", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.workflow = {
      ...mocks.workflow,
      activeConversationId: null,
      stage: "welcome",
      processEvents: [],
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

  it("restores the selected model after the app is remounted", async () => {
    const actor = userEvent.setup();
    const route = {
      surface: "chat" as const,
      page: "compose" as const,
      sessionId: null,
    };
    const navigate = vi.fn();
    const view = render(<AppExperience route={route} navigate={navigate} />);

    await actor.click(
      screen.getByRole("button", { name: "Select secondary model" }),
    );
    expect(screen.getByTestId("selected-chat-model").textContent).toBe(
      "provider:model-secondary",
    );

    view.unmount();
    render(<AppExperience route={route} navigate={navigate} />);

    await waitFor(() => {
      expect(screen.getByTestId("selected-chat-model").textContent).toBe(
        "provider:model-secondary",
      );
    });
  });

  it("restores the selected response type after the app is remounted", async () => {
    const actor = userEvent.setup();
    const route = {
      surface: "chat" as const,
      page: "compose" as const,
      sessionId: null,
    };
    const navigate = vi.fn();
    const view = render(<AppExperience route={route} navigate={navigate} />);

    await actor.click(
      screen.getByRole("button", { name: "Select Report response type" }),
    );
    expect(screen.getByTestId("selected-chat-engine").textContent).toBe(
      "report",
    );

    view.unmount();
    render(<AppExperience route={route} navigate={navigate} />);

    await waitFor(() => {
      expect(screen.getByTestId("selected-chat-engine").textContent).toBe(
        "report",
      );
    });
  });

  it("passes model IDs and both LLM/VLM models from each provider", () => {
    render(
      <AppExperience
        route={{ surface: "chat", page: "compose", sessionId: null }}
        navigate={vi.fn()}
      />,
    );

    expect(screen.getByTestId("chat-model-options").textContent).toBe(
      "provider:deepseek-v4-flash-free:llm|provider:mimo-v2.5-free:llm|provider:nvidia/nemotron-vision-free:vlm",
    );
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

  it("keeps the clicked process step active in the inline action timeline", async () => {
    const actor = userEvent.setup();
    mocks.workflow = {
      ...mocks.workflow,
      processEvents: [
        {
          id: "read-file",
          label: "Read file",
          detail: "Reading a file",
          status: "done",
          phase: "tool",
        },
        {
          id: "execute-python",
          label: "Execute python",
          detail: "Executing python",
          status: "done",
          phase: "tool",
        },
      ],
    };
    render(
      <AppExperience
        route={{ surface: "chat", page: "compose", sessionId: null }}
        navigate={vi.fn()}
      />,
    );

    await actor.click(
      screen.getByRole("button", { name: "Select process step" }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("active-process-event-key").textContent).toBe(
        "current:read-file",
      );
    });
  });
});

describe("AppExperience Skills routing", () => {
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

    expect(screen.getByText("Skills catalog for workspace-1")).toBeTruthy();
  });
});

describe("AppExperience model registry refresh", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("refreshes models when returning to chat from model administration", async () => {
    const view = render(
      <AppExperience
        route={{ surface: "models", sessionId: null }}
        navigate={vi.fn()}
      />,
    );

    expect(mocks.modelRegistryRefresh).not.toHaveBeenCalled();

    view.rerender(
      <AppExperience
        route={{ surface: "chat", page: "compose", sessionId: null }}
        navigate={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mocks.modelRegistryRefresh).toHaveBeenCalledTimes(1);
    });
  });
});
