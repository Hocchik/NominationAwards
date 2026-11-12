// Código de comprobante (CLAUDE.md §6): se genera en el navegador, viaja dentro
// de la papeleta cifrada y también en claro, para proyectar en la ceremonia la
// lista de comprobantes recibidos. "K7M-29Q": fácil de leer y de buscar.

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I/L

export function generateReceiptCode(): string {
  const bytes = crypto.getRandomValues(new Uint32Array(6));
  const chars = Array.from(bytes, (n) => ALPHABET[n % ALPHABET.length]);
  return `${chars.slice(0, 3).join("")}-${chars.slice(3).join("")}`;
}

export function isReceiptCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-HJKMNP-Z2-9]{3}-[A-HJKMNP-Z2-9]{3}$/.test(value);
}
