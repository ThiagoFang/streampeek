import { describe, expect, it } from "bun:test";
import { getErrorMessage } from "../lib/error-message";

describe("error message", () => {
  it("reads regular JavaScript errors", () => {
    expect(getErrorMessage(new Error("Falha conhecida"), "Mensagem reserva")).toBe(
      "Falha conhecida",
    );
  });

  it("reads text errors returned by native commands", () => {
    expect(getErrorMessage("Falha nativa", "Mensagem reserva")).toBe("Falha nativa");
  });

  it("uses a safe fallback for unknown errors", () => {
    expect(getErrorMessage({ code: 500 }, "Mensagem reserva")).toBe("Mensagem reserva");
  });
});
