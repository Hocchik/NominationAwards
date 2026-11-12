// Huella corta de una llave pública, para compararla a simple vista entre la
// pantalla del notario y el panel del admin ("3F9A-12CD-77B0-E415").
// Usa Web Crypto, que existe tanto en el navegador como en Node: este módulo
// sirve en cliente y en servidor (solo toca llaves públicas).

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function fingerprint(publicKey: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", base64ToBytes(publicKey)));
  const hex = Array.from(digest.slice(0, 8), (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return hex.match(/.{4}/g)!.join("-");
}
