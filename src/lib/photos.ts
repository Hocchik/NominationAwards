// Fotos chicas guardadas como data URL (invitados, opciones de categoría). Se
// reducen en el navegador antes de enviarlas: pesan unas decenas de KB y caben
// en la base sin servicios extra.

const MAX_SIDE = 480;

/** Solo en el navegador: reduce la imagen a JPEG de hasta 480 px por lado. */
export async function resizeToJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.8);
}

/** En el servidor: ¿es un JPEG chico como los que arma `resizeToJpeg`? */
export function isSmallJpegDataUrl(value: string): boolean {
  return /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value) && value.length <= 200_000;
}
