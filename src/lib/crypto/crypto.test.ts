import { describe, expect, it } from "vitest";
import { fingerprint } from "./fingerprint";
import { buildKeyFile, keyFileName, parseKeyFile } from "./keyFile";
import { generateKeyPair, keyPairMatches } from "./keys";
import { openPayload } from "./open";
import { NOMINATION_BALLOT_BYTES, VOTE_BALLOT_BYTES, padPayload, unpadPayload } from "./padding";
import { sealPayload } from "./seal";

// Tests obligatorios de CLAUDE.md §12 (cifrado y padding).

const nomination = {
  v: 1,
  kind: "nomination",
  receipt: "K7M-29Q",
  categories: {
    "cat-1": [
      { type: "participant", id: "p-1" },
      { type: "external", name: "La tía Rosa" },
    ],
  },
};

const bytes = (text: string) => new TextEncoder().encode(text).length;
const base64Bytes = (b64: string) => atob(b64).length;

describe("seal → open", () => {
  it("devuelve exactamente el mismo payload", async () => {
    const keys = await generateKeyPair();
    const sealed = await sealPayload(nomination, keys.publicKey, NOMINATION_BALLOT_BYTES);
    await expect(openPayload(sealed, keys)).resolves.toEqual(nomination);
  });

  it("falla con una llave equivocada", async () => {
    const right = await generateKeyPair();
    const wrong = await generateKeyPair();
    const sealed = await sealPayload(nomination, right.publicKey, NOMINATION_BALLOT_BYTES);
    await expect(openPayload(sealed, wrong)).rejects.toThrow(/no se pudo abrir/i);
  });

  it("falla si el texto cifrado fue alterado", async () => {
    const keys = await generateKeyPair();
    const sealed = await sealPayload(nomination, keys.publicKey, NOMINATION_BALLOT_BYTES);
    const raw = Uint8Array.from(atob(sealed), (c) => c.charCodeAt(0));
    raw[raw.length - 1] ^= 0xff;
    const tampered = btoa(String.fromCharCode(...raw));
    await expect(openPayload(tampered, keys)).rejects.toThrow(/no se pudo abrir/i);
  });

  it("dos sellados del mismo payload no se parecen (no se pueden comparar)", async () => {
    const keys = await generateKeyPair();
    const a = await sealPayload(nomination, keys.publicKey, NOMINATION_BALLOT_BYTES);
    const b = await sealPayload(nomination, keys.publicKey, NOMINATION_BALLOT_BYTES);
    expect(a).not.toBe(b);
  });
});

describe("padding", () => {
  it("dos papeletas distintas producen texto cifrado del mismo tamaño", async () => {
    const keys = await generateKeyPair();
    const small = { v: 1, kind: "vote", receipt: "P2X-81B", votes: { c1: "f1" } };
    const large = {
      v: 1,
      kind: "vote",
      receipt: "Q9Z-44M",
      votes: Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`categoria-${i}`, `finalista-${i}`])),
    };
    const a = await sealPayload(small, keys.publicKey, VOTE_BALLOT_BYTES);
    const b = await sealPayload(large, keys.publicKey, VOTE_BALLOT_BYTES);
    expect(a.length).toBe(b.length);
    // crypto_box_seal agrega 48 bytes (llave efímera + MAC) al mensaje.
    expect(base64Bytes(a)).toBe(VOTE_BALLOT_BYTES + 48);
  });

  it("mide exactamente el tamaño pedido aunque haya tildes y emojis", () => {
    const padded = padPayload({ name: "Señora Ñuñoa 🎉 Ángel" }, 512);
    expect(bytes(padded)).toBe(512);
    expect(unpadPayload(padded)).toEqual({ name: "Señora Ñuñoa 🎉 Ángel" });
  });

  it("rechaza una papeleta que no cabe", () => {
    expect(() => padPayload({ text: "x".repeat(2000) }, VOTE_BALLOT_BYTES)).toThrow(/máximo/);
  });

  it("no acepta un payload que ya traiga «pad»", () => {
    expect(() => padPayload({ pad: "trampa" }, VOTE_BALLOT_BYTES)).toThrow(/pad/);
  });
});

describe("llaves y archivo del notario", () => {
  it("la llave privada corresponde a la pública, y no a otra", async () => {
    const a = await generateKeyPair();
    const b = await generateKeyPair();
    expect(await keyPairMatches(a)).toBe(true);
    expect(await keyPairMatches({ publicKey: a.publicKey, privateKey: b.privateKey })).toBe(false);
  });

  it("el archivo se vuelve a leer con las mismas llaves", async () => {
    const nominationKeys = await generateKeyPair();
    const voteKeys = await generateKeyPair();
    const text = buildKeyFile({
      eventId: "evt-1",
      eventName: "Premios del Grupo",
      nomination: nominationKeys,
      vote: voteKeys,
    });
    const file = await parseKeyFile(text);
    expect(file.nomination).toEqual(nominationKeys);
    expect(file.vote).toEqual(voteKeys);
  });

  it("rechaza un archivo con las llaves privadas intercambiadas", async () => {
    const n = await generateKeyPair();
    const v = await generateKeyPair();
    const text = buildKeyFile({
      eventId: "evt-1",
      eventName: "Premios",
      nomination: { publicKey: n.publicKey, privateKey: v.privateKey },
      vote: { publicKey: v.publicKey, privateKey: n.privateKey },
    });
    await expect(parseKeyFile(text)).rejects.toThrow(/dañado/);
  });

  it("rechaza algo que no es un archivo de llaves", async () => {
    await expect(parseKeyFile("hola")).rejects.toThrow(/no se pudo leer/);
    await expect(parseKeyFile('{"app":"otra"}')).rejects.toThrow(/no es un archivo/i);
  });

  it("nombra el archivo sin tildes ni espacios", () => {
    expect(keyFileName("Premios del Grupo · Edición 2026")).toBe(
      "notario-llaves-privadas-premios-del-grupo-edicion-2026.json",
    );
  });

  it("la huella es estable y legible", async () => {
    const { publicKey } = await generateKeyPair();
    const first = await fingerprint(publicKey);
    expect(first).toMatch(/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/);
    expect(await fingerprint(publicKey)).toBe(first);
  });
});
