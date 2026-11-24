# Aula abierta · Valientes

[Recorrer el salón](https://soytorresllamas.github.io/aula-abierta/) · [Administrar contenidos](https://soytorresllamas.github.io/aula-abierta/admin/)

El salón de primaria en primera persona, la biblioteca y el administrador se sirven desde GitHub Pages. La carpeta `site/` contiene la experiencia completa y la revisión pública del catálogo. El proyector reproduce el video configurado por el editor.

Al guardar desde el administrador, GitHub registra la edición en el repositorio editorial y actualiza aquí el catálogo visible y sus archivos. GitHub Actions publica `site/` con cada actualización de `main`. Puedes ver el estado en [Despliegues de Pages](https://github.com/Soytorresllamas/aula-abierta/actions/workflows/pages.yml).

Para recorrer el salón localmente, ejecuta `python3 -m http.server 8000 --directory site` y abre el puerto 8000 en el navegador.
