export const POST_TITLE_MIN_LENGTH = 5;
export const POST_BODY_MIN_LENGTH = 20;
export const AUTHOR_NAME_MIN_LENGTH = 2;

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

/**
 * RF-04: edición solo de título y cuerpo; mismas reglas que en creación para esos campos.
 * @param {{ title: string; body: string }} fields
 * @returns {{ ok: boolean; errors: { title?: string; body?: string } }}
 */
export function validateEditPostForm(fields) {
  return validatePostTitleBody(fields);
}

/**
 * RF-03: título, cuerpo y nombre de autor (solo JS, sin atributos HTML).
 * @param {{ title: string; body: string; authorName: string }} fields
 * @returns {{
 *   ok: boolean;
 *   errors: { title?: string; body?: string; authorName?: string };
 * }}
 */
export function validateCreatePostForm(fields) {
  const base = validatePostTitleBody(fields);
  const authorName =
    typeof fields.authorName === "string" ? fields.authorName : "";
  /** @type {{ title?: string; body?: string; authorName?: string }} */
  const errors = { ...base.errors };

  if (authorName.trim().length < AUTHOR_NAME_MIN_LENGTH) {
    errors.authorName = `Indica el nombre del autor (mínimo ${AUTHOR_NAME_MIN_LENGTH} caracteres).`;
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
