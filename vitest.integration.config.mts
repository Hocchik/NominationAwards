import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests contra la base real (DATABASE_URL del archivo de entorno local).
// Se corren con `npm run test:db`.

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": src,
      "server-only": `${src}/test/empty.ts`,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.int.test.ts"],
    setupFiles: ["dotenv/config"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
