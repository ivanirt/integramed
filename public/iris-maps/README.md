# Mapas de iris

El módulo Diagnóstico del iris carga estos archivos en el navegador. Cambiar un mapa no exige tocar código: se sustituye el SVG y, si hace falta, una línea del manifiesto.

## Cómo actualizar un mapa

1. Exporta el SVG desde el Iris Map Builder (Inkscape).
2. Copia el archivo en esta carpeta, por ejemplo `ojo_derecho_v8.svg`.
3. Edita `manifest.json` y apunta `eyes.right.file` (o `eyes.left.file`) al archivo nuevo. `displayName` y `version` son opcionales y solo se muestran en pantalla.
4. Recarga la app. No hace falta un build por cada mapa: la página pide el SVG y lee las regiones del propio archivo.

`region-info.json` es opcional. La clave es el `data-organ` en minúsculas, sin acentos. Si no hay entrada, la app muestra el nombre del SVG. Puedes añadir `en` y `note` sin cambiar código.

Los nombres `right` y `left` del manifiesto son el ojo. La ruta del archivo tiene que quedarse dentro de esta carpeta (sin `..` ni URLs).

## Qué espera el lector hoy

El adaptador está en `src/lib/iris-map.ts`. Tolera atributos de más y capas que no conoce. Para que el clic y el ajuste sigan funcionando, conviene mantener esto:

- Regiones dentro de grupos `<g>` con `data-organ`. Lo habitual es el grupo `id="g_regiones"`.
- `data-kind` (`organ`, `ring` o `band`), `data-region`, `data-angle-start`, `data-angle-end`, `data-r-min`, `data-r-max`.
- `data-inferred="1"` solo donde la posición no se leyó del gráfico. Si el atributo no está, la zona no se marca como inferida.
- El nombre que ve la clínica es `data-organ`, no el texto de las etiquetas.
- Un círculo de pupila (`class="pupil"` o `id="pupila"`) y aros `class="ring"`. De ahí salen el centro, el radio pupilar y el radio exterior. Si faltan, el ajuste avisa y usa el viewBox.
- Las etiquetas integradas viven en capas `g_etiquetas*`, `g_et_*` o `g_leyenda` (o cuyo nombre de capa diga etiqueta, leyenda o título). La app las oculta y ofrece un interruptor. Los números de las horas se dejan visibles porque ayudan a girar el mapa.

## Detalles frágiles del SVG actual

- Las zonas clicables usan `class="region"` con `fill-opacity: 0`. Las clases `.zona` y `.zona-inferida` están en el CSS pero los trazos no las usan. Lo inferido se lee de `data-inferred`, no de la clase.
- Algunos `data-r-min` y `data-r-max` son iguales (anillos, y también ESTOMAGO). La forma real es el `path`, a veces con huecos `evenodd`. El clic usa ese relleno, no los radios.
- El mismo `data-organ` puede repetirse (MES, SISTEMA NERVIOSO AUTONOMO). La lista agrupa por ese nombre y resalta todas las partes.
- El id de la capa de las horas no es estable (`g197` en estas exportaciones). No lo uses como contrato.
- El ojo izquierdo de muestra no trae `data-inferred`, aunque alguna capa diga que la posición se tomó del espejo.
- Hay un rectángulo blanco `#fondo` del tamaño del viewBox. La app lo oculta para que se vea la foto.
- El estirado radial asume que el gráfico está centrado en ese círculo pupilar. El texto de las etiquetas usa `translate(x y) rotate(ángulo)`.
