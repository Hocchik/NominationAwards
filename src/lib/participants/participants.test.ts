import { describe, expect, it } from "vitest";
import { matchesGuest, mergeAliases, parseGuestList } from "./guests";
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
  const names = (text: string) => parseGuestList(text).guests.map((g) => g.name);

  it("un nombre por línea, limpio y sin líneas vacías", () => {
    expect(names("Ana Torres\n\n  Bruno   Díaz \r\nCamila")).toEqual(["Ana Torres", "Bruno Díaz", "Camila"]);
  });

  it("quita viñetas y números del inicio", () => {
    expect(names("1. Ana\n2) Bruno\n- Camila\n• Diego\n* Elena")).toEqual(["Ana", "Bruno", "Camila", "Diego", "Elena"]);
  });

  it("no repite nombres aunque cambien mayúsculas o tildes", () => {
    expect(names("José Pérez\njose perez\nJOSÉ PÉREZ")).toEqual(["José Pérez"]);
  });

  it("separa lo que no sirve como nombre", () => {
    const result = parseGuestList(`A\nAna\n${"x".repeat(41)}`);
    expect(result.guests.map((g) => g.name)).toEqual(["Ana"]);
    expect(result.invalid).toHaveLength(2);
  });

  it("lee los apodos entre paréntesis", () => {
    expect(parseGuestList("Gabriel Mendoza (Gabo, Gabito)\nAna Torres").guests).toEqual([
      { name: "Gabriel Mendoza", aliases: ["Gabo", "Gabito"] },
      { name: "Ana Torres", aliases: [] },
    ]);
  });

  it("junta los apodos de un nombre repetido y no repite apodos ni el nombre", () => {
    expect(parseGuestList("Gabriel Mendoza (Gabo)\ngabriel mendoza (GABO, Mendo, Gabriel Mendoza)").guests).toEqual([
      { name: "Gabriel Mendoza", aliases: ["Gabo", "Mendo"] },
    ]);
  });

  it("suma apodos nuevos a los que ya había", () => {
    expect(mergeAliases(["Gabo"], ["gabo", "Gabito"], "Gabriel Mendoza")).toEqual(["Gabo", "Gabito"]);
  });
});

describe("buscador de la sala", () => {
  const gabo = { name: "Gabriel Mendoza", aliases: ["Gabo"] };

  it("encuentra por nombre, por apellido o por apodo, sin importar tildes", () => {
    expect(matchesGuest(gabo, "mendoza")).toEqual({ match: true });
    expect(matchesGuest(gabo, "GABO")).toEqual({ match: true, alias: "Gabo" });
    expect(matchesGuest(gabo, "Gabrièl")).toEqual({ match: true });
    expect(matchesGuest(gabo, "lucia")).toEqual({ match: false });
  });
});
