import { describe, expect, it } from "vitest";
import { parseGuestList } from "./guests";
import { cleanDisplayName, normalizeName } from "./names";
import { displayNameSchema } from "./schemas";

describe("nombres", () => {
  it("no distingue mayúsculas, tildes ni espacios de más", () => {
    expect(normalizeName("  José   Pérez ")).toBe("jose perez");
    expect(normalizeName("JOSÉ PÉREZ")).toBe(normalizeName("jose perez"));
    expect(normalizeName("Agüero")).toBe("aguero");
  });

  it("conserva la ñ: Peña y Pena son personas distintas", () => {
    expect(normalizeName("Peña")).toBe("peña");
    expect(normalizeName("PEÑA")).toBe("peña");
    expect(normalizeName("Peña")).not.toBe(normalizeName("Pena"));
  });

  it("Juan y Juancho siguen siendo distintos (eso lo decide el admin)", () => {
    expect(normalizeName("Juan")).not.toBe(normalizeName("Juancho"));
  });

  it("el nombre que se muestra queda limpio pero con sus tildes", () => {
    expect(cleanDisplayName("  María   José ")).toBe("María José");
  });

  it("valida el largo del nombre ya limpio", () => {
    expect(displayNameSchema.safeParse("  A  ").success).toBe(false);
    expect(displayNameSchema.parse("  Ana  ")).toBe("Ana");
  });
});

describe("lista de invitados", () => {
  it("un nombre por línea, limpio y sin líneas vacías", () => {
    expect(parseGuestList("Ana Torres\n\n  Bruno   Díaz \r\nCamila").names).toEqual(["Ana Torres", "Bruno Díaz", "Camila"]);
  });

  it("quita viñetas y números del inicio", () => {
    expect(parseGuestList("1. Ana\n2) Bruno\n- Camila\n• Diego\n* Elena").names).toEqual([
      "Ana",
      "Bruno",
      "Camila",
      "Diego",
      "Elena",
    ]);
  });

  it("no repite nombres aunque cambien mayúsculas o tildes", () => {
    expect(parseGuestList("José Pérez\njose perez\nJOSÉ PÉREZ").names).toEqual(["José Pérez"]);
  });

  it("separa lo que no sirve como nombre", () => {
    const result = parseGuestList(`A\nAna\n${"x".repeat(41)}`);
    expect(result.names).toEqual(["Ana"]);
    expect(result.invalid).toHaveLength(2);
  });
});
