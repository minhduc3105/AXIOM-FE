import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProcessInspectorItem } from "../components/process/processEvents";
import type { ChatTurn, ProcessEvent } from "./types";

export function useProcessInspector(
  history: ChatTurn[],
  processEvents: ProcessEvent[],
) {
  const items = useMemo<ProcessInspectorItem[]>(
    () => [
      ...history.flatMap((turn, index) =>
        (turn.processEvents ?? []).map((event) => ({
          key: `history-${index}:${event.id}`,
          event,
        })),
      ),
      ...processEvents.map((event) => ({ key: `current:${event.id}`, event })),
    ],
    [history, processEvents],
  );
  const [activeProcessEventKey, setActiveProcessEventKey] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!activeProcessEventKey) return;
    if (!items.some((item) => item.key === activeProcessEventKey)) {
      setActiveProcessEventKey(null);
    }
  }, [activeProcessEventKey, items]);

  const selectProcessEvent = useCallback((_: ProcessEvent, key: string) => {
    setActiveProcessEventKey(key);
  }, []);

  const selectLatestProcessEvent = useCallback(() => {
    setActiveProcessEventKey(items[items.length - 1]?.key ?? null);
  }, [items]);

  return {
    items,
    activeProcessEventKey,
    selectProcessEvent,
    selectLatestProcessEvent,
  };
}
