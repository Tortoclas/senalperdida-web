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
function cargar() {
  return fs.readdirSync(DATOS).filter(x => x.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(DATOS, f), 'utf8'))).sort((a, b) => a.orden - b.orden);
}
const tarjeta = (d, o) => { o = o || {}; return `<a class="card pc${o.dest ? ' dest' : ''}" data-cat="${d.cat}" href="/casos/${d.slug}/"><div class="ph"><img src="${d.portada}" alt="" width="640" height="800" loading="${o.dest ? 'eager' : 'lazy'}"><span class="chip" data-cat="${d.cat}">${d.cat}</span></div><div class="cb">${o.dest ? '<span class="etq">Último caso</span>' : ''}<span class="eyebrow">${d.lugar}</span><h3>${ea(d.titulo)}</h3><p>${ea(d.desc)}</p></div></a>`; };
// Más casos: los de la misma etiqueta primero y luego el resto en el orden de la portada, cuatro en total
function masCasos(d, todos) {
  const otros = todos.filter(x => x.slug !== d.slug);
  return '<div class="grid" style="margin-bottom:0">' + otros.filter(x => x.cat === d.cat).concat(otros.filter(x => x.cat !== d.cat)).slice(0, 4).map(x => tarjeta(x)).join('') + '</div>';
}
function pagina(d, todos) {
  const url = `${SITIO}/casos/${d.slug}/`, tit = `${d.titulo} | Señal Perdida`, og = SITIO + d.ogimg;
  const ld1 = { '@context': 'https://schema.org', '@type': 'Article', headline: d.titulo, description: d.desc, inLanguage: 'es', datePublished: d.publicado, dateModified: d.modificado, mainEntityOfPage: url, author: { '@type': 'Organization', name: 'Señal Perdida' }, publisher: { '@type': 'Organization', name: 'Señal Perdida', logo: { '@type': 'ImageObject', url: SITIO + '/logo-senal-perdida.jpg' } }, image: [og] };
  const ld2 = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Inicio', item: SITIO + '/' }, { '@type': 'ListItem', position: 2, name: d.corto, item: url }] };
  let ld3 = '';
  if (d.video) ld3 = '<script type="application/ld+json">' + J({ '@context': 'https://schema.org', '@type': 'VideoObject', name: d.titulo, description: d.desc, thumbnailUrl: `https://i.ytimg.com/vi/${d.video.id}/hqdefault.jpg`, uploadDate: d.video.subido, embedUrl: `https://www.youtube.com/embed/${d.video.id}`, inLanguage: 'es' }) + '</script>';
  const head = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${ea(tit)}</title><meta name="description" content="${ea(d.desc)}">
<link rel="canonical" href="${url}"><meta name="theme-color" content="#0b0a09"><meta name="msvalidate.01" content="BB1B9C266BFA8BF7F61E3652DF26095C">
<link rel="icon" href="/favicon.png" type="image/png"><link rel="stylesheet" href="/estilo.css?v=bus24a3">
<meta property="og:site_name" content="Señal Perdida"><meta property="og:type" content="article"><meta property="og:locale" content="es_ES">
<meta property="og:title" content="${ea(tit)}"><meta property="og:description" content="${ea(d.desc)}"><meta property="og:url" content="${url}">
<meta property="og:image" content="${og}"><meta name="robots" content="index,follow,max-image-preview:large"><meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${J(ld1)}</script><script type="application/ld+json">${J(ld2)}</script>${ld3}</head><body>
<a class="skip" href="#main">Saltar al contenido</a>
<header class="site"><div class="wrap wide"><a class="brand" href="/"><img src="/logo-television-transparente.png" alt="" width="54" height="57"><span>Señal Perdida</span></a>
<nav><a href="/#casos">Casos</a><a href="/mapa/">Mapa</a><a href="/sobre/">Más sobre SP</a></nav></div></header>
`;
  const figs = d.figs.map(f => `<figure><img src="${f.src}" srcset="${f.srcset}" sizes="${f.sizes}" alt="${ea(f.alt)}" width="${f.w}" height="${f.h}" loading="lazy"></figure>`).join('');
  const nf = d.fuentes.length;
  const vtop = d.vtop ? `${d.vtop.saltoAntes ? '\n' : ''}<div class="vtop"><span>${d.vtop.texto}</span>${d.vtop.botones.map(b => `<a class="btn" href="${b.href}" rel="noopener" target="_blank">${b.boton}</a>`).join('')}</div>\n` : '';
  const vid = d.video ? `<section class="vid"><h2>El vídeo</h2><div class="vids"><div class="vf${d.video.formato === 'short' ? ' short' : ''}"><p class="lbl">${d.video.etiqueta}</p><iframe class="${d.video.formato === 'short' ? 's' : 'l'}" src="https://www.youtube-nocookie.com/embed/${d.video.id}" title="${ea(d.video.titulo)}" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div></div></section>\n` : '\n';
  const t1 = enc(d.titulo), u1 = enc(url);
  const share = `<section class="share" aria-label="Compartir este caso"><h2>Compartir</h2><div class="btns" style="justify-content:flex-start"><a class="btn" href="https://wa.me/?text=${t1}%20${u1}" target="_blank" rel="noopener nofollow">WhatsApp</a><a class="btn" href="https://t.me/share/url?url=${u1}&text=${t1}" target="_blank" rel="noopener nofollow">Telegram</a><a class="btn" href="https://twitter.com/intent/tweet?url=${u1}&text=${t1}" target="_blank" rel="noopener nofollow">X</a><a class="btn" href="https://www.facebook.com/sharer/sharer.php?u=${u1}" target="_blank" rel="noopener nofollow">Facebook</a><a class="btn" href="https://www.reddit.com/submit?url=${u1}&title=${t1}" target="_blank" rel="noopener nofollow">Reddit</a><a class="btn" href="mailto:?subject=${t1}&body=${u1}" target="_blank" rel="noopener nofollow">Correo</a><button type="button" class="btn" data-copy="${url}">Copiar enlace</button><button type="button" class="btn" data-nat hidden>Más…</button></div></section></article>${d.saltoMas ? '\n' : ''}`;
  const cuerpo = `<main id="main" class="wrap read"><div class="crumbs"><a href="/">Inicio</a> › ${d.corto}</div>
<article><div class="meta"><span class="eyebrow">${d.lugar}</span><span class="chip" data-cat="${d.cat}">${d.cat}</span></div><h1>${ea(d.titulo)}</h1>
<p class="lead">${d.lead}</p>
${vtop}<div class="ficha"><div><b>Lugar y época</b>${d.lugar}</div><div><b>Categoría</b>${d.cat}</div><div><b>Fuentes</b>${nf} enlazada${nf === 1 ? '' : 's'}</div></div>
${d.saltoGal ? '\n' : ''}<div class="gal${d.galClase}">${figs}</div><p class="cap">${d.cap}</p>
<h2>Lo que sabemos</h2><ol class="tl">${d.sabemos.map(x => `<li>${x}</li>`).join('')}</ol>
<h2>Lo que se discute</h2><div class="box"><ul>${d.discute.map(x => `<li>${x}</li>`).join('')}</ul></div>
${vid}<div class="cta"><p><strong>¿Te ha dejado con ganas de más?</strong></p><p>Cada semana, una historia oscura en vídeo.</p>
<div class="btns"><a class="btn" href="https://www.tiktok.com/@senalperdida_oficial" rel="noopener">TikTok</a><a class="btn" href="https://www.youtube.com/@Se%C3%B1alPerdidasecretos" rel="noopener">YouTube</a></div></div>
<h2>Fuentes</h2><ul class="src">${d.fuentes.map(x => `<li><a href="${ea(x.url)}" rel="noopener nofollow" target="_blank">${ea(x.txt)}</a></li>`).join('')}</ul>
${share}<h2>Más casos</h2>${todos ? masCasos(d, todos) : d.masRaw}`;
  return head + cuerpo + PIE;
}
// Portada: solo se sustituye la rejilla de tarjetas; el resto de index.html se deja como está
function portada(todos) {
  const f = path.join(RAIZ, 'index.html'), h = fs.readFileSync(f, 'utf8'), a = h.indexOf('<div class="grid">'), b = h.indexOf('</div><p id="nada"');
  if (a < 0 || b < 0) throw new Error('No encuentro la rejilla de la portada');
  return h.slice(0, a) + '<div class="grid">' + todos.map((d, i) => tarjeta(d, { dest: i === 0 })).join('') + h.slice(b);
}
module.exports = { pagina, portada, cargar };
if (require.main === module) {
  const comp = process.argv.includes('--comprobar'); let ok = 0, mal = 0; const TODOS = cargar();
  for (const f of fs.readdirSync(DATOS).filter(x => x.endsWith('.json'))) {
    const d = JSON.parse(fs.readFileSync(path.join(DATOS, f), 'utf8')), html = pagina(d, TODOS), dest = path.join(RAIZ, 'casos', d.slug, 'index.html');
    if (comp) { const real = fs.readFileSync(dest, 'utf8'); if (real === html) ok++; else { mal++; let i = 0; while (i < real.length && real[i] === html[i]) i++; console.log('DIFIERE', d.slug, 'en', i, '\n  real:', JSON.stringify(real.slice(Math.max(0, i - 40), i + 80)), '\n  gen: ', JSON.stringify(html.slice(Math.max(0, i - 40), i + 80))); } }
    else { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, html); ok++; }
  }
  { const f = path.join(RAIZ, 'index.html'), nuevo = portada(TODOS), real = fs.readFileSync(f, 'utf8');
    if (comp) { if (nuevo === real) ok++; else { mal++; let i = 0; while (i < real.length && real[i] === nuevo[i]) i++; console.log('DIFIERE portada en', i, '\n  real:', JSON.stringify(real.slice(Math.max(0, i - 40), i + 100)), '\n  gen: ', JSON.stringify(nuevo.slice(Math.max(0, i - 40), i + 100))); } } else { fs.writeFileSync(f, nuevo); ok++; } }
  console.log(comp ? `Iguales: ${ok}, distintas: ${mal}` : `Escritas: ${ok}`);
}
