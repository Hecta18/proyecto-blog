const SKELETON_CARD_COUNT = 10;

/**
 * @param {string} text
 * @param {number} [maxLength=160]
 */
export function excerptFromBody(text, maxLength = 160) {
  const normalized = (text ?? "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}

/**
 * @param {HTMLElement} root
 */
function clearElement(root) {
  root.replaceChildren();
}

/**
 * @param {HTMLElement} container
 */
export function showPostsLoading(container) {
  clearElement(container);
  const bar = document.createElement("div");
  bar.className = "loading-bar";
  bar.setAttribute("role", "status");
  bar.setAttribute("aria-live", "polite");
  bar.innerHTML =
    '<span class="spinner" aria-hidden="true"></span><span>Cargando publicaciones…</span>';
  container.appendChild(bar);

  const grid = document.createElement("div");
  grid.className = "posts-skeleton__grid";

  for (let i = 0; i < SKELETON_CARD_COUNT; i += 1) {
    const card = document.createElement("article");
    card.className = "skeleton-card";
    card.setAttribute("aria-hidden", "true");
    card.innerHTML = `
      <div class="skeleton-line skeleton-line--medium"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line skeleton-line--short"></div>
      <div class="skeleton-block"></div>
      <div class="skeleton-line skeleton-line--tiny"></div>
    `;
    grid.appendChild(card);
  }

  container.appendChild(grid);
}

/**
 * @param {HTMLElement} container
 */
export function clearPostsLoading(container) {
  clearElement(container);
}

/**
 * @param {HTMLElement} grid
 * @param {Array<{
 *   id: number;
 *   title: string;
 *   body: string;
 *   authorName: string;
 * }>} posts
 */
export function renderPostCards(grid, posts) {
  clearElement(grid);
  const fragment = document.createDocumentFragment();

  for (const post of posts) {
    const article = document.createElement("article");
    article.className = "card";
    article.dataset.postId = String(post.id);

    const title = document.createElement("h2");
    title.className = "card__title";
    title.textContent = post.title;

    const excerpt = document.createElement("p");
    excerpt.className = "card__excerpt";
    excerpt.textContent = excerptFromBody(post.body);

    const meta = document.createElement("p");
    meta.className = "card__meta";
    meta.innerHTML = `Autor: <strong>${escapeHtml(post.authorName)}</strong>`;

    const actions = document.createElement("div");
    actions.className = "card__actions";

    const link = document.createElement("a");
    link.className = "btn btn--primary";
    link.href = `#/posts/${post.id}`;
    link.textContent = "Ver detalle";

    actions.appendChild(link);
    article.append(title, excerpt, meta, actions);
    fragment.appendChild(article);
  }

  grid.appendChild(fragment);
}

/**
 * @param {string} value
 */
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * @param {HTMLElement} banner
 * @param {string | null} message
 */
export function setErrorBanner(banner, message) {
  if (!message) {
    banner.hidden = true;
    banner.textContent = "";
    return;
  }
  banner.hidden = false;
  banner.textContent = message;
}

/**
 * @param {HTMLElement} emptyState
 * @param {boolean} visible
 */
export function setEmptyState(emptyState, visible) {
  emptyState.hidden = !visible;
}

/**
 * @param {HTMLElement} nav
 * @param {object} options
 * @param {number} options.page
 * @param {number} options.totalPages
 * @param {() => void} options.onPrev
 * @param {() => void} options.onNext
 */
export function bindPagination(nav, { page, totalPages, onPrev, onNext }) {
  const btnPrev = nav.querySelector("#btn-prev");
  const btnNext = nav.querySelector("#btn-next");
  const labelCurrent = nav.querySelector("#page-current");
  const labelTotal = nav.querySelector("#page-total");

  if (
    !(btnPrev instanceof HTMLButtonElement) ||
    !(btnNext instanceof HTMLButtonElement) ||
    !(labelCurrent instanceof HTMLElement) ||
    !(labelTotal instanceof HTMLElement)
  ) {
    return;
  }

  labelCurrent.textContent = String(page);
  labelTotal.textContent = String(Math.max(1, totalPages));

  btnPrev.disabled = page <= 1;
  btnNext.disabled = page >= totalPages;

  btnPrev.onclick = () => {
    if (page > 1) onPrev();
  };
  btnNext.onclick = () => {
    if (page < totalPages) onNext();
  };

  nav.hidden = totalPages <= 1;
}

/**
 * @param {HTMLElement} listView
 * @param {HTMLElement} detailView
 * @param {HTMLElement} idLabel
 * @param {'list' | 'detail'} mode
 * @param {number | null} postId
 */
export function toggleViews(listView, detailView, idLabel, mode, postId) {
  if (mode === "detail") {
    listView.hidden = true;
    detailView.hidden = false;
    if (postId != null) {
      idLabel.textContent = String(postId);
    }
    return;
  }
  listView.hidden = false;
  detailView.hidden = true;
}
