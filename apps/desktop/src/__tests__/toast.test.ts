import { beforeEach, describe, expect, it } from "bun:test";
import { useToastStore } from "../store/toast";

describe("toast store", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it("adds and dismisses a notification", () => {
    const id = useToastStore.getState().push({
      message: "Algo deu errado",
      durationMs: 0,
    });

    expect(useToastStore.getState().toasts).toEqual([
      { id, message: "Algo deu errado", variant: "error" },
    ]);

    useToastStore.getState().dismiss(id);

    expect(useToastStore.getState().toasts).toEqual([]);
  });
});
