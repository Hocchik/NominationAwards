import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Test de esquema (CLAUDE.md §12): las reglas de anonimato 2 y 3 quedan
// vigiladas aunque alguien edite schema.prisma sin leer el CLAUDE.md.

// Sin comentarios: solo cuentan los campos reales (los comentarios del
// esquema mencionan justamente lo prohibido para explicarlo).
const schema = readFileSync(join(process.cwd(), "prisma", "schema.prisma"), "utf8").replace(
  /\/\/.*$/gm,
  "",
);

function modelBody(name: string): string {
  const match = schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`));
  if (!match) throw new Error(`No se encontró el modelo ${name}`);
  return match[1];
}

describe("esquema de la base de datos", () => {
  it("Ballot no guarda nada que vincule la papeleta con quien la envió", () => {
    const ballot = modelBody("Ballot");
    for (const forbidden of ["participantId", "participant", "createdAt", "updatedAt", "ip", "userAgent"]) {
      expect(ballot).not.toMatch(new RegExp(`^\\s*${forbidden}\\s`, "m"));
    }
    expect(ballot).not.toMatch(/@updatedAt|now\(\)|DateTime/);
  });

  it("Participant no tiene updatedAt ni fechas de nominar o votar", () => {
    const participant = modelBody("Participant");
    expect(participant).not.toMatch(/@updatedAt/);
    expect(participant).not.toMatch(/^\s*updatedAt\s/m);
    expect(participant).not.toMatch(/^\s*(nominatedAt|votedAt)\s/m);
  });

  it("los IDs son UUID v4 (uuid(7) y cuid llevan la hora de creación)", () => {
    expect(schema).not.toMatch(/uuid\(7\)|cuid\(|autoincrement\(/);
    const ids = schema.match(/^\s*id\s+String\s+@id[^\n]*/gm) ?? [];
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(id).toContain("@default(uuid(4))");
  });
});
