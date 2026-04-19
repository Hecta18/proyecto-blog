# proyecto-blog

Blog desarrollado con HTML, CSS y JavaScript (vanilla), consumiendo la API pública [DummyJSON](https://dummyjson.com).

## Estado actual

- **RF-01**: listado paginado de publicaciones (GET), con resumen, autor, enlace a detalle, skeleton y manejo de errores.
- **RF-02**: detalle por ID (GET), al menos seis campos del JSON en pantalla, navegación de vuelta al listado, botones **Editar** y **Eliminar** (DELETE + toast).
- **RF-03**: formulario **Crear publicación** (`#/create`), validación solo en JavaScript con errores inline, POST a `/posts/add` con `userId` resuelto desde el nombre del autor (búsqueda de usuarios DummyJSON), confirmación por toast, formulario limpio y nueva tarjeta al inicio del listado (página 1) sin recargar la página.
- **RF-04**: edición de título y contenido desde `#/posts/:id/edit`, formulario precargado, **validación JS** con las mismas reglas que en creación (`validateEditPostForm` / título y cuerpo), **PATCH** a la API, estado de envío en el formulario, detalle actualizado al volver del guardado y listado coherente (parche en memoria + sustitución de tarjeta si sigue en el DOM).
- **RF-05**: eliminación solo tras **confirmación** en un `<dialog>` modal (no se borra sin aviso), **DELETE** a la API, **retirada inmediata** de la tarjeta en el DOM al tener respuesta OK, mensaje **temporal** de éxito (toast) y vuelta al listado.
- **RF-06**: tres **filtros combinables** en el listado: texto en **título o contenido**, **autor** (usuarios DummyJSON) y **etiqueta** (tags); se aplican en conjunto (AND); paginación sobre el resultado; estado vacío distinto cuando hay filtros activos; carga de opciones desde la API (`/posts/tag-list`, `/users`).
- **RF-07**: **feedback sistemático**: carga con skeleton + spinner y `aria-busy` en el listado; filtros y paginación deshabilitados durante la petición; errores en banner con `aria-live`; detalle con `aria-busy` mientras carga; toasts de éxito/error con región `aria-live` en `#toast-root`; estados vacíos con `role="status"` y textos diferenciados (con/sin filtros o tras borrado).

## Cómo ejecutarlo

Sirve la carpeta del proyecto con cualquier servidor estático (los módulos ES y `fetch` funcionan mejor que abrir el archivo directamente), por ejemplo:

```bash
python -m http.server 8080
```

Luego abre `http://localhost:8080` en el navegador.

## Estructura

```
proyecto-blog/
├── index.html
├── README.md
├── css/
│   ├── main.css
│   ├── components.css
│   └── layout.css
└── js/
    ├── api.js
    ├── ui.js
    ├── validation.js
    ├── router.js
    └── main.js
```
