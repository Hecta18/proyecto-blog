/**
 * @typedef {{ name: 'list' }} ListRoute
 * @typedef {{ name: 'create' }} CreateRoute
 * @typedef {{ name: 'detail'; postId: number }} DetailRoute
 * @typedef {{ name: 'detailEdit'; postId: number }} DetailEditRoute
 * @typedef {ListRoute | CreateRoute | DetailRoute | DetailEditRoute} AppRoute
 */

/**
 * @returns {AppRoute}
 */
export function parseRoute() {
  const raw = location.hash.replace(/^#/, "").trim();
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  const normalized = path === "" || path === "/" ? "/" : path;

  if (normalized === "/create") {
    return { name: "create" };
  }

  const editMatch = normalized.match(/^\/posts\/(\d+)\/edit$/);
  if (editMatch) {
    return { name: "detailEdit", postId: Number(editMatch[1]) };
  }

  const detailMatch = normalized.match(/^\/posts\/(\d+)$/);
  if (detailMatch) {
    return { name: "detail", postId: Number(detailMatch[1]) };
  }

  return { name: "list" };
}

/**
 * @param {(route: AppRoute) => void} onRoute
 */
export function startRouter(onRoute) {
  const notify = () => onRoute(parseRoute());
  window.addEventListener("hashchange", notify);
  notify();
}
