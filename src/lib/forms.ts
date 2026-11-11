// Estado que devuelven las Server Actions a los formularios (useActionState).
// Vive aquí y no en el archivo de acciones porque un archivo "use server"
// solo puede exportar funciones async.

export interface FormState {
  ok: boolean;
  /** Mensaje general (éxito o error que no es de un campo). */
  message?: string;
  /** Errores por campo: { name: ["El nombre es muy corto."] } */
  errors?: Record<string, string[] | undefined>;
  /**
   * Lo que se envió, para volver a llenar el formulario si hubo error: React
   * limpia el formulario después de cada envío.
   */
  values?: Record<string, string>;
}

export const initialFormState: FormState = { ok: false };
