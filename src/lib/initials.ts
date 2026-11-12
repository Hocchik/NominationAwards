/** Iniciales para cuando no hay foto: "Camila Rojas" → "CR", "La tía Rosa" → "LT". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase("es"))
    .join("");
}
