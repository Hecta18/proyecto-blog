/**
 * @typedef {{ name: 'list' } | { name: 'detail'; postId: number }} AppRoute
 */

/**
 * @returns {AppRoute}
 */
export function parseRoute() {
  const raw = location.hash.replace(/^#/, "").trim();
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  const normalized = path === "" || path === "/" ? "/" : path;

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
