import { Context } from "hono";
import { redis } from "../lib/redis";
import { db } from "../db/index";

interface HealthStatus {
  status: "healthy" | "unhealthy";
  timestamp: string;
  checks: {
    database: "ok" | "error";
    redis: "ok" | "error";
  };
}

export async function handleHealth(c: Context) {
  const checks: HealthStatus["checks"] = {
    database: "ok",
    redis: "ok",
  };

  try {
    await db.selectFrom("auth_tokens").select("id").limit(1).execute();
  } catch {
    checks.database = "error";
  }

  try {
    await redis.ping();
  } catch {
    checks.redis = "error";
  }

  const allHealthy = checks.database === "ok" && checks.redis === "ok";

  return c.json(
    {
      status: allHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      checks,
    },
    allHealthy ? 200 : 503,
  );
}