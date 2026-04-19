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
 * @param {{
 *   id: number;
 *   title: string;
 *   body: string;
 *   authorName: string;
 * }} post
 * @returns {HTMLElement}
 */
export function createPostCardElement(post) {
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
  return article;
}

/**
 * @param {HTMLElement} grid
 * @param {Array<{
 *   id: number;
 *   title: string;
 *   body: string;
 *   authorName: string;
 * }>} posts
 * @param {{ excludeIds?: Set<number> }} [options]
 */
export function renderPostCards(grid, posts, options = {}) {
  const excludeIds = options.excludeIds ?? new Set();
  clearElement(grid);
  const fragment = document.createDocumentFragment();

  for (const post of posts) {
    if (excludeIds.has(post.id)) {
      continue;
    }
    fragment.appendChild(createPostCardElement(post));
  }

  grid.appendChild(fragment);
}

/**
 * Inserta una tarjeta al inicio del listado (p. ej. tras POST sin recargar).
 * @param {HTMLElement} grid
 * @param {{
 *   id: number;
 *   title: string;
 *   body: string;
 *   authorName: string;
 * }} post
 */
export function prependPostCard(grid, post) {
  grid.prepend(createPostCardElement(post));
}

/**
 * Actualiza una tarjeta existente en el listado (RF-04: reflejo inmediato).
 * @param {HTMLElement} grid
 * @param {{
 *   id: number;
 *   title: string;
 *   body: string;
 *   authorName: string;
 * }} post
 */
export function updatePostCardInGrid(grid, post) {
  const selector = `[data-post-id="${String(post.id)}"]`;
  const current = grid.querySelector(selector);
  if (current instanceof HTMLElement) {
    current.replaceWith(createPostCardElement(post));
  }
}

/**
 * Quita la tarjeta del listado en el acto (RF-05).
 * @param {HTMLElement} grid
 * @param {number} postId
 */
export function removePostCardFromGrid(grid, postId) {
  const el = grid.querySelector(`[data-post-id="${String(postId)}"]`);
  el?.remove();
}

/** @type {HTMLDialogElement | null} */
let deleteConfirmDialog = null;

/**
 * Diálogo modal de confirmación antes de DELETE (sin eliminar sin aviso).
 * @param {string} postTitle
 * @returns {Promise<boolean>} true si el usuario confirma
 */
export function confirmPostDeletion(postTitle) {
  if (!deleteConfirmDialog) {
    const dialog = document.createElement("dialog");
    dialog.className = "confirm-dialog";
    dialog.setAttribute("aria-labelledby", "confirm-delete-title");

    const form = document.createElement("form");
    form.method = "dialog";
    form.className = "confirm-dialog__form";

    const h2 = document.createElement("h2");
    h2.className = "confirm-dialog__title";
    h2.id = "confirm-delete-title";
    h2.textContent = "Eliminar publicación";

    const p = document.createElement("p");
    p.className = "confirm-dialog__body";
    p.id = "confirm-delete-message";

    const actions = document.createElement("div");
    actions.className = "confirm-dialog__actions";

    const btnCancel = document.createElement("button");
    btnCancel.type = "submit";
    btnCancel.className = "btn btn--ghost";
    btnCancel.value = "cancel";
    btnCancel.textContent = "Cancelar";

    const btnConfirm = document.createElement("button");
    btnConfirm.type = "submit";
    btnConfirm.className = "btn btn--danger";
    btnConfirm.value = "confirm";
    btnConfirm.textContent = "Eliminar";

    actions.append(btnCancel, btnConfirm);
    form.append(h2, p, actions);
    dialog.append(form);
    document.body.appendChild(dialog);
    deleteConfirmDialog = dialog;
  }

  const messageEl = deleteConfirmDialog.querySelector("#confirm-delete-message");
  if (messageEl) {
    messageEl.textContent = `¿Seguro que deseas eliminar «${postTitle}»? Se enviará una solicitud DELETE a la API y la entrada dejará de mostrarse en la aplicación.`;
  }

  return new Promise((resolve) => {
    const dialog = deleteConfirmDialog;
    if (!(dialog instanceof HTMLDialogElement)) {
      resolve(false);
      return;
    }

    const onClose = () => {
      resolve(dialog.returnValue === "confirm");
      dialog.removeEventListener("close", onClose);
    };
    dialog.addEventListener("close", onClose);
    if (!dialog.open) {
      dialog.showModal();
    }
  });
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
    banner.removeAttribute("aria-live");
    return;
  }
  banner.hidden = false;
  banner.textContent = message;
  banner.setAttribute("aria-live", "assertive");
}

/**
 * @param {HTMLElement} emptyState
 * @param {boolean} visible
 */
export function setEmptyState(emptyState, visible) {
  emptyState.hidden = !visible;
  if (visible) {
    emptyState.setAttribute("role", "status");
  } else {
    emptyState.removeAttribute("role");
  }
}

/**
 * @param {HTMLElement} emptyState
 * @param {string} title
 * @param {string} description
 */
export function setEmptyStateCopy(emptyState, title, description) {
  const t = emptyState.querySelector(".empty-state__title");
  const d = emptyState.querySelector(".empty-state__text");
  if (t) {
    t.textContent = title;
  }
  if (d) {
    d.textContent = description;
  }
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
 * Formulario «crear publicación» (solo validación en JS; sin required/minlength en HTML).
 * @param {HTMLElement} root
 * @param {{
 *   onSubmit: (payload: {
 *     title: string;
 *     body: string;
 *     authorName: string;
 *   }) => void;
 * }} handlers
 * @returns {{
 *   setFieldErrors: (errors: {
 *     title?: string;
 *     body?: string;
 *     authorName?: string;
 *   }) => void;
 *   resetForm: () => void;
 *   setSubmitting: (busy: boolean) => void;
 * }}
 */
export function mountCreatePostForm(root, handlers) {
  clearElement(root);

  const head = document.createElement("div");
  head.className = "section-head";
  const h1 = document.createElement("h1");
  h1.className = "section-title";
  h1.id = "titulo-crear";
  h1.textContent = "Crear publicación";
  const lead = document.createElement("p");
  lead.className = "section-lead";
  lead.textContent =
    "Los datos se envían a DummyJSON mediante POST. El autor debe coincidir con un usuario de la API (prueba nombre o apellido, p. ej. «Ava Harris»).";
  head.append(h1, lead);

  const form = document.createElement("form");
  form.className = "stack-form";
  form.noValidate = true;

  const titleWrap = document.createElement("div");
  titleWrap.className = "field";
  const titleLabel = document.createElement("label");
  titleLabel.htmlFor = "create-post-title";
  titleLabel.textContent = "Título";
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.id = "create-post-title";
  titleInput.name = "title";
  titleInput.autocomplete = "off";
  const titleError = document.createElement("p");
  titleError.className = "field-error";
  titleError.hidden = true;
  titleWrap.append(titleLabel, titleInput, titleError);

  const bodyWrap = document.createElement("div");
  bodyWrap.className = "field";
  const bodyLabel = document.createElement("label");
  bodyLabel.htmlFor = "create-post-body";
  bodyLabel.textContent = "Contenido";
  const bodyInput = document.createElement("textarea");
  bodyInput.id = "create-post-body";
  bodyInput.name = "body";
  bodyInput.rows = 10;
  bodyInput.autocomplete = "off";
  const bodyError = document.createElement("p");
  bodyError.className = "field-error";
  bodyError.hidden = true;
  bodyWrap.append(bodyLabel, bodyInput, bodyError);

  const authorWrap = document.createElement("div");
  authorWrap.className = "field";
  const authorLabel = document.createElement("label");
  authorLabel.htmlFor = "create-post-author";
  authorLabel.textContent = "Nombre del autor";
  const authorInput = document.createElement("input");
  authorInput.type = "text";
  authorInput.id = "create-post-author";
  authorInput.name = "authorName";
  authorInput.autocomplete = "name";
  const authorHint = document.createElement("p");
  authorHint.className = "field-hint";
  authorHint.textContent =
    "Se busca en la base de usuarios de DummyJSON; si hay varias coincidencias se usa la más cercana al texto.";
  const authorError = document.createElement("p");
  authorError.className = "field-error";
  authorError.hidden = true;
  authorWrap.append(authorLabel, authorInput, authorHint, authorError);

  const actions = document.createElement("div");
  actions.className = "form-actions";
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn btn--primary";
  submit.textContent = "Publicar";

  actions.appendChild(submit);
  form.append(titleWrap, bodyWrap, authorWrap, actions);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    handlers.onSubmit({
      title: titleInput.value,
      body: bodyInput.value,
      authorName: authorInput.value,
    });
  });

  root.append(head, form);

  const setFieldErrors = (errors) => {
    const apply = (el, msg) => {
      if (msg) {
        el.textContent = msg;
        el.hidden = false;
      } else {
        el.textContent = "";
        el.hidden = true;
      }
    };
    apply(titleError, errors.title);
    apply(bodyError, errors.body);
    apply(authorError, errors.authorName);
  };

  return {
    setFieldErrors,
    resetForm() {
      titleInput.value = "";
      bodyInput.value = "";
      authorInput.value = "";
      setFieldErrors({});
    },
    setSubmitting(busy) {
      submit.disabled = busy;
      titleInput.disabled = busy;
      bodyInput.disabled = busy;
      authorInput.disabled = busy;
      const shell = root.closest("#view-create");
      if (shell instanceof HTMLElement) {
        shell.setAttribute("aria-busy", busy ? "true" : "false");
      }
    },
  };
}

/**
 * Listado: indicadores de carga accesibles y bloqueo de filtros/paginación (RF-07).
 * @param {object} opts
 * @param {HTMLElement} opts.listView
 * @param {HTMLElement} opts.skeletonHost
 * @param {HTMLElement | null} [opts.filterForm]
 * @param {HTMLElement | null} [opts.paginationNav]
 * @param {boolean} opts.loading
 */
export function setListLoadingState(opts) {
  const { listView, skeletonHost, filterForm, paginationNav, loading } = opts;

  listView.classList.toggle("view--loading", loading);
  listView.setAttribute("aria-busy", loading ? "true" : "false");
  skeletonHost.setAttribute("aria-hidden", loading ? "false" : "true");

  if (filterForm instanceof HTMLFormElement) {
    filterForm.classList.toggle("filters-bar--loading", loading);
    filterForm.querySelectorAll("input, select, button").forEach((el) => {
      if (el instanceof HTMLElement) {
        el.disabled = loading;
      }
    });
  }

  if (loading && paginationNav instanceof HTMLElement) {
    paginationNav.querySelectorAll("button").forEach((btn) => {
      if (btn instanceof HTMLButtonElement) {
        btn.disabled = true;
      }
    });
  }
}

/**
 * @param {HTMLElement} detailView
 * @param {boolean} busy
 */
export function setDetailShellBusy(detailView, busy) {
  detailView.setAttribute("aria-busy", busy ? "true" : "false");
  detailView.classList.toggle("view--detail-loading", busy);
}

/**
 * @param {HTMLElement} listView
 * @param {HTMLElement} detailView
 * @param {HTMLElement} createView
 * @param {'list' | 'detail' | 'create'} mode
 */
export function setMainPanels(listView, detailView, createView, mode) {
  listView.hidden = mode !== "list";
  detailView.hidden = mode !== "detail";
  createView.hidden = mode !== "create";
}

/**
 * @param {{
 *   loading: HTMLElement;
 *   error: HTMLElement;
 *   read: HTMLElement;
 *   edit: HTMLElement;
 * }} panels
 * @param {'loading' | 'error' | 'read' | 'edit'} phase
 */
export function setDetailPhase(panels, phase) {
  panels.loading.hidden = phase !== "loading";
  panels.error.hidden = phase !== "error";
  panels.read.hidden = phase !== "read";
  panels.edit.hidden = phase !== "edit";
}

/**
 * @param {HTMLElement} panel
 */
export function showDetailLoading(panel) {
  clearElement(panel);
  const bar = document.createElement("div");
  bar.className = "loading-bar";
  bar.setAttribute("role", "status");
  bar.setAttribute("aria-live", "polite");
  bar.innerHTML =
    '<span class="spinner" aria-hidden="true"></span><span>Cargando publicación…</span>';
  panel.appendChild(bar);
}

/**
 * @param {HTMLElement} root
 * @param {object} post
 * @param {{ onDelete: () => void }} handlers
 */
export function renderPostDetailRead(root, post, handlers) {
  clearElement(root);

  const header = document.createElement("header");
  header.className = "detail-header";

  const title = document.createElement("h1");
  title.className = "detail-title";
  title.id = "detail-post-title";
  title.textContent = post.title;

  const actions = document.createElement("div");
  actions.className = "detail-actions";

  const editLink = document.createElement("a");
  editLink.className = "btn btn--ghost";
  editLink.href = `#/posts/${post.id}/edit`;
  editLink.textContent = "Editar";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn btn--danger";
  deleteBtn.textContent = "Eliminar";
  deleteBtn.addEventListener("click", handlers.onDelete);

  actions.append(editLink, deleteBtn);
  header.append(title, actions);

  const dl = document.createElement("dl");
  dl.className = "detail-meta";

  const rows = [
    ["Identificador", String(post.id)],
    ["Autor", post.authorName ?? "—"],
    ["ID de usuario (userId)", String(post.userId ?? "—")],
    ["Vistas", String(post.views ?? "—")],
    ["Me gusta", String(post.reactions?.likes ?? "—")],
    ["No me gusta", String(post.reactions?.dislikes ?? "—")],
  ];

  for (const [term, def] of rows) {
    const dt = document.createElement("dt");
    dt.textContent = term;
    const dd = document.createElement("dd");
    dd.textContent = def;
    dl.append(dt, dd);
  }

  const tagsTitle = document.createElement("dt");
  tagsTitle.textContent = "Etiquetas (tags)";
  const tagsDd = document.createElement("dd");
  tagsDd.className = "detail-tags";
  const tags = Array.isArray(post.tags) ? post.tags : [];
  if (tags.length === 0) {
    tagsDd.textContent = "Sin etiquetas";
  } else {
    const list = document.createElement("ul");
    list.className = "tag-list";
    for (const tag of tags) {
      const li = document.createElement("li");
      const pill = document.createElement("span");
      pill.className = "tag-pill";
      pill.textContent = String(tag);
      li.appendChild(pill);
      list.appendChild(li);
    }
    tagsDd.appendChild(list);
  }
  dl.append(tagsTitle, tagsDd);

  const bodyLabel = document.createElement("h2");
  bodyLabel.className = "detail-body-label";
  bodyLabel.textContent = "Contenido";

  const body = document.createElement("div");
  body.className = "detail-body";
  const paragraphs = String(post.body ?? "").split(/\n+/);
  for (const chunk of paragraphs) {
    if (!chunk.trim()) {
      continue;
    }
    const p = document.createElement("p");
    p.textContent = chunk.trim();
    body.appendChild(p);
  }

  root.append(header, dl, bodyLabel, body);
}

/**
 * @param {HTMLElement} root
 * @param {object} post
 * @param {{
 *   onSubmit: (payload: { title: string; body: string }) => void;
 *   onCancel: () => void;
 * }} handlers
 * @returns {{
 *   getValues: () => { title: string; body: string };
 *   setFieldErrors: (errors: { title?: string; body?: string }) => void;
 *   setSubmitting: (busy: boolean) => void;
 * }}
 */
export function mountPostEditForm(root, post, handlers) {
  clearElement(root);

  const head = document.createElement("div");
  head.className = "section-head";
  const h2 = document.createElement("h2");
  h2.className = "section-title";
  h2.textContent = "Editar publicación";
  const lead = document.createElement("p");
  lead.className = "section-lead";
  const back = document.createElement("a");
  back.className = "back-link";
  back.href = `#/posts/${post.id}`;
  back.textContent = "← Volver al detalle";
  lead.appendChild(back);
  head.append(h2, lead);

  const form = document.createElement("form");
  form.className = "stack-form";
  form.noValidate = true;

  const titleWrap = document.createElement("div");
  titleWrap.className = "field";
  const titleLabel = document.createElement("label");
  titleLabel.htmlFor = "edit-post-title";
  titleLabel.textContent = "Título";
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.id = "edit-post-title";
  titleInput.name = "title";
  titleInput.value = post.title ?? "";
  const titleError = document.createElement("p");
  titleError.className = "field-error";
  titleError.id = "edit-post-title-error";
  titleError.hidden = true;
  titleWrap.append(titleLabel, titleInput, titleError);

  const bodyWrap = document.createElement("div");
  bodyWrap.className = "field";
  const bodyLabel = document.createElement("label");
  bodyLabel.htmlFor = "edit-post-body";
  bodyLabel.textContent = "Contenido";
  const bodyInput = document.createElement("textarea");
  bodyInput.id = "edit-post-body";
  bodyInput.name = "body";
  bodyInput.rows = 8;
  bodyInput.value = post.body ?? "";
  const bodyError = document.createElement("p");
  bodyError.className = "field-error";
  bodyError.id = "edit-post-body-error";
  bodyError.hidden = true;
  bodyWrap.append(bodyLabel, bodyInput, bodyError);

  const actions = document.createElement("div");
  actions.className = "form-actions";
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn btn--primary";
  submit.textContent = "Guardar cambios";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "btn btn--ghost";
  cancel.textContent = "Cancelar";
  cancel.addEventListener("click", handlers.onCancel);
  actions.append(submit, cancel);

  form.append(titleWrap, bodyWrap, actions);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    handlers.onSubmit({
      title: titleInput.value,
      body: bodyInput.value,
    });
  });

  root.append(head, form);

  return {
    getValues() {
      return { title: titleInput.value, body: bodyInput.value };
    },
    setFieldErrors(errors) {
      const setErr = (el, msg) => {
        if (msg) {
          el.textContent = msg;
          el.hidden = false;
        } else {
          el.textContent = "";
          el.hidden = true;
        }
      };
      setErr(titleError, errors.title);
      setErr(bodyError, errors.body);
    },
    setSubmitting(busy) {
      submit.disabled = busy;
      titleInput.disabled = busy;
      bodyInput.disabled = busy;
      cancel.disabled = busy;
      const shell = root.closest("#view-post-detail");
      if (shell instanceof HTMLElement) {
        shell.setAttribute("aria-busy", busy ? "true" : "false");
      }
    },
  };
}

/**
 * @param {HTMLElement | null} root
 * @param {string} message
 * @param {'success' | 'error'} [variant]
 */
export function showToast(root, message, variant = "success") {
  const host =
    root instanceof HTMLElement ? root : document.getElementById("toast-root");
  if (!(host instanceof HTMLElement)) {
    return;
  }

  const toast = document.createElement("p");
  toast.className = `toast toast--${variant}`;
  toast.setAttribute("role", "status");
  toast.textContent = message;
  host.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 4500);
}
