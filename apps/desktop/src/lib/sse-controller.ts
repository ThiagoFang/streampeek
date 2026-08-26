import { invoke } from "@tauri-apps/api/core";

type RunCommand = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

export function createSseController(runCommand: RunCommand) {
  let transition = Promise.resolve();

  const enqueue = <T>(operation: () => Promise<T>) => {
    const result = transition.then(operation);
    transition = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  return {
    start(sessionId: string, apiBaseUrl: string) {
      return enqueue(() => runCommand("start_sse", { sessionId, apiBaseUrl }));
    },

    stop() {
      return enqueue(() => runCommand("stop_sse"));
    },
  };
}

export const SseController = createSseController(invoke);
