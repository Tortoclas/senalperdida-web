# Cómo se escribe un caso de la web (para La Estación y para Claude)

Cada caso son dos archivos con el mismo nombre (el «slug»):

- `herramientas/datos/casos/<slug>.json`: ficha, textos cortos, portada, vídeo, fuentes.
- `herramientas/datos/ampliado/<slug>.json`: la parte larga (pregunta, cronología, versiones, contexto, lo que sabemos, lo que se discute, enseñanza, fuentes con id).

Modelo a copiar: `la-llorona-origen-real-presagio-tenochtitlan-codice-florentino` y `crimen-de-gador-1910-hombre-del-saco-almeria`.

## Reglas de contenido (obligatorias)

1. **Solo se afirma lo que dice una fuente.** Cada frase con un dato (fecha, cifra, nombre, causa) lleva su cita `{n}` al final, con `n` = `id` de una fuente de `ampliado.fuentes`. Si no hay fuente, se quita el dato o se escribe «no consta».
2. **Las discrepancias entre fuentes se enseñan**, no se resuelven: van en `discute` («Si fueron 12 o 14. Una fuente da 12 y otra 14.{1}{2}»).
3. **Atribución cuando hay una sola fuente:** «según…».
4. **Certeza de cada hecho de la cronología:** `documentado`, `atribuido`, `discutido`, `desmentido` o `aceptado`.
5. **Prohibido** escribir «sin pruebas» dentro de `versiones[].estado` (el generador duplica el texto). Usa «no comprobado», «hipótesis no probada», etc.
6. Español de España, frases cortas, tono sobrio. Nada de vocabulario de relleno («fascinante», «cabe destacar»). El caso se cuenta, no se adorna.
7. No se inventan fuentes ni enlaces. Si faltan datos para una sección, se deja más corta antes que rellenarla.
8. Si hay víctimas reales, respeto: sin detalles morbosos que no aporten.

## `casos/<slug>.json` (campos)

| Campo | Qué es |
|---|---|
| `slug` | igual que el nombre del archivo; minúsculas, números y guiones |
| `titulo` | título de la página (el del caso, claro, con el nombre propio) |
| `desc` | descripción para buscadores, 110-160 caracteres |
| `lead` | primer párrafo, 2-3 frases, sin citas |
| `lugar` | «Sitio, época» |
| `cat` | una de: `Crimen`, `Espacio`, `Historia`, `Injusticia`, `Leyendas`, `Lugares malditos`, `Misterio` |
| `corto` | nombre corto para tarjetas |
| `sabemos` | lista de frases (solo si no hay ampliado) |
| `discute` | lista de frases (solo si no hay ampliado) |
| `fuentes` | `[{ "url": "...", "txt": "Título, autor, medio, año" }]` |
| `cap` | pie de las ilustraciones: «Recreaciones generadas con IA. No muestran a ninguna persona real.» |
| `saltoGal` `galClase` `saltoMas` | déjalos en `false`, `""`, `false` |
| `mapa` | `{ "lat": 0.0, "lon": 0.0 }` del lugar principal, si lo hay |

Los siguientes los rellena La Estación, no se escriben a mano: `ogimg`, `publicado`, `modificado`, `orden`, `ordenMapa`, `portada`, `figs`, `vtop`, `video`.

## `ampliado/<slug>.json` (campos)

- `pregunta`: la pregunta que busca la gente, tal como la escribiría.
- `respuesta`: respuesta directa en 2-4 frases, con citas.
- `cronologia`: `[{ "fecha": "1910", "texto": "...{1}", "certeza": "documentado" }]`
- `versiones`: `[{ "version": "...{1}", "quien": "...", "estado": "..." }]`
- `contexto`: lista de párrafos cortos.
- `sabemos`: lista de frases con citas.
- `discute`: lista de frases con citas.
- `ensenanza`: 2-3 frases sobre qué enseña el caso.
- `fuentes`: `[{ "id": 1, "url": "...", "txt": "Título", "autor": "...", "tipo": "prensa|libro|web|enciclopedia|archivo" }]`
- `saberMas` (lista) y `saberMasNota`: libros citados por las fuentes («No los hemos leído directamente.»).
- `notaImagenes`: «Las imágenes de este artículo son recreaciones ilustrativas generadas con inteligencia artificial…»
- `imagenes`: las rellena La Estación (`despues`: `cronologia`, `versiones`, `contexto:N`, `sabemos` o `ensenanza:N`).

## Comandos (los usa La Estación)

```
node herramientas/web-casos.js numeros              # orden y ordenMapa que tocan al caso nuevo
node herramientas/web-casos.js video --slug S --url URL [--titulo T] [--fecha ISO] [--es-documental]
node herramientas/web-casos.js imagen --slug S --origen archivo.jpg --nombre nombre-sin-extension --tipo galeria|cuerpo|portada|compartir
node herramientas/web-casos.js validar --slug S     # revisa campos, citas, fuentes e imágenes
node herramientas/generar.js                        # genera páginas, portada, mapa y sitemap
node herramientas/generar.js --comprobar            # comprueba que lo publicado coincide
```
