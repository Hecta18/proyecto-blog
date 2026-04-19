import {
  createPost,
  deletePostById,
  fetchPostById,
  fetchPostsPage,
  fetchPostsPageWithFilters,
  fetchPostTagList,
  fetchUsersForAuthorFilter,
  findUserForAuthorName,
  updatePostById,
} from "./api.js";
import {
  bindPagination,
  clearPostsLoading,
  mountCreatePostForm,
  mountPostEditForm,
  prependPostCard,
  renderPostCards,
  renderPostDetailRead,
  updatePostCardInGrid,
  removePostCardFromGrid,
  confirmPostDeletion,
  setDetailPhase,
  setEmptyState,
  setErrorBanner,
  setEmptyStateCopy,
  setMainPanels,
  showDetailLoading,
  showPostsLoading,
  showToast,
} from "./ui.js";
import { parseRoute, startRouter } from "./router.js";
import { validateCreatePostForm, validateEditPostForm } from "./validation.js";

const PAGE_SIZE = 10;

const EMPTY_LIST_DEFAULT = {
  title: "Sin resultados",
  text: "No hay publicaciones para mostrar en esta página.",
};

const EMPTY_LIST_FILTERED = {
  title: "Sin coincidencias",
  text: "Ninguna publicación cumple los filtros actuales. Prueba otros criterios o pulsa «Limpiar».",
};

const refs = {
  listView: document.getElementById("view-list"),
  detailView: document.getElementById("view-post-detail"),
  createView: document.getElementById("view-create"),
  createRoot: document.getElementById("create-form-root"),
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
  filterForm: document.getElementById("posts-filters"),
  filterSearch: document.getElementById("filter-search"),
  filterAuthor: document.getElementById("filter-author"),
  filterTag: document.getElementById("filter-tag"),
  filterClear: document.getElementById("filter-clear"),
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

/**
 * @returns {{ searchText: string; userId: string; tag: string }}
 */
function getListFiltersFromDom() {
  const search = refs.filterSearch;
  const author = refs.filterAuthor;
  const tag = refs.filterTag;
  return {
    searchText: search instanceof HTMLInputElement ? search.value : "",
    userId: author instanceof HTMLSelectElement ? author.value : "",
    tag: tag instanceof HTMLSelectElement ? tag.value : "",
  };
}

function listFiltersActive() {
  const f = getListFiltersFromDom();
  return Boolean(
    f.searchText.trim() || f.userId.trim() || f.tag.trim()
  );
}

async function initListFilters() {
  if (
    !(refs.filterForm instanceof HTMLFormElement) ||
    !(refs.filterSearch instanceof HTMLInputElement) ||
    !(refs.filterAuthor instanceof HTMLSelectElement) ||
    !(refs.filterTag instanceof HTMLSelectElement) ||
    !(refs.filterClear instanceof HTMLButtonElement)
  ) {
    return;
  }

  try {
    const [tags, users] = await Promise.all([
      fetchPostTagList(),
      fetchUsersForAuthorFilter(),
    ]);

    const sortedTags = [...tags].sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );
    for (const tag of sortedTags) {
      const opt = document.createElement("option");
      opt.value = tag;
      opt.textContent = tag;
      refs.filterTag.appendChild(opt);
    }

    for (const u of users) {
      const opt = document.createElement("option");
      opt.value = String(u.id);
      opt.textContent = u.label;
      refs.filterAuthor.appendChild(opt);
    }
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Error al cargar filtros.";
    showToast(refs.toastRoot, msg, "error");
  }

  refs.filterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    currentPage = 1;
    void loadPostsPage(1);
  });

  refs.filterClear.addEventListener("click", () => {
    refs.filterSearch.value = "";
    refs.filterAuthor.value = "";
    refs.filterTag.value = "";
    currentPage = 1;
    void loadPostsPage(1);
  });
}

let currentPage = 1;
/** @type {{ id: number | null; post: object | null }} */
let detailCache = { id: null, post: null };
/** @type {ReturnType<typeof mountPostEditForm> | null} */
let editFormController = null;
/** @type {ReturnType<typeof mountCreatePostForm> | null} */
let createFormController = null;
const deletedPostIds = new Set();
/** @type {object[]} */
const pendingListPrepends = [];
/** @type {Map<number, { title: string; body: string; authorName: string }>} */
const listDisplayOverrides = new Map();

/**
 * @param {object} post
 */
function withListDisplayOverrides(post) {
  const o = listDisplayOverrides.get(post.id);
  return o ? { ...post, ...o } : post;
}

function clearEditSurface() {
  refs.detailEdit.replaceChildren();
  editFormController = null;
}

function showCreateView() {
  setMainPanels(refs.listView, refs.detailView, refs.createView, "create");
  createFormController = mountCreatePostForm(refs.createRoot, {
    onSubmit: (values) => {
      void handleCreateSubmit(values);
    },
  });
}

/**
 * @param {number} page
 */
async function loadPostsPage(page) {
  setMainPanels(refs.listView, refs.detailView, refs.createView, "list");
  setErrorBanner(refs.errorBanner, null);
  setEmptyState(refs.emptyState, false);
  refs.pagination.hidden = true;

  showPostsLoading(refs.skeletonHost);
  refs.grid.replaceChildren();

  try {
    const useFilters = listFiltersActive();
    const filters = getListFiltersFromDom();

    const result = useFilters
      ? await fetchPostsPageWithFilters(page, PAGE_SIZE, filters)
      : await fetchPostsPage(page, PAGE_SIZE);
    clearPostsLoading(refs.skeletonHost);

    if (result.posts.length === 0) {
      setEmptyState(refs.emptyState, true);
      setEmptyStateCopy(
        refs.emptyState,
        useFilters ? EMPTY_LIST_FILTERED.title : EMPTY_LIST_DEFAULT.title,
        useFilters ? EMPTY_LIST_FILTERED.text : EMPTY_LIST_DEFAULT.text
      );
    } else {
      setEmptyState(refs.emptyState, false);
      setEmptyStateCopy(
        refs.emptyState,
        EMPTY_LIST_DEFAULT.title,
        EMPTY_LIST_DEFAULT.text
      );
      renderPostCards(
        refs.grid,
        result.posts.map(withListDisplayOverrides),
        {
          excludeIds: deletedPostIds,
        }
      );
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

    if (
      currentPage === 1 &&
      pendingListPrepends.length > 0 &&
      !listFiltersActive()
    ) {
      setEmptyState(refs.emptyState, false);
      for (let i = 0; i < pendingListPrepends.length; i += 1) {
        prependPostCard(refs.grid, pendingListPrepends[i]);
      }
      pendingListPrepends.length = 0;
    }
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
  const cached = detailCache.id === postId && detailCache.post ? detailCache.post : null;
  const titleForMessage =
    typeof cached?.title === "string" && cached.title.trim()
      ? cached.title.trim()
      : `publicación #${postId}`;

  const ok = await confirmPostDeletion(titleForMessage);
  if (!ok) {
    return;
  }

  try {
    await deletePostById(postId);
    deletedPostIds.add(postId);
    listDisplayOverrides.delete(postId);
    for (let i = pendingListPrepends.length - 1; i >= 0; i -= 1) {
      if (Number(pendingListPrepends[i]?.id) === postId) {
        pendingListPrepends.splice(i, 1);
      }
    }
    if (detailCache.id === postId) {
      detailCache = { id: null, post: null };
    }

    removePostCardFromGrid(refs.grid, postId);
    if (refs.grid.children.length === 0) {
      setEmptyState(refs.emptyState, true);
    }

    showToast(
      refs.toastRoot,
      "La publicación se eliminó correctamente.",
      "success"
    );
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

  const validation = validateEditPostForm(values);
  if (!validation.ok) {
    editFormController.setFieldErrors(validation.errors);
    return;
  }

  editFormController.setFieldErrors({});
  editFormController.setSubmitting(true);

  try {
    const updated = await updatePostById(postId, {
      title: values.title.trim(),
      body: values.body.trim(),
    });
    detailCache = { id: postId, post: updated };
    listDisplayOverrides.set(postId, {
      title: updated.title,
      body: updated.body,
      authorName: updated.authorName,
    });
    updatePostCardInGrid(refs.grid, {
      id: postId,
      title: updated.title,
      body: updated.body,
      authorName: updated.authorName,
    });
    showToast(refs.toastRoot, "Cambios guardados correctamente.", "success");
    location.hash = `#/posts/${postId}`;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudieron guardar los cambios.";
    showToast(refs.toastRoot, message, "error");
  } finally {
    editFormController.setSubmitting(false);
  }
}

/**
 * @param {{ title: string; body: string; authorName: string }} values
 */
async function handleCreateSubmit(values) {
  if (!createFormController) {
    return;
  }

  const validation = validateCreatePostForm(values);
  if (!validation.ok) {
    createFormController.setFieldErrors(validation.errors);
    return;
  }

  createFormController.setFieldErrors({});
  createFormController.setSubmitting(true);

  try {
    const match = await findUserForAuthorName(values.authorName);
    if (!match) {
      createFormController.setFieldErrors({
        authorName:
          "No encontramos un usuario con ese nombre. Prueba con nombre o apellido que exista en DummyJSON (por ejemplo «Ava Harris»).",
      });
      return;
    }

    const post = await createPost({
      title: values.title.trim(),
      body: values.body.trim(),
      userId: match.userId,
    });

    createFormController.resetForm();
    showToast(
      refs.toastRoot,
      "Publicación creada. Ya aparece al inicio del listado (página 1).",
      "success"
    );

    pendingListPrepends.push(post);
    currentPage = 1;
    location.hash = "#/";
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo crear la publicación.";
    showToast(refs.toastRoot, message, "error");
  } finally {
    createFormController.setSubmitting(false);
  }
}

/**
 * @param {number} postId
 * @param {{ mode: 'read' | 'edit' }} options
 */
async function loadPostDetail(postId, options) {
  setMainPanels(refs.listView, refs.detailView, refs.createView, "detail");
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
    onSubmit: (vals) => {
      void handleEditSubmit(postId, vals);
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

  if (route.name === "create") {
    showCreateView();
    return;
  }

  if (location.hash && !/^#\/?$/i.test(location.hash)) {
    location.hash = "#/";
    return;
  }

  setMainPanels(refs.listView, refs.detailView, refs.createView, "list");
  void loadPostsPage(currentPage);
}

async function init() {
  assertRefs();
  await initListFilters();
  startRouter(applyRoute);
}

void init();
