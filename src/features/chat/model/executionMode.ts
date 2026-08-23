import type { ChatEngine, ChatExecutionMode } from "./types";

export const DEFAULT_CHAT_ENGINE: ChatEngine = "auto";
export const DEFAULT_CHAT_EXECUTION_MODE: ChatExecutionMode = "instant";

export function normalizeExecutionMode(
  engine: ChatEngine,
  mode: ChatExecutionMode,
): ChatExecutionMode {
  void engine;
  return mode;
}
