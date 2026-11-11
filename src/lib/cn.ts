/** Une clases CSS ignorando valores vacíos: cn("a", cond && "b") → "a b". */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
