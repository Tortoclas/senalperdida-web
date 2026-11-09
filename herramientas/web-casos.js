'use strict';
// Utilidades para La Estación: añadir un vídeo a un caso, validar un caso nuevo y calcular los números de orden.
// Sin dependencias. Uso:
//   node herramientas/web-casos.js video   --slug S --url URL [--titulo T] [--fecha ISO] [--es-documental]
//   node herramientas/web-casos.js validar --slug S
//   node herramientas/web-casos.js imagen  --slug S --origen archivo --nombre base --tipo galeria|cuerpo|portada|compartir [--alt T]
//   node herramientas/web-casos.js numeros
// Todo imprime JSON por la salida estándar. Si algo falla: {"error": "..."} y código de salida 1.
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const RAIZ = path.join(__dirname, '..');
const D_CASOS = path.join(__dirname, 'datos', 'casos'), D_AMP = path.join(__dirname, 'datos', 'ampliado');
const CATS = ['Crimen', 'Espacio', 'Historia', 'Injusticia', 'Leyendas', 'Lugares malditos', 'Misterio'];
const CERTEZAS = ['documentado', 'atribuido', 'discutido', 'desmentido', 'aceptado'];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const leer = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const escribir = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 1), 'utf8');   // mismo formato que el resto de archivos
const fCaso = s => path.join(D_CASOS, s + '.json'), fAmp = s => path.join(D_AMP, s + '.json');

// ---- enlace de vídeo -> { plataforma, id?, formato? } ----
function analizarUrl(u) {
  let x; try { x = new URL(String(u).trim()); } catch (e) { throw new Error('Enlace no válido: ' + u); }
  const h = x.hostname.replace(/^(www\.|m\.|vm\.)/, '');
  if (h === 'tiktok.com') return { plataforma: 'tiktok', href: x.origin + x.pathname };
  if (h === 'youtube.com' || h === 'youtu.be') {
    let id = null, formato = 'largo';
    if (h === 'youtu.be') id = x.pathname.slice(1);
    else if (/^\/shorts\//.test(x.pathname)) { id = x.pathname.split('/')[2]; formato = 'short'; }
    else id = x.searchParams.get('v');
    if (!id || !/^[\w-]{6,20}$/.test(id)) throw new Error('No encuentro el identificador del vídeo de YouTube en: ' + u);
    return { plataforma: 'youtube', id, formato, href: formato === 'short' ? 'https://www.youtube.com/shorts/' + id : 'https://www.youtube.com/watch?v=' + id };
  }
  throw new Error('Solo se admiten enlaces de TikTok y YouTube (la web no enseña Instagram ni Facebook).');
}

function anadirVideo(slug, url, o) {
  if (!SLUG.test(slug) || !fs.existsSync(fCaso(slug))) throw new Error('No existe el caso «' + slug + '» en la web');
  const d = leer(fCaso(slug)), v = analizarUrl(url), cambios = [];
  d.vtop = d.vtop || { saltoAntes: false, texto: 'Míralo en vídeo', botones: [] };
  const hay = h => d.vtop.botones.some(b => b.href === h || (v.id && b.href.includes(v.id)));
  if (v.plataforma === 'tiktok') {
    if (!hay(v.href)) { d.vtop.botones.unshift({ href: v.href, boton: 'Ver en TikTok' }); cambios.push('botón TikTok'); }
  } else {
    const esDoc = v.formato === 'largo' && (o.documental || (d.video && d.video.formato === 'largo'));
    if (!d.video) {
      d.video = { formato: v.formato, etiqueta: v.formato === 'short' ? 'Short en YouTube (español)' : (o.documental ? 'Documental en YouTube (español)' : 'Vídeo en YouTube (español)'), id: v.id, titulo: o.titulo || d.titulo, subido: o.fecha || new Date().toISOString() };
      cambios.push('vídeo incrustado');
    } else if (d.video.id === v.id) {
      if (o.titulo) d.video.titulo = o.titulo;
    }
    if (!hay(v.href)) { d.vtop.botones.push({ href: v.href, boton: esDoc ? 'Ver el documental en YouTube' : 'Ver en YouTube' }); cambios.push('botón YouTube'); }
  }
  // solo se escribe si algo cambió
  if (cambios.length) escribir(fCaso(slug), d);
  return { slug, cambios, botones: d.vtop.botones.length, video: d.video ? d.video.id : null };
}

// ---- validación de un caso nuevo (casos + ampliado) ----
function validar(slug) {
  const err = [], avisos = [];
  if (!SLUG.test(slug)) err.push('El slug solo admite minúsculas, números y guiones');
  if (!fs.existsSync(fCaso(slug))) err.push('Falta herramientas/datos/casos/' + slug + '.json');
  if (!fs.existsSync(fAmp(slug))) err.push('Falta herramientas/datos/ampliado/' + slug + '.json');
  if (err.length) return { ok: false, errores: err, avisos };
  let d, A; try { d = leer(fCaso(slug)); A = leer(fAmp(slug)); } catch (e) { return { ok: false, errores: ['JSON no válido: ' + e.message], avisos }; }
  for (const k of ['slug', 'titulo', 'desc', 'lead', 'lugar', 'cat', 'corto', 'ogimg', 'publicado', 'modificado', 'orden', 'ordenMapa', 'portada', 'fuentes']) if (d[k] === undefined || d[k] === '') err.push('Falta el campo «' + k + '» en casos');
  if (d.slug !== slug) err.push('El campo slug no coincide con el nombre del archivo');
  if (d.cat && !CATS.includes(d.cat)) err.push('Categoría no válida: ' + d.cat + ' (válidas: ' + CATS.join(', ') + ')');
  if (((d.tituloSeo || d.titulo || '').length + 16) > 62) avisos.push('El título de la etiqueta <title> pasa de 62 caracteres (Google lo corta): añade tituloSeo de hasta 46');
  if (!d.mapa) avisos.push('Sin coordenadas: el caso no saldrá en el mapa');
  if (d.mapa && !(typeof d.mapa.lat === 'number' && typeof d.mapa.lon === 'number')) err.push('mapa necesita lat y lon numéricos');
  if (typeof d.desc === 'string' && (d.desc.length < 80 || d.desc.length > 200)) avisos.push('La descripción tiene ' + d.desc.length + ' caracteres (mejor entre 110 y 160)');
  for (const k of ['portada', 'ogimg']) if (d[k] && !fs.existsSync(path.join(RAIZ, String(d[k]).replace(/^\//, '')))) err.push('No existe la imagen de «' + k + '»: ' + d[k]);
  for (const k of ['pregunta', 'respuesta', 'cronologia', 'versiones', 'sabemos', 'ensenanza', 'fuentes', 'discute']) if (A[k] === undefined || (Array.isArray(A[k]) && !A[k].length)) err.push('Falta «' + k + '» en ampliado');
  if (A.ensenanza !== undefined && !Array.isArray(A.ensenanza)) err.push('«ensenanza» debe ser una lista de párrafos (no un texto)');
  const ids = new Set((A.fuentes || []).map(f => String(f.id)));
  (A.fuentes || []).forEach(f => { if (!/^https?:\/\//.test(f.url || '')) err.push('La fuente ' + f.id + ' no tiene enlace'); if (!f.txt) err.push('La fuente ' + f.id + ' no tiene texto'); });
  (A.cronologia || []).forEach((x, i) => { const c = String(x.certeza || '').split(',')[0].split(' ')[0].replace(/[^a-z]/g, ''); if (!CERTEZAS.includes(c)) err.push('Cronología ' + (i + 1) + ': certeza «' + x.certeza + '» no válida'); });
  const usadas = new Set(); JSON.stringify(A).replace(/\{(\d+)\}/g, (_, n) => { usadas.add(n); return ''; });
  usadas.forEach(n => { if (!ids.has(n)) err.push('Cita {' + n + '} sin fuente con ese id'); });
  ids.forEach(n => { if (!usadas.has(n)) avisos.push('La fuente ' + n + ' no se cita en ningún sitio'); });
  (A.imagenes || []).forEach(im => { for (const s of ['.jpg', '-640.jpg']) if (!fs.existsSync(path.join(RAIZ, im.src.replace(/^\//, '') + s))) err.push('Falta la imagen ' + im.src + s); });
  return { ok: !err.length, errores: err, avisos };
}


// ---- imágenes: se reescalan con ffmpeg (el mismo que usa La Estación) ----
function medidas(f) {   // ancho y alto de un JPG leyendo su cabecera
  const b = fs.readFileSync(f); let i = 2;
  while (i < b.length - 9) { if (b[i] !== 0xFF) { i++; continue; } const m = b[i + 1]; if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) }; i += 2 + b.readUInt16BE(i + 2); }
  throw new Error('No pude leer las medidas de ' + f);
}
function ffmpeg(args) {
  const exe = process.env.EST_FFMPEG || process.env.FFMPEG || 'ffmpeg';
  const r = spawnSync(exe, ['-y', '-v', 'error'].concat(args), { encoding: 'utf8', timeout: 120000, windowsHide: true });
  if (r.error || r.status !== 0) throw new Error('ffmpeg falló: ' + String((r.error && r.error.message) || r.stderr).slice(0, 300));
}
function imagen(slug, origen, nombre, tipo, alt) {
  if (!SLUG.test(nombre)) throw new Error('Nombre de imagen no válido: ' + nombre);
  if (!fs.existsSync(origen)) throw new Error('No existe la imagen de origen: ' + origen);
  const img = n => path.join(RAIZ, 'img', n);
  fs.mkdirSync(path.join(RAIZ, 'img'), { recursive: true });
  if (tipo === 'portada') { ffmpeg(['-i', origen, '-vf', 'scale=640:800:force_original_aspect_ratio=increase,crop=640:800', '-q:v', '4', img(nombre + '.jpg')]); return { src: '/img/' + nombre + '.jpg' }; }
  if (tipo === 'compartir') { ffmpeg(['-i', origen, '-vf', 'scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630', '-q:v', '4', img(nombre + '.jpg')]); return { src: '/img/' + nombre + '.jpg' }; }
  if (tipo !== 'galeria' && tipo !== 'cuerpo') throw new Error('Tipo de imagen no válido');
  ffmpeg(['-i', origen, '-vf', 'scale=1000:-2', '-q:v', '4', img(nombre + '.jpg')]);
  ffmpeg(['-i', origen, '-vf', 'scale=640:-2', '-q:v', '4', img(nombre + '-640.jpg')]);
  const m = medidas(img(nombre + '.jpg')), base = '/img/' + nombre;
  if (tipo === 'cuerpo') return { src: base, w: m.w, h: m.h };
  return { src: base + '.jpg', srcset: base + '-640.jpg 640w, ' + base + '.jpg 1000w', sizes: '(max-width:560px) 72vw, 220px', alt: alt || '', w: m.w, h: m.h };
}

function numeros() {
  const todos = fs.readdirSync(D_CASOS).filter(f => f.endsWith('.json')).map(f => leer(path.join(D_CASOS, f)));
  return { orden: Math.min(0, ...todos.map(c => c.orden)) - 1, ordenMapa: Math.max(0, ...todos.map(c => c.ordenMapa || 0)) + 1, casos: todos.length, slugs: todos.map(c => c.slug) };
}

function main() {
  const [cmd, ...r] = process.argv.slice(2), a = {};
  for (let i = 0; i < r.length; i++) if (r[i].startsWith('--')) { const k = r[i].slice(2); a[k] = (r[i + 1] === undefined || r[i + 1].startsWith('--')) ? true : r[++i]; }
  try {
    let out;
    if (cmd === 'video') out = anadirVideo(String(a.slug || ''), String(a.url || ''), { titulo: a.titulo, fecha: a.fecha, documental: !!a['es-documental'] });
    else if (cmd === 'imagen') out = imagen(String(a.slug || ''), String(a.origen || ''), String(a.nombre || ''), String(a.tipo || ''), a.alt === true ? '' : a.alt);
    else if (cmd === 'validar') out = validar(String(a.slug || ''));
    else if (cmd === 'numeros') out = numeros();
    else throw new Error('Uso: video | imagen | validar | numeros');
    console.log(JSON.stringify(out)); if (out.ok === false) process.exit(1);
  } catch (e) { console.log(JSON.stringify({ error: e.message })); process.exit(1); }
}
if (require.main === module) main(); else module.exports = { anadirVideo, validar, numeros, analizarUrl, imagen };
