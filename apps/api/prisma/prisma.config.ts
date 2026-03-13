import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Load .env from apps/api (Prisma CLI doesn't auto-load it)
const envPath = path.join(__dirname, "../.env");
for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] ??= match[2].trim();
}

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
