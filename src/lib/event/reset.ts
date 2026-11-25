// Palabras que hay que escribir para confirmar que se vuelve a empezar.
export const RESET_WORD = "REINICIAR";
export const WIPE_WORD = "BORRAR TODO";

export function confirmsWith(text: string, word: string): boolean {
  return text.trim().toUpperCase() === word;
}
