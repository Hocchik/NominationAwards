/** En el demo todo es instantáneo: esta pausa deja ver la carga como en el evento real. */
export const demoPause = (ms = 1100) => new Promise<void>((resolve) => setTimeout(resolve, ms));
