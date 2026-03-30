import { ORPCError } from "@orpc/client";

export function isAuthError(error: unknown): boolean {
  return error instanceof ORPCError && error.code === "UNAUTHORIZED";
}
