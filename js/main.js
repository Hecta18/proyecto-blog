import { fetchPostsPage } from "./api.js";
import {
  bindPagination,
  clearPostsLoading,
  renderPostCards,
  setEmptyState,
  setErrorBanner,
  showPostsLoading,
  toggleViews,
} from "./ui.js";
import { parseRoute, startRouter } from "./router.js";

const PAGE_SIZE = 10;

const refs = {
  listView: document.getElementById("view-list"),
  detailView: document.getElementById("view-detail-placeholder"),
  detailIdLabel: document.getElementById("detail-post-id"),
  errorBanner: document.getElementById("posts-error"),
  skeletonHost: document.getElementById("posts-skeleton"),
  emptyState: document.getElementById("posts-empty"),
  grid: document.getElementById("posts-grid"),
  pagination: document.getElementById("posts-pagination"),
};

function assertRefs() {
  for (const [key, el] of Object.entries(refs)) {
    if (!(el instanceof HTMLElement)) {
      throw new Error(`No se encontró el elemento DOM requerido: ${key}`);
    }
  }
}

let currentPage = 1;

/**
 * @param {number} page
 */
async function loadPostsPage(page) {
  setErrorBanner(refs.errorBanner, null);
  setEmptyState(refs.emptyState, false);
  refs.pagination.hidden = true;

  showPostsLoading(refs.skeletonHost);
  refs.grid.replaceChildren();

  try {
    const result = await fetchPostsPage(page, PAGE_SIZE);
    clearPostsLoading(refs.skeletonHost);

    if (result.posts.length === 0) {
      setEmptyState(refs.emptyState, true);
    } else {
      renderPostCards(refs.grid, result.posts);
    }

    const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
    currentPage = Math.min(Math.max(1, page), totalPages);

    bindPagination(refs.pagination, {
      page: currentPage,
      totalPages,
      onPrev: () => {
        void loadPostsPage(currentPage - 1);
      },
      onNext: () => {
        void loadPostsPage(currentPage + 1);
      },
    });

    refs.pagination.hidden = totalPages <= 1;
  } catch (err) {
    clearPostsLoading(refs.skeletonHost);
    const message =
      err instanceof Error
        ? err.message
        : "Ocurrió un error inesperado al cargar las publicaciones.";
    setErrorBanner(refs.errorBanner, message);
    setEmptyState(refs.emptyState, false);
    refs.grid.replaceChildren();
  }
}

/**
 * @param {import("./router.js").AppRoute} route
 */
function applyRoute(route) {
  if (route.name === "detail") {
    toggleViews(
      refs.listView,
      refs.detailView,
      refs.detailIdLabel,
      "detail",
      route.postId
    );
    return;
  }

  if (location.hash && !/^#\/?$/i.test(location.hash)) {
    location.hash = "#/";
    return;
  }

  toggleViews(refs.listView, refs.detailView, refs.detailIdLabel, "list", null);
  void loadPostsPage(currentPage);
}

function init() {
  assertRefs();
  startRouter(applyRoute);
}

init();
