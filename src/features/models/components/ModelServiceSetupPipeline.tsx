import { CheckCircle2Icon, CircleDotIcon, LockKeyholeIcon, WorkflowIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/shared/lib/utils";
import type { ProviderModelView, ProviderView } from "../model/registryTypes";

type SetupStepId = "provider" | "credential" | "connection" | "model" | "default";
type SetupStepState = "complete" | "next" | "waiting";

type SetupStep = {
  id: SetupStepId;
  title: string;
  detail: string;
  state: SetupStepState;
  actionLabel?: string;
};

type SetupActions = {
  onAddProvider: () => void;
  onCredential: () => void;
  onTestConnection: () => void;
  onAddModel: () => void;
  onAssignDefault: () => void;
};

function makeSteps(provider: ProviderView, models: ProviderModelView[]): SetupStep[] {
  if (provider.scope === "system") {
    return [
      { id: "provider", title: "Add an organization provider", detail: "Platform providers are available to inspect but cannot store organization credentials.", state: "next", actionLabel: "Add provider" },
      { id: "credential", title: "Configure credential", detail: "Store the API key on the organization provider.", state: "waiting" },
      { id: "connection", title: "Test connection", detail: "Verify the provider can authenticate with its configured endpoint.", state: "waiting" },
      { id: "model", title: "Add a model", detail: "Register a model and its supported workload.", state: "waiting" },
      { id: "default", title: "Assign default", detail: "Choose the validated model for each workload.", state: "waiting" },
    ];
  }

  const complete = {
    provider: true,
    credential: provider.credential_source === "database" || provider.credential_source === "environment",
    connection: provider.connection_status === "available",
    model: models.length > 0,
    default: models.some((model) => model.is_default),
  } as const;
  const firstIncomplete = (Object.entries(complete).find(([, done]) => !done)?.[0] ?? null) as SetupStepId | null;
  const stateFor = (id: SetupStepId): SetupStepState => complete[id] ? "complete" : firstIncomplete === id ? "next" : "waiting";

  return [
    { id: "provider", title: "Add provider", detail: "This organization provider owns its endpoint configuration.", state: stateFor("provider") },
    { id: "credential", title: "Configure credential", detail: "Store the API key securely in Model Service.", state: stateFor("credential"), actionLabel: "Store credential" },
    { id: "connection", title: "Test connection", detail: provider.connection_status === "unavailable" ? "The last connection test failed. Review the endpoint and credential, then test again." : "Validate the configured key and endpoint before registering models.", state: stateFor("connection"), actionLabel: "Test connection" },
    { id: "model", title: "Add model", detail: "Register at least one model after the connection is available.", state: stateFor("model"), actionLabel: "Add model" },
    { id: "default", title: "Assign default", detail: "Select an active, validated model for each workload.", state: stateFor("default"), actionLabel: "Assign default" },
  ];
}

function nextStep(steps: SetupStep[]) {
  return steps.find((step) => step.state === "next") ?? null;
}

function runStepAction(id: SetupStepId, actions: SetupActions) {
  if (id === "provider") return actions.onAddProvider();
  if (id === "credential") return actions.onCredential();
  if (id === "connection") return actions.onTestConnection();
  if (id === "model") return actions.onAddModel();
  return actions.onAssignDefault();
}

export function ModelServiceSetupNotice({ provider, models, canManage, onOpen }: {
  provider: ProviderView | null;
  models: ProviderModelView[];
  canManage: boolean;
  onOpen: () => void;
}) {
  if (!provider || !canManage) return null;
  const pending = nextStep(makeSteps(provider, models));
  if (!pending) return null;
  return <Alert><WorkflowIcon /><AlertTitle>Provider setup required</AlertTitle><AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><span><strong>{pending.title}.</strong> {pending.detail}</span><Button size="sm" className="w-fit shrink-0" onClick={onOpen}>Open setup</Button></AlertDescription></Alert>;
}

export function ModelServiceSetupPipeline({ open, provider, models, busy, onOpenChange, ...actions }: {
  open: boolean;
  provider: ProviderView | null;
  models: ProviderModelView[];
  busy: boolean;
  onOpenChange: (open: boolean) => void;
} & SetupActions) {
  if (!provider) return <Dialog open={false} onOpenChange={onOpenChange} />;
  const steps = makeSteps(provider, models);
  const pending = nextStep(steps);
  const completed = steps.filter((step) => step.state === "complete").length;

  function handleAction(step: SetupStep) {
    if (step.id !== "connection") onOpenChange(false);
    runStepAction(step.id, actions);
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="w-[96vw] max-w-[96rem] max-h-[92vh] overflow-y-auto p-6 sm:p-7"><DialogHeader><DialogTitle>Complete provider setup</DialogTitle><DialogDescription>{pending ? `Step ${completed + 1} of ${steps.length}: ${pending.title}.` : "This provider is configured and has a default model."}</DialogDescription></DialogHeader><ol className="grid gap-2" aria-label="Provider setup pipeline">{steps.map((step, index) => <li key={step.id} className={cn("grid gap-3 rounded-lg border p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center", step.state === "next" && "border-primary/40 bg-primary/5", step.state === "waiting" && "opacity-60")} aria-current={step.state === "next" ? "step" : undefined}><span className={cn("grid size-7 place-items-center rounded-full border text-xs font-semibold", step.state === "complete" ? "border-emerald-600 bg-emerald-600 text-white" : step.state === "next" ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground")}>{step.state === "complete" ? <CheckCircle2Icon className="size-4" /> : step.state === "waiting" ? <LockKeyholeIcon className="size-3.5" /> : index + 1}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{step.title}</p><Badge variant="outline" className="text-[10px] uppercase tracking-wide">{step.state === "complete" ? "Complete" : step.state === "next" ? "Next" : "Waiting"}</Badge></div><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{step.detail}</p></div>{step.state === "next" && step.actionLabel ? <Button size="sm" disabled={busy} onClick={() => handleAction(step)}>{busy && <CircleDotIcon className="animate-spin" />}{step.actionLabel}</Button> : null}</li>)}</ol></DialogContent></Dialog>;
}
