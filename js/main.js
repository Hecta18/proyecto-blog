import {
  deletePostById,
  fetchPostById,
  fetchPostsPage,
  updatePostById,
} from "./api.js";
import {
  bindPagination,
  clearPostsLoading,
  mountPostEditForm,
  renderPostCards,
  renderPostDetailRead,
  setDetailPhase,
  setEmptyState,
  setErrorBanner,
  setListDetailVisibility,
  showDetailLoading,
  showPostsLoading,
  showToast,
} from "./ui.js";
import { parseRoute, startRouter } from "./router.js";
import { validatePostTitleBody } from "./validation.js";

const PAGE_SIZE = 10;

const refs = {
  listView: document.getElementById("view-list"),
  detailView: document.getElementById("view-post-detail"),
  detailLoading: document.getElementById("detail-loading"),
  detailError: document.getElementById("detail-error"),
  detailRead: document.getElementById("detail-read"),
  detailEdit: document.getElementById("detail-edit"),
  errorBanner: document.getElementById("posts-error"),
  skeletonHost: document.getElementById("posts-skeleton"),
  emptyState: document.getElementById("posts-empty"),
  grid: document.getElementById("posts-grid"),
  pagination: document.getElementById("posts-pagination"),
  toastRoot: document.getElementById("toast-root"),
};

function detailPanels() {
  return {
    loading: refs.detailLoading,
    error: refs.detailError,
    read: refs.detailRead,
    edit: refs.detailEdit,
  };
}

function assertRefs() {
  for (const [key, el] of Object.entries(refs)) {
    if (!(el instanceof HTMLElement)) {
      throw new Error(`No se encontró el elemento DOM requerido: ${key}`);
    }
  }
}

let currentPage = 1;
/** @type {{ id: number | null; post: object | null }} */
let detailCache = { id: null, post: null };
/** @type {{ setFieldErrors: (e: { title?: string; body?: string }) => void } | null} */
let editFormController = null;
const deletedPostIds = new Set();

function clearEditSurface() {
  refs.detailEdit.replaceChildren();
  editFormController = null;
}

/**
 * @param {number} page
 */
async function loadPostsPage(page) {
  setListDetailVisibility(refs.listView, refs.detailView, "list");
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
      renderPostCards(refs.grid, result.posts, {
        excludeIds: deletedPostIds,
      });
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
 * @param {number} postId
 */
async function handleDeletePost(postId) {
  const ok = window.confirm(
    "¿Eliminar esta publicación? Se enviará una solicitud DELETE a la API."
  );
  if (!ok) {
    return;
  }

  try {
    await deletePostById(postId);
    deletedPostIds.add(postId);
    if (detailCache.id === postId) {
      detailCache = { id: null, post: null };
    }
    showToast(refs.toastRoot, "Publicación eliminada correctamente.", "success");
    location.hash = "#/";
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo eliminar la publicación.";
    showToast(refs.toastRoot, message, "error");
  }
}

/**
 * @param {number} postId
 * @param {{ title: string; body: string }} values
 */
async function handleEditSubmit(postId, values) {
  if (!editFormController) {
    return;
  }

  const validation = validatePostTitleBody(values);
  if (!validation.ok) {
    editFormController.setFieldErrors(validation.errors);
    return;
  }

  editFormController.setFieldErrors({});

  try {
    const updated = await updatePostById(postId, {
      title: values.title.trim(),
      body: values.body.trim(),
    });
    detailCache = { id: postId, post: updated };
    showToast(refs.toastRoot, "Cambios guardados correctamente.", "success");
    location.hash = `#/posts/${postId}`;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudieron guardar los cambios.";
    showToast(refs.toastRoot, message, "error");
  }
}

/**
 * @param {number} postId
 * @param {{ mode: 'read' | 'edit' }} options
 */
async function loadPostDetail(postId, options) {
  setListDetailVisibility(refs.listView, refs.detailView, "detail");
  setErrorBanner(refs.detailError, null);

  const cached = detailCache.id === postId && detailCache.post ? detailCache.post : null;

  if (!cached) {
    setDetailPhase(detailPanels(), "loading");
    clearEditSurface();
    showDetailLoading(refs.detailLoading);
    try {
      const post = await fetchPostById(postId);
      detailCache = { id: postId, post };
    } catch (err) {
      detailCache = { id: null, post: null };
      clearEditSurface();
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo cargar la publicación.";
      setErrorBanner(refs.detailError, message);
      setDetailPhase(detailPanels(), "error");
      return;
    }
  }

  const post = detailCache.post;
  if (!post) {
    setErrorBanner(
      refs.detailError,
      "No hay datos de publicación disponibles. Vuelve al listado e inténtalo de nuevo."
    );
    setDetailPhase(detailPanels(), "error");
    return;
  }

  if (options.mode === "read") {
    clearEditSurface();
    renderPostDetailRead(refs.detailRead, post, {
      onDelete: () => {
        void handleDeletePost(postId);
      },
    });
    setDetailPhase(detailPanels(), "read");
    return;
  }

  clearEditSurface();
  editFormController = mountPostEditForm(refs.detailEdit, post, {
    onSubmit: (values) => {
      void handleEditSubmit(postId, values);
    },
    onCancel: () => {
      location.hash = `#/posts/${postId}`;
    },
  });
  setDetailPhase(detailPanels(), "edit");
}

/**
 * @param {import("./router.js").AppRoute} route
 */
function applyRoute(route) {
  if (route.name === "detail" || route.name === "detailEdit") {
    const mode = route.name === "detailEdit" ? "edit" : "read";
    void loadPostDetail(route.postId, { mode });
    return;
  }

  if (location.hash && !/^#\/?$/i.test(location.hash)) {
    location.hash = "#/";
    return;
  }

  setListDetailVisibility(refs.listView, refs.detailView, "list");
  void loadPostsPage(currentPage);
}

function init() {
  assertRefs();
  startRouter(applyRoute);
}

init();
