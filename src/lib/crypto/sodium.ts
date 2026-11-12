import sodium from "libsodium-wrappers";

// libsodium corre como WebAssembly: hay que esperar a que cargue una vez
// antes de usar cualquier función.
let ready: Promise<typeof sodium> | null = null;

export function getSodium(): Promise<typeof sodium> {
  ready ??= sodium.ready.then(() => sodium);
  return ready;
}

/** Todo el proyecto usa base64 estándar (con + / y =) para llaves y papeletas. */
export function toBase64(s: typeof sodium, bytes: Uint8Array): string {
  return s.to_base64(bytes, s.base64_variants.ORIGINAL);
}

export function fromBase64(s: typeof sodium, value: string): Uint8Array {
  return s.from_base64(value, s.base64_variants.ORIGINAL);
}
