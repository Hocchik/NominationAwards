import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

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
    include: ["src/**/*.test.ts"],
    // Los de integración usan la base real: van aparte (npm run test:db).
    exclude: ["src/**/*.int.test.ts"],
  },
});
