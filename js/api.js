const API_BASE = "https://dummyjson.com";

/**
 * @param {Response} response
 * @returns {Promise<never>}
 */
async function throwForStatus(response) {
  let detail = response.statusText || "Respuesta sin mensaje";
  try {
    const body = await response.clone().json();
    if (body?.message) {
      detail = Array.isArray(body.message)
        ? body.message.join(", ")
        : String(body.message);
    }
  } catch {
    // ignore JSON parse errors
  }
  throw new Error(`La API respondió con ${response.status}: ${detail}`);
}

/**
 * @template T
 * @param {string} url
 * @returns {Promise<T>}
 */
async function fetchJson(url) {
  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    throw new Error(
      `No se pudo conectar con el servidor. Comprueba tu conexión o inténtalo más tarde. (${cause})`
    );
  }

  if (!response.ok) {
    await throwForStatus(response);
  }

  try {
    return await response.json();
  } catch {
    throw new Error("La API devolvió datos que no se pudieron leer como JSON.");
  }
}

/**
 * @param {number} userId
 * @returns {Promise<string>}
 */
export async function fetchAuthorName(userId) {
  const url = `${API_BASE}/users/${userId}`;
  try {
    const user = await fetchJson(url);
    const first = user.firstName ?? "";
    const last = user.lastName ?? "";
    const full = `${first} ${last}`.trim();
    return full || "Autor sin nombre";
  } catch {
    return "Autor no disponible";
  }
}

/**
 * @typedef {Object} PostDTO
 * @property {number} id
 * @property {string} title
 * @property {string} body
 * @property {number} userId
 */

/**
 * @typedef {Object} PostsPageResult
 * @property {Array<PostDTO & { authorName: string }>} posts
 * @property {number} total
 * @property {number} skip
 * @property {number} limit
 */

/**
 * Lista paginada de publicaciones con nombre de autor resuelto.
 * @param {number} page Número de página (base 1).
 * @param {number} [pageSize=10]
 * @returns {Promise<PostsPageResult>}
 */
export async function fetchPostsPage(page = 1, pageSize = 10) {
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.max(1, Math.floor(pageSize));
  const skip = (safePage - 1) * safeSize;
  const listUrl = `${API_BASE}/posts?limit=${safeSize}&skip=${skip}`;

  const data = await fetchJson(listUrl);
  const posts = Array.isArray(data.posts) ? data.posts : [];
  const userIds = [...new Set(posts.map((p) => p.userId).filter(Boolean))];

  const names = await Promise.all(
    userIds.map(async (id) => {
      const authorName = await fetchAuthorName(id);
      return [id, authorName];
    })
  );
  const authorById = Object.fromEntries(names);

  const enriched = posts.map((post) => ({
    ...post,
    authorName: authorById[post.userId] ?? "Autor desconocido",
  }));

  return {
    posts: enriched,
    total: typeof data.total === "number" ? data.total : enriched.length,
    skip: typeof data.skip === "number" ? data.skip : skip,
    limit: typeof data.limit === "number" ? data.limit : safeSize,
  };
}
