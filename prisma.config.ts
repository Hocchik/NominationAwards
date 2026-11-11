// Configuración del CLI de Prisma (migraciones, generate, studio).
// La app en tiempo de ejecución NO usa este archivo: se conecta en src/lib/db.ts.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Neon: las migraciones van mejor por la conexión directa (sin pooler).
    // Si DIRECT_URL no está definida o está vacía, se usa DATABASE_URL.
    // (|| y no ??: un DIRECT_URL="" debe caer a DATABASE_URL.)
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
