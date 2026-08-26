import { describe, expect, it } from "bun:test";
import { createSseController } from "../lib/sse-controller";

describe("SSE controller", () => {
  it("runs start and stop transitions in the requested order", async () => {
    const calls: string[] = [];
    let finishStart!: () => void;
    const startGate = new Promise<void>((resolve) => {
      finishStart = resolve;
    });
    const controller = createSseController(async (command) => {
      calls.push(command);
      if (command === "start_sse") await startGate;
    });

    const start = controller.start("session-1", "https://api.example.com");
    const stop = controller.stop();
    await Promise.resolve();

    expect(calls).toEqual(["start_sse"]);

    finishStart();
    await Promise.all([start, stop]);

    expect(calls).toEqual(["start_sse", "stop_sse"]);
  });

  it("sends the session and API address to the native command", async () => {
    const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const controller = createSseController(async (command, args) => {
      calls.push({ command, args });
    });

    await controller.start("session-1", "https://api.example.com");

    expect(calls).toEqual([
      {
        command: "start_sse",
        args: { sessionId: "session-1", apiBaseUrl: "https://api.example.com" },
      },
    ]);
  });

  it("continues with later transitions after a command fails", async () => {
    const calls: string[] = [];
    const controller = createSseController(async (command) => {
      calls.push(command);
      if (command === "start_sse") throw new Error("start failed");
    });

    await expect(controller.start("session-1", "https://api.example.com")).rejects.toThrow(
      "start failed",
    );
    await controller.stop();

    expect(calls).toEqual(["start_sse", "stop_sse"]);
  });
});
