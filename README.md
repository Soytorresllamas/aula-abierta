# Aula abierta · Valientes

[Recorrer el salón](https://soytorresllamas.github.io/aula-abierta/)

Esta es la publicación en GitHub Pages del salón de primaria en primera persona. Los contenidos de la biblioteca, las muestras, la banca y el proyector se consultan en el catálogo público al abrir el aula. La cuenta propietaria puede modificarlos desde el [administrador](https://aula-abierta-valientes.torresllamas.chatgpt.site/admin/).

Para compilar esta versión, ejecuta `node build.mjs` con Node.js 22 o posterior. El script descarga los archivos públicos de la escena, verifica sus huellas SHA-256 con `release.json` y genera `_site/`. GitHub Actions publica ese directorio al actualizar la rama `main`.
