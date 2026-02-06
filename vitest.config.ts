import { defineConfig } from "vitest/config";
import path from "path";
import { readFileSync } from "fs";

function loadEnvLocal(): Record<string, string> {
  try {
    const content = readFileSync(path.resolve(__dirname, ".env.local"), "utf-8");
    const env: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1).replace(/^["']|["']$/g, "");
    }
    return env;
  } catch {
    return {};
  }
}

export default defineConfig({
  test: {
    include: ["lib/**/__tests__/**/*.test.ts"],
    env: loadEnvLocal(),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
