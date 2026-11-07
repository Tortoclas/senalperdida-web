'use strict';
// Genera las páginas de caso (casos/<slug>/index.html) a partir de herramientas/datos/casos/<slug>.json.
// Uso: node herramientas/generar.js [--comprobar]   (--comprobar compara con lo publicado y no escribe nada)
const fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..'), DATOS = path.join(__dirname, 'datos', 'casos');
const SITIO = 'https://senalperdidaoficial.com', PIE = fs.readFileSync(path.join(__dirname, 'plantilla-pie.html'), 'utf8');
const ea = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ET = { 'Crimen': 1, 'Espacio': 1, 'Historia': 1, 'Injusticia': 1, 'Leyendas': 1, 'Lugares malditos': 1, 'Misterio': 1 };
const enc = encodeURIComponent;
// mismo formato que el resto de la web: ", " entre elementos y ": " en los objetos, con tildes tal cual
const J = o => Array.isArray(o) ? '[' + o.map(J).join(', ') + ']' : o && typeof o === 'object' ? '{' + Object.keys(o).map(k => JSON.stringify(k) + ': ' + J(o[k])).join(', ') + '}' : JSON.stringify(o);
const AMP = path.join(__dirname, 'datos', 'ampliado');
function conAmp(d) { const f = path.join(AMP, d.slug + '.json'); if (fs.existsSync(f)) d.amp = JSON.parse(fs.readFileSync(f, 'utf8')); return d; }
const cit = t => String(t).replace(/\{(\d+)\}/g, '<sup class="n"><a href="#f$1" aria-label="Fuente $1">[$1]</a></sup>');
const CZ = { documentado: 'Documentado', atribuido: 'Atribuido', discutido: 'Discutido', desmentido: 'Desmentido', aceptado: 'Aceptado' };
const czTxt = e => { const k = String(e).split(',')[0].split(' ')[0].replace(/[^a-z]/g, ''); return `<span class="cz ${CZ[k] ? k : 'atribuido'}">${CZ[k] || e}</span>`; };
function cargar() {
  return fs.readdirSync(DATOS).filter(x => x.endsWith('.json')).map(f => conAmp(JSON.parse(fs.readFileSync(path.join(DATOS, f), 'utf8')))).sort((a, b) => a.orden - b.orden);
}
const tarjeta = (d, o) => { o = o || {}; return `<a class="card pc${o.dest ? ' dest' : ''}" data-cat="${d.cat}" href="/casos/${d.slug}/"><div class="ph"><img src="${d.portada}" alt="" width="640" height="800" loading="${o.dest ? 'eager' : 'lazy'}"><span class="chip" data-cat="${d.cat}">${d.cat}</span></div><div class="cb">${o.dest ? '<span class="etq">Último caso</span>' : ''}<span class="eyebrow">${d.lugar}</span><h3>${ea(d.titulo)}</h3><p>${ea(d.desc)}</p></div></a>`; };
// Más casos: los de la misma etiqueta primero y luego el resto en el orden de la portada, cuatro en total
function masCasos(d, todos) {
  const otros = todos.filter(x => x.slug !== d.slug);
  return '<div class="grid" style="margin-bottom:0">' + otros.filter(x => x.cat === d.cat).concat(otros.filter(x => x.cat !== d.cat)).slice(0, 4).map(x => tarjeta(x)).join('') + '</div>';
}
// Imágenes entre secciones: A.imagenes = [{ despues: 'cronologia' | 'versiones' | 'contexto:N' | 'sabemos' | 'ensenanza:N', src, alt, pie, w, h }]
const figAmp = (A, clave) => (A.imagenes || []).filter(i => i.despues === clave).map(i => `<figure class="ft"><img src="${i.src}.jpg" srcset="${i.src}-640.jpg 640w, ${i.src}.jpg 1000w" sizes="(max-width:560px) 90vw, 340px" alt="${ea(i.alt)}" width="${i.w}" height="${i.h}" loading="lazy"><figcaption>${ea(i.pie)}</figcaption></figure>`).join('');
function ampPrevio(A, c) {
  let h = '';
  if (A.cronologia) h += '<h2>Cronología</h2><ol class="tl cr">' + A.cronologia.map(x => `<li><b>${ea(x.fecha)}</b>${czTxt(x.certeza)}${c(x.texto)}</li>`).join('') + '</ol>' + figAmp(A, 'cronologia');
  if (A.versiones) h += '<h2>Qué se dijo y qué se sabe</h2><table class="ver"><thead><tr><th>Versión</th><th>Quién la sostuvo</th><th>Estado</th></tr></thead><tbody>' + A.versiones.map(x => `<tr><td>${c(x.version)}</td><td>${c(x.quien)}</td><td>${czTxt(x.estado)}${/,/.test(x.estado) ? ea(x.estado.split(',').slice(1).join(',').trim()) : ''}</td></tr>`).join('') + '</tbody></table><p class="metodo">Cómo usamos estas etiquetas: <a href="/metodologia/">método y niveles de certeza</a>.</p>' + figAmp(A, 'versiones');
  if (A.contexto) h += '<h2>Contexto</h2>' + A.contexto.map((x, i) => `<p>${c(x)}</p>` + figAmp(A, 'contexto:' + i)).join('');
  return h;
}
function ampLeccion(A, c) { return A.ensenanza ? '<h2>Qué dejó este caso</h2>' + A.ensenanza.map((x, i) => `<p>${c(x)}</p>` + figAmp(A, 'ensenanza:' + i)).join('') : ''; }
function ampFuentes(d, A) {
  const url = `${SITIO}/casos/${d.slug}/`, anio = (d.modificado || '').slice(0, 4);
  let h = '<h2>Fuentes</h2><ol class="src nf">' + A.fuentes.map(x => `<li id="f${x.id}"><a href="${ea(x.url)}" rel="noopener nofollow" target="_blank">${ea(x.txt)}</a> — ${ea(x.autor)}<span class="tp">${ea(x.tipo)}</span></li>`).join('') + '</ol>';
  if (A.saberMas) h += '<h2>Para saber más</h2><ul class="src">' + A.saberMas.map(x => `<li>${ea(x)}</li>`).join('') + '</ul>' + (A.saberMasNota ? `<p class="note">${ea(A.saberMasNota)}</p>` : '');
  h += `<h2>Cómo citar este caso</h2><p class="citar">Señal Perdida. «${ea(d.titulo)}». ${anio}. ${url}</p>`;
  return h;
}
function pagina(d, todos) {
  const A = d.amp || null, c = A ? cit : x => x;
  const url = `${SITIO}/casos/${d.slug}/`, tit = `${d.titulo} | Señal Perdida`, og = SITIO + d.ogimg;
  const ld1 = { '@context': 'https://schema.org', '@type': 'Article', headline: d.titulo, description: d.desc, inLanguage: 'es', datePublished: d.publicado, dateModified: d.modificado, mainEntityOfPage: url, author: { '@type': 'Organization', name: 'Señal Perdida' }, publisher: { '@type': 'Organization', name: 'Señal Perdida', logo: { '@type': 'ImageObject', url: SITIO + '/logo-senal-perdida.jpg' } }, image: [og] };
  const ld2 = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Inicio', item: SITIO + '/' }, { '@type': 'ListItem', position: 2, name: d.corto, item: url }] };
  let ld3 = '';
  if (d.video) ld3 = '<script type="application/ld+json">' + J({ '@context': 'https://schema.org', '@type': 'VideoObject', name: d.titulo, description: d.desc, thumbnailUrl: `https://i.ytimg.com/vi/${d.video.id}/hqdefault.jpg`, uploadDate: d.video.subido, embedUrl: `https://www.youtube.com/embed/${d.video.id}`, inLanguage: 'es' }) + '</script>';
  const head = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${ea(tit)}</title><meta name="description" content="${ea(d.desc)}">
<link rel="canonical" href="${url}"><meta name="theme-color" content="#0b0a09"><meta name="msvalidate.01" content="BB1B9C266BFA8BF7F61E3652DF26095C">
<link rel="icon" href="/favicon.png" type="image/png"><link rel="stylesheet" href="/estilo.css?v=bus24a3">${A ? '<link rel="stylesheet" href="/ampliado.css?v=2">' : ''}
<meta property="og:site_name" content="Señal Perdida"><meta property="og:type" content="article"><meta property="og:locale" content="es_ES">
<meta property="og:title" content="${ea(tit)}"><meta property="og:description" content="${ea(d.desc)}"><meta property="og:url" content="${url}">
<meta property="og:image" content="${og}"><meta name="robots" content="index,follow,max-image-preview:large"><meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${J(ld1)}</script><script type="application/ld+json">${J(ld2)}</script>${ld3}</head><body>
<a class="skip" href="#main">Saltar al contenido</a>
<header class="site"><div class="wrap wide"><a class="brand" href="/"><img src="/logo-television-transparente.png" alt="" width="54" height="57"><span>Señal Perdida</span></a>
<nav><a href="/#casos">Casos</a><a href="/mapa/">Mapa</a><a href="/sobre/">Más sobre SP</a></nav></div></header>
`;
  const figs = d.figs.map(f => `<figure><img src="${f.src}" srcset="${f.srcset}" sizes="${f.sizes}" alt="${ea(f.alt)}" width="${f.w}" height="${f.h}" loading="lazy"></figure>`).join('');
  const nf = (A ? A.fuentes : d.fuentes).length;
  const vtop = d.vtop ? `${d.vtop.saltoAntes ? '\n' : ''}<div class="vtop"><span>${d.vtop.texto}</span>${d.vtop.botones.map(b => `<a class="btn" href="${b.href}" rel="noopener" target="_blank">${b.boton}</a>`).join('')}</div>\n` : '';
  const vid = d.video ? `<section class="vid"><h2>El vídeo</h2><div class="vids"><div class="vf${d.video.formato === 'short' ? ' short' : ''}"><p class="lbl">${d.video.etiqueta}</p><iframe class="${d.video.formato === 'short' ? 's' : 'l'}" src="https://www.youtube-nocookie.com/embed/${d.video.id}" title="${ea(d.video.titulo)}" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div></div></section>\n` : '\n';
  const t1 = enc(d.titulo), u1 = enc(url);
  const share = `<section class="share" aria-label="Compartir este caso"><h2>Compartir</h2><div class="btns" style="justify-content:flex-start"><a class="btn" href="https://wa.me/?text=${t1}%20${u1}" target="_blank" rel="noopener nofollow">WhatsApp</a><a class="btn" href="https://t.me/share/url?url=${u1}&text=${t1}" target="_blank" rel="noopener nofollow">Telegram</a><a class="btn" href="https://twitter.com/intent/tweet?url=${u1}&text=${t1}" target="_blank" rel="noopener nofollow">X</a><a class="btn" href="https://www.facebook.com/sharer/sharer.php?u=${u1}" target="_blank" rel="noopener nofollow">Facebook</a><a class="btn" href="https://www.reddit.com/submit?url=${u1}&title=${t1}" target="_blank" rel="noopener nofollow">Reddit</a><a class="btn" href="mailto:?subject=${t1}&body=${u1}" target="_blank" rel="noopener nofollow">Correo</a><button type="button" class="btn" data-copy="${url}">Copiar enlace</button><button type="button" class="btn" data-nat hidden>Más…</button></div></section></article>${d.saltoMas ? '\n' : ''}`;
  const cuerpo = `<main id="main" class="wrap read"><div class="crumbs"><a href="/">Inicio</a> › ${d.corto}</div>
<article><div class="meta"><span class="eyebrow">${d.lugar}</span><span class="chip" data-cat="${d.cat}">${d.cat}</span></div><h1>${ea(d.titulo)}</h1>
<p class="metodo">Por <a href="/sobre/">Señal Perdida</a> · Actualizado el ${String(d.modificado).slice(0, 10).split('-').reverse().join('/')} · <a href="/metodologia/">Cómo verificamos los casos</a></p>
<p class="lead">${d.lead}</p>
${A ? `<aside class="resp"><h2>${ea(A.pregunta)}</h2><p>${c(A.respuesta)}</p></aside>\n` : ''}${vtop}<div class="ficha"><div><b>Lugar y época</b>${d.lugar}</div><div><b>Categoría</b>${d.cat}</div><div><b>Fuentes</b>${nf} enlazada${nf === 1 ? '' : 's'}</div></div>
${d.saltoGal ? '\n' : ''}<div class="gal${d.galClase}">${figs}</div><p class="cap">${d.cap}</p>
${A ? ampPrevio(A, c) : ''}<h2>Lo que sabemos</h2><ol class="tl">${(A && A.sabemos || d.sabemos).map(x => `<li>${c(x)}</li>`).join('')}</ol>${A ? figAmp(A, 'sabemos') : ''}
<h2>Lo que se discute</h2><div class="box"><ul>${(A && A.discute || d.discute).map(x => `<li>${c(x)}</li>`).join('')}</ul></div>
${A ? ampLeccion(A, c) : ''}${vid}<div class="cta"><p><strong>¿Te ha dejado con ganas de más?</strong></p><p>Cada semana, una historia oscura en vídeo.</p>
<div class="btns"><a class="btn" href="https://www.tiktok.com/@senalperdida_oficial" rel="noopener">TikTok</a><a class="btn" href="https://www.youtube.com/@Se%C3%B1alPerdidasecretos" rel="noopener">YouTube</a></div></div>
${A ? ampFuentes(d, A) + (A.notaImagenes ? `<p class="metodo">${ea(A.notaImagenes)}</p>` : '') : `<h2>Fuentes</h2><ul class="src">${d.fuentes.map(x => `<li><a href="${ea(x.url)}" rel="noopener nofollow" target="_blank">${ea(x.txt)}</a></li>`).join('')}</ul>`}
${share}<h2>Más casos</h2>${todos ? masCasos(d, todos) : d.masRaw}`;
  return head + cuerpo + PIE;
}
// Portada: solo se sustituye la rejilla de tarjetas; el resto de index.html se deja como está
function portada(todos) {
  const f = path.join(RAIZ, 'index.html'), h = fs.readFileSync(f, 'utf8'), a = h.indexOf('<div class="grid">'), b = h.indexOf('</div><p id="nada"');
  if (a < 0 || b < 0) throw new Error('No encuentro la rejilla de la portada');
  return h.slice(0, a) + '<div class="grid">' + todos.map((d, i) => tarjeta(d, { dest: i === 0 })).join('') + h.slice(b);
}
// Mapa: los puntos que ya existen no se tocan; se añaden los casos nuevos (con d.mapa = {lat, lon} o {x, y}) y se regenera «Todos los casos»
const proy = (lat, lon) => [+(2.68 * lon + 501.4).toFixed(1), +(-3.175 * lat + 416).toFixed(1)];   // ajustada con los casos actuales (error de unos pocos px)
function mapa(todos) {
  const f = path.join(RAIZ, 'mapa', 'index.html'); let h = fs.readFileSync(f, 'utf8');
  const hay = new Set([...h.matchAll(/<a class="pt[^"]*" href="\/casos\/(.*?)\/"/g)].map(m => m[1]));
  const nuevos = todos.filter(d => !hay.has(d.slug));
  let n = hay.size;
  const pts = nuevos.map(d => {
    if (!d.mapa) throw new Error('Falta d.mapa (lat/lon o x/y) en el caso ' + d.slug);
    const [x, y] = d.mapa.x !== undefined ? [d.mapa.x, d.mapa.y] : proy(d.mapa.lat, d.mapa.lon), l = (-0.55 * n++).toFixed(2);
    const t = d.corto, e = d.lugar;
    return `<a class="pt" href="/casos/${d.slug}/" data-cat="${d.cat}" data-t="${ea(t)}" data-e="${ea(e)}" data-i="${d.portada}" data-x="${x.toFixed(1)}" data-y="${y.toFixed(1)}" aria-label="${ea(t + ', ' + e)}" style="--l:${l}s"><circle class="hit" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8"/><circle class="halo" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6"/><circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.2"/></a>`;
  }).join('');
  h = h.replace('</g></svg><div class="tip"', pts + '</g></svg><div class="tip"');
  const a = h.indexOf('<h2>Todos los casos</h2><div class="grid">'), b = h.indexOf('</div>', h.lastIndexOf('</a>', h.indexOf('</main>', a)));
  if (a < 0 || b < 0) throw new Error('No encuentro «Todos los casos» en el mapa');
  return h.slice(0, a) + '<h2>Todos los casos</h2><div class="grid">' + todos.slice().sort((p, q) => q.publicado.localeCompare(p.publicado) || (p.ordenMapa < 0 ? 1e9 : p.ordenMapa) - (q.ordenMapa < 0 ? 1e9 : q.ordenMapa)).map(d => tarjeta(d)).join('') + h.slice(b);
}
// Sitemap: las entradas que ya existen no se tocan; se añaden las de los casos nuevos justo detrás de la portada, el más reciente primero
const ex = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function sitemap(todos) {
  const f = path.join(RAIZ, 'sitemap.xml'), h = fs.readFileSync(f, 'utf8');
  // Fechas reales: la lastmod de cada caso sale de d.modificado (solo cambia cuando se edita el caso)
  const fechas = (t) => { for (const d of todos) { const re = new RegExp('(<loc>' + SITIO.replace(/[.]/g, '\\.') + '/casos/' + d.slug + '/</loc><lastmod>)[^<]*(</lastmod>)'); if (d.modificado) t = t.replace(re, '$1' + d.modificado + '$2'); } return t; };
  const nuevos = todos.filter(d => !h.includes(`<loc>${SITIO}/casos/${d.slug}/</loc>`)); if (!nuevos.length) return fechas(h);
  const ent = d => `<url><loc>${SITIO}/casos/${d.slug}/</loc><lastmod>${d.modificado}</lastmod><priority>0.8</priority>` + d.figs.map(g => `<image:image><image:loc>${SITIO}${g.src}</image:loc><image:caption>${ex(g.alt)}</image:caption></image:image>`).join('') +
    (d.video ? `<video:video><video:thumbnail_loc>https://i.ytimg.com/vi/${d.video.id}/hqdefault.jpg</video:thumbnail_loc><video:title>${ex(d.titulo)}</video:title><video:description>${ex(d.desc)}</video:description><video:player_loc>https://www.youtube.com/embed/${d.video.id}</video:player_loc><video:publication_date>${d.video.subido}</video:publication_date><video:family_friendly>yes</video:family_friendly></video:video>` : '') + '</url>\n';
  const i = h.indexOf('\n', h.indexOf('<loc>' + SITIO + '/</loc>')) + 1;
  return fechas(h.slice(0, i) + nuevos.map(ent).join('') + h.slice(i));
}
module.exports = { pagina, portada, mapa, sitemap, cargar };
if (require.main === module && process.argv[2] === '--prototipo') {   // node generar.js --prototipo <slug> <salida.html>: no toca la web
  const d = cargar().find(x => x.slug === process.argv[3]); if (!d) throw new Error('No existe ese caso'); fs.writeFileSync(process.argv[4], pagina(d, cargar())); console.log('Escrito', process.argv[4]);
} else if (require.main === module) {
  const comp = process.argv.includes('--comprobar'); let ok = 0, mal = 0; const TODOS = cargar();
  for (const f of fs.readdirSync(DATOS).filter(x => x.endsWith('.json'))) {
    const d = conAmp(JSON.parse(fs.readFileSync(path.join(DATOS, f), 'utf8'))), html = pagina(d, TODOS), dest = path.join(RAIZ, 'casos', d.slug, 'index.html');
    if (comp) { const real = fs.readFileSync(dest, 'utf8'); if (real === html) ok++; else { mal++; let i = 0; while (i < real.length && real[i] === html[i]) i++; console.log('DIFIERE', d.slug, 'en', i, '\n  real:', JSON.stringify(real.slice(Math.max(0, i - 40), i + 80)), '\n  gen: ', JSON.stringify(html.slice(Math.max(0, i - 40), i + 80))); } }
    else { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, html); ok++; }
  }
  { const f = path.join(RAIZ, 'index.html'), nuevo = portada(TODOS), real = fs.readFileSync(f, 'utf8');
    if (comp) { if (nuevo === real) ok++; else { mal++; let i = 0; while (i < real.length && real[i] === nuevo[i]) i++; console.log('DIFIERE portada en', i, '\n  real:', JSON.stringify(real.slice(Math.max(0, i - 40), i + 100)), '\n  gen: ', JSON.stringify(nuevo.slice(Math.max(0, i - 40), i + 100))); } } else { fs.writeFileSync(f, nuevo); ok++; } }
  { const f = path.join(RAIZ, 'mapa', 'index.html'), nuevo = mapa(TODOS), real = fs.readFileSync(f, 'utf8');
    if (comp) { if (nuevo === real) ok++; else { mal++; let i = 0; while (i < real.length && real[i] === nuevo[i]) i++; console.log('DIFIERE mapa en', i, '\n  real:', JSON.stringify(real.slice(Math.max(0, i - 60), i + 100)), '\n  gen: ', JSON.stringify(nuevo.slice(Math.max(0, i - 60), i + 100))); } } else { fs.writeFileSync(f, nuevo); ok++; } }
  { const f = path.join(RAIZ, 'sitemap.xml'), nuevo = sitemap(TODOS), real = fs.readFileSync(f, 'utf8');
    if (comp) { if (nuevo === real) ok++; else { mal++; let i = 0; while (i < real.length && real[i] === nuevo[i]) i++; console.log('DIFIERE sitemap en', i, '\n  real:', JSON.stringify(real.slice(Math.max(0, i - 60), i + 100)), '\n  gen: ', JSON.stringify(nuevo.slice(Math.max(0, i - 60), i + 100))); } } else { fs.writeFileSync(f, nuevo); ok++; } }
  console.log(comp ? `Iguales: ${ok}, distintas: ${mal}` : `Escritas: ${ok}`);
}
