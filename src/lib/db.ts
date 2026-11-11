import "server-only";

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

// Una sola instancia por proceso. En desarrollo, el hot reload re-ejecuta este
// módulo; guardarla en globalThis evita abrir un pool nuevo en cada recarga.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("Falta DATABASE_URL (ver .env.example).");
    }
    globalForPrisma.prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
  }
  return globalForPrisma.prisma;
}

// Se crea recién en la primera consulta, no al importar el módulo: así
// `next build` puede analizar las páginas aunque no haya base de datos.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
