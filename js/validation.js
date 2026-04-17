export const POST_TITLE_MIN_LENGTH = 5;
export const POST_BODY_MIN_LENGTH = 20;

/**
 * Validación compartida para crear/editar publicación (título y cuerpo).
 * @param {{ title: string; body: string }} fields
 * @returns {{ ok: boolean; errors: { title?: string; body?: string } }}
 */
export function validatePostTitleBody(fields) {
  const title = typeof fields.title === "string" ? fields.title : "";
  const body = typeof fields.body === "string" ? fields.body : "";
  /** @type {{ title?: string; body?: string }} */
  const errors = {};

  if (title.trim().length < POST_TITLE_MIN_LENGTH) {
    errors.title = `El título debe tener al menos ${POST_TITLE_MIN_LENGTH} caracteres.`;
  }

  if (body.trim().length < POST_BODY_MIN_LENGTH) {
    errors.body = `El contenido debe tener al menos ${POST_BODY_MIN_LENGTH} caracteres.`;
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
