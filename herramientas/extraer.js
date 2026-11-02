'use strict';
// Una sola vez: saca de cada página de caso publicada un archivo de datos (datos/casos/<slug>.json).
const fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..'), OUT = path.join(__dirname, 'datos', 'casos');
fs.mkdirSync(OUT, { recursive: true });
const un = (s, re, i) => { const m = re.exec(s); if (!m) throw new Error('No encuentro ' + re); return m[i === undefined ? 1 : i]; };
const op = (s, re, i) => { const m = re.exec(s); return m ? m[i === undefined ? 1 : i] : null; };
const dec = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
for (const slug of fs.readdirSync(path.join(RAIZ, 'casos'))) {
  const f = path.join(RAIZ, 'casos', slug, 'index.html'); if (!fs.existsSync(f)) continue;
  const s = fs.readFileSync(f, 'utf8'), d = { slug };
  d.titulo = dec(un(s, /<h1>(.*?)<\/h1>/));
  d.desc = dec(un(s, /<meta name="description" content="(.*?)">/));
  d.lead = un(s, /<p class="lead">(.*?)<\/p>/);
  d.lugar = un(s, /<span class="eyebrow">(.*?)<\/span><span class="chip"/);
  d.cat = un(s, /<span class="chip" data-cat="(.*?)">/);
  d.corto = un(s, /<div class="crumbs"><a href="\/">Inicio<\/a> › (.*?)<\/div>/);
  d.ogimg = un(s, /<meta property="og:image" content="https:\/\/senalperdidaoficial\.com(.*?)">/);
  d.publicado = un(s, /"datePublished": "(.*?)"/); d.modificado = un(s, /"dateModified": "(.*?)"/);
  const v = /<\/p>\n(\n?)<div class="vtop"><span>(.*?)<\/span>(.*?)<\/div>\n<div class="ficha">/.exec(s);
  d.vtop = v ? { saltoAntes: !!v[1], texto: v[2], botones: [...v[3].matchAll(/<a class="btn" href="(.*?)" rel="noopener" target="_blank">(.*?)<\/a>/g)].map(m => ({ href: m[1], boton: m[2] })) } : null;
  d.saltoGal = /<\/div><\/div>\n\n<div class="gal/.test(s);
  d.galClase = un(s, /<div class="gal( one)?">/ , 1) || '';
  d.figs = [...un(s, /<div class="gal(?: one)?">(.*?)<\/div><p class="cap">/).matchAll(/<figure><img src="(.*?)" srcset="(.*?)" sizes="(.*?)" alt="(.*?)" width="(\d+)" height="(\d+)" loading="lazy"><\/figure>/g)].map(m => ({ src: m[1], srcset: m[2], sizes: m[3], alt: dec(m[4]), w: +m[5], h: +m[6] }));
  d.cap = un(s, /<p class="cap">(.*?)<\/p>/);
  d.sabemos = [...un(s, /<h2>Lo que sabemos<\/h2><ol class="tl">(.*?)<\/ol>/).matchAll(/<li>(.*?)<\/li>/g)].map(m => m[1]);
  d.discute = [...un(s, /<h2>Lo que se discute<\/h2><div class="box"><ul>(.*?)<\/ul><\/div>/).matchAll(/<li>(.*?)<\/li>/g)].map(m => m[1]);
  const vid = /<h2>El vídeo<\/h2><div class="vids"><div class="vf( short)?"><p class="lbl">(.*?)<\/p><iframe class="[sl]" src="https:\/\/www\.youtube-nocookie\.com\/embed\/(.*?)" title="(.*?)"/.exec(s);
  d.video = vid ? { formato: vid[1] ? 'short' : 'largo', etiqueta: vid[2], id: vid[3], titulo: dec(vid[4]), subido: op(s, /"uploadDate": "(.*?)"/) } : null;
  d.fuentes = [...un(s, /<h2>Fuentes<\/h2><ul class="src">(.*?)<\/ul>/).matchAll(/<li><a href="(.*?)" rel="noopener nofollow" target="_blank">(.*?)<\/a><\/li>/g)].map(m => ({ url: dec(m[1]), txt: dec(m[2]) }));
  d.saltoMas = /<\/article>\n<h2>Más casos/.test(s);
  d.masRaw = un(s, /<h2>Más casos<\/h2>(.*?)<\/main>/);
  fs.writeFileSync(path.join(OUT, slug + '.json'), JSON.stringify(d, null, 1));
  console.log(slug.slice(0, 30), d.figs.length, d.sabemos.length, d.discute.length, d.fuentes.length, d.video ? 'video' : '');
}
