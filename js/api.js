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

/**
 * @param {string} url
 * @param {RequestInit} [init]
 * @returns {Promise<unknown>}
 */
async function requestJson(url, init) {
  let response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    throw new Error(
      `No se pudo conectar con el servidor. Comprueba tu conexión o inténtalo más tarde. (${cause})`
    );
  }

  if (!response.ok) {
    await throwForStatus(response);
  }

  const text = await response.text();
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("La API devolvió datos que no se pudieron leer como JSON.");
  }
}

/**
 * Publicación individual con autor resuelto (GET por ID).
 * @param {number} id
 * @returns {Promise<PostDTO & { authorName: string; tags: string[]; views: number; reactions: { likes?: number; dislikes?: number } }>}
 */
export async function fetchPostById(id) {
  const safeId = Math.floor(Number(id));
  if (!Number.isFinite(safeId) || safeId < 1) {
    throw new Error("Identificador de publicación no válido.");
  }

  const post = await fetchJson(`${API_BASE}/posts/${safeId}`);
  const authorName = await fetchAuthorName(post.userId);

  return {
    ...post,
    authorName,
  };
}

/**
 * @param {number} id
 * @returns {Promise<unknown>}
 */
export async function deletePostById(id) {
  const safeId = Math.floor(Number(id));
  if (!Number.isFinite(safeId) || safeId < 1) {
    throw new Error("Identificador de publicación no válido.");
  }

  return requestJson(`${API_BASE}/posts/${safeId}`, { method: "DELETE" });
}

/**
 * Actualiza título y cuerpo (PATCH; DummyJSON acepta PUT o PATCH).
 * @param {number} id
 * @param {{ title: string; body: string }} payload
 * @returns {Promise<PostDTO & { authorName: string }>}
 */
export async function updatePostById(id, payload) {
  const safeId = Math.floor(Number(id));
  if (!Number.isFinite(safeId) || safeId < 1) {
    throw new Error("Identificador de publicación no válido.");
  }

  const updated = await requestJson(`${API_BASE}/posts/${safeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: payload.title,
      body: payload.body,
    }),
  });

  const authorName = await fetchAuthorName(updated.userId);
  return { ...updated, authorName };
}

/**
 * Busca un usuario por nombre o apellido para asociar userId al crear un post.
 * @param {string} authorQuery texto del formulario (nombre, apellido o ambos)
 * @returns {Promise<{ userId: number; displayName: string } | null>}
 */
export async function findUserForAuthorName(authorQuery) {
  const q = authorQuery.trim();
  if (!q) {
    return null;
  }

  const data = await fetchJson(
    `${API_BASE}/users/search?q=${encodeURIComponent(q)}`
  );
  const users = Array.isArray(data.users) ? data.users : [];
  if (users.length === 0) {
    return null;
  }

  const target = q.toLowerCase().replace(/\s+/g, " ");
  const fullName = (u) =>
    `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim().toLowerCase();

  const exact = users.find((u) => fullName(u) === target);
  const picked = exact ?? users[0];
  const displayName =
    `${picked.firstName ?? ""} ${picked.lastName ?? ""}`.trim() ||
    "Autor sin nombre";

  return { userId: picked.id, displayName };
}

/**
 * Crea una publicación (POST simulado en DummyJSON).
 * @param {{ title: string; body: string; userId: number }} payload
 * @returns {Promise<PostDTO & { authorName: string }>}
 */
export async function createPost(payload) {
  const created = await requestJson(`${API_BASE}/posts/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: payload.title,
      body: payload.body,
      userId: payload.userId,
    }),
  });

  const authorName = await fetchAuthorName(created.userId);
  return {
    ...created,
    title: created.title ?? payload.title,
    body: created.body ?? payload.body,
    authorName,
  };
}

/**
 * Etiquetas disponibles para posts (RF-06 filtro por tag).
 * @returns {Promise<string[]>}
 */
export async function fetchPostTagList() {
  const data = await fetchJson(`${API_BASE}/posts/tag-list`);
  return Array.isArray(data) ? data : [];
}

/**
 * Usuarios para el desplegable «autor» (RF-06).
 * @returns {Promise<Array<{ id: number; label: string }>>}
 */
export async function fetchUsersForAuthorFilter() {
  const data = await fetchJson(
    `${API_BASE}/users?limit=0&select=id,firstName,lastName`
  );
  const users = Array.isArray(data.users) ? data.users : [];
  return users
    .map((u) => ({
      id: u.id,
      label:
        `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || `Usuario ${u.id}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

/**
 * @typedef {{ searchText: string; userId: string; tag: string }} PostListFilters
 */

/**
 * RF-06: filtros combinables (texto en título/cuerpo, autor, etiqueta).
 * Descarga el conjunto de posts y aplica filtros en cliente para poder combinar AND.
 * @param {number} page
 * @param {number} pageSize
 * @param {PostListFilters} filters
 * @returns {Promise<PostsPageResult>}
 */
export async function fetchPostsPageWithFilters(page, pageSize, filters) {
  const data = await fetchJson(`${API_BASE}/posts?limit=0&skip=0`);
  let posts = Array.isArray(data.posts) ? data.posts : [];

  const q = (filters.searchText ?? "").trim().toLowerCase();
  if (q) {
    posts = posts.filter(
      (p) =>
        String(p.title ?? "")
          .toLowerCase()
          .includes(q) ||
        String(p.body ?? "")
          .toLowerCase()
          .includes(q)
    );
  }

  const uid = (filters.userId ?? "").trim();
  if (uid) {
    const n = Number(uid);
    if (Number.isFinite(n)) {
      posts = posts.filter((p) => p.userId === n);
    }
  }

  const tag = (filters.tag ?? "").trim().toLowerCase();
  if (tag) {
    posts = posts.filter(
      (p) =>
        Array.isArray(p.tags) &&
        p.tags.some((t) => String(t).toLowerCase() === tag)
    );
  }

  const total = posts.length;
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.max(1, Math.floor(pageSize));
  const skip = (safePage - 1) * safeSize;
  const pagePosts = posts.slice(skip, skip + safeSize);

  const userIds = [...new Set(pagePosts.map((p) => p.userId).filter(Boolean))];
  const names = await Promise.all(
    userIds.map(async (id) => {
      const authorName = await fetchAuthorName(id);
      return [id, authorName];
    })
  );
  const authorById = Object.fromEntries(names);

  const enriched = pagePosts.map((post) => ({
    ...post,
    authorName: authorById[post.userId] ?? "Autor desconocido",
  }));

  return {
    posts: enriched,
    total,
    skip,
    limit: safeSize,
  };
}


