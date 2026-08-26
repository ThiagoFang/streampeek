import { describe, expect, it } from "bun:test";
import { readEnvVariables } from "../lib/env";

describe("desktop environment", () => {
  it("reads a valid API address", () => {
    expect(readEnvVariables({ VITE_API_BASE_URL: "https://api.example.com" })).toEqual({
      VITE_API_BASE_URL: "https://api.example.com",
    });
  });

  it("rejects a missing or empty API address", () => {
    expect(() => readEnvVariables({})).toThrow("VITE_API_BASE_URL must be a non-empty string");
    expect(() => readEnvVariables({ VITE_API_BASE_URL: "  " })).toThrow(
      "VITE_API_BASE_URL must be a non-empty string",
    );
  });
});
