/* El Perro — la entrada del bar. Fachada del Doble J al caer la tarde: estuco anaranjado, marcos y zócalo de
   granito, el rótulo de teselas marrones con letras doradas, las puertas de madera con barrotes de forja, la columna
   blanca y el empedrado. Mundo de 1800 × 2300 (y de -700 a 1600); se encuadra según la forma de la pantalla. */
(function (root) {
'use strict';

const ENTRADA = { x: 1200, rotulo: [860, 214, 680, 104], puerta: [1322, 600] };

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const n1 = v => Math.round(v * 10) / 10;

// ---------------------------------------------------------------- Texturas
function texturas() {
  const out = {};
  try {
    const r = rng(41);
    const mk = (w, h, fn) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      fn(c.getContext('2d'), w, h);
      return c.toDataURL('image/png');
    };
    out.estuco = mk(128, 128, (x, w, h) => {
      for (let i = 0; i < 900; i++) {
        x.fillStyle = r() < 0.5 ? 'rgba(120,60,20,.10)' : 'rgba(255,235,210,.13)';
        x.beginPath(); x.arc(r() * w, r() * h, 0.4 + r() * 1.5, 0, 6.29); x.fill();
      }
    });
    out.granito = mk(96, 96, (x, w, h) => {
      for (let i = 0; i < 900; i++) {
        const t = r();
        x.fillStyle = t < 0.45 ? 'rgba(35,35,40,.45)' : t < 0.85 ? 'rgba(255,255,255,.45)' : 'rgba(120,100,85,.35)';
        x.beginPath(); x.arc(r() * w, r() * h, 0.4 + r() * 1.3, 0, 6.29); x.fill();
      }
    });
    out.adoquin = mk(240, 160, (x, w, h) => {
      x.fillStyle = '#2c2621'; x.fillRect(0, 0, w, h);
      for (let fila = 0; fila < 7; fila++) {
        let cx = -10 + (fila % 2) * 14;
        const cy = fila * 24 + 10;
        while (cx < w + 20) {
          const rw = 12 + r() * 10, rh = 9 + r() * 4, g = 92 + r() * 50;
          for (const dx of [0, -w, w]) for (const dy of [0, -h, h]) {
            x.fillStyle = `rgb(${g + 18},${g + 8},${g - 4})`;
            x.beginPath(); x.ellipse(cx + dx, cy + dy + (r() - 0.5) * 3, rw, rh, (r() - 0.5) * 0.5, 0, 6.29); x.fill();
            x.fillStyle = 'rgba(255,240,220,.16)';
            x.beginPath(); x.ellipse(cx + dx - 2, cy + dy - 3, rw * 0.6, rh * 0.45, 0, 0, 6.29); x.fill();
          }
          cx += rw * 2 + 3 + r() * 3;
        }
      }
    });
  } catch (e) { /* sin canvas: colores lisos */ }
  return out;
}

// ---------------------------------------------------------------- Piezas
function marcoGranito(x, y, w, h, g) {
  return `<rect x="${x - g}" y="${y - g}" width="${w + 2 * g}" height="${h + 2 * g}" fill="#b6b1a9"/>
    <rect x="${x - g}" y="${y - g}" width="${w + 2 * g}" height="${h + 2 * g}" fill="url(#f-granito)"/>
    <rect x="${x - g}" y="${y - g}" width="${w + 2 * g}" height="${h + 2 * g}" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
    <rect x="${x - g - 6}" y="${y + h + g - 4}" width="${w + 2 * g + 12}" height="12" fill="#a9a49c"/>
    <rect x="${x - g - 6}" y="${y + h + g - 4}" width="${w + 2 * g + 12}" height="12" fill="url(#f-granito)"/>`;
}
function ventanaBaja(x, y, w, h) {
  return `<g>${marcoGranito(x, y, w, h, 20)}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#5b3a22"/>
    <rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h - 20}" fill="url(#f-vidrio)"/>
    <path d="M${x + w / 2} ${y + 10} V${y + h - 10} M${x + 10} ${y + h * 0.36} H${x + w - 10}" stroke="#5b3a22" stroke-width="8"/>
    <path d="M${x + 22} ${y + h - 22} L${x + w * 0.42} ${y + 22}" stroke="rgba(255,255,255,.12)" stroke-width="16"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="rgba(0,0,0,.4)" stroke-width="3"/>
  </g>`;
}
function ventanaAlta(x, y, w, h) {
  const bajada = h * 0.62;
  return `<g>${marcoGranito(x, y, w, h, 18)}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#2a2420"/>
    <rect x="${x + 8}" y="${y + bajada}" width="${w - 16}" height="${h - bajada - 8}" fill="url(#f-vidrio)"/>
    <rect x="${x}" y="${y}" width="${w}" height="${bajada}" fill="#b8652f"/>
    <rect x="${x}" y="${y}" width="${w}" height="${bajada}" fill="url(#f-persiana)"/>
    <rect x="${x}" y="${y + bajada - 6}" width="${w}" height="8" fill="#7a3f17"/>
    <path d="M${x + 14} ${y + bajada + 6} V${y + bajada + 40}" stroke="#d9d0c4" stroke-width="2"/>
  </g>`;
}
function silla(x, y, s, m) {
  return `<g transform="translate(${x} ${y}) scale(${m * s} ${s})">
    <ellipse cx="0" cy="4" rx="58" ry="8" fill="rgba(0,0,0,.3)"/>
    <path d="M-38 -4 L-44 -70 M38 -4 L44 -70 M-30 -4 L-32 -66 M30 -4 L32 -66" stroke="#cfcac0" stroke-width="7" stroke-linecap="round"/>
    <path d="M-50 -74 Q0 -88 50 -74 L48 -60 Q0 -72 -48 -60 Z" fill="#e8e5de"/>
    <path d="M-46 -78 C-52 -120 -48 -168 -36 -176 Q0 -190 36 -176 C48 -168 52 -120 46 -78 Z" fill="#efece6" stroke="#c9c4ba" stroke-width="2"/>
    <path d="M-34 -160 Q0 -170 34 -160 M-38 -142 Q0 -152 38 -142 M-40 -124 Q0 -134 40 -124 M-40 -106 Q0 -116 40 -106" stroke="#cdc8bf" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M-50 -96 Q-62 -98 -60 -80 L-54 -66 M50 -96 Q62 -98 60 -80 L54 -66" stroke="#e6e2da" stroke-width="10" fill="none" stroke-linecap="round"/>
    <ellipse cx="0" cy="-128" rx="12" ry="7" fill="#d6d1c7"/>
  </g>`;
}
function mesaTerraza(x, y, s) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="4" rx="70" ry="9" fill="rgba(0,0,0,.3)"/>
    <path d="M-50 0 L50 0 M0 -4 L0 -92" stroke="#cfcac0" stroke-width="9" stroke-linecap="round"/>
    <path d="M-92 -100 L92 -100 L84 -112 L-84 -112 Z" fill="#f2f0eb"/>
    <rect x="-92" y="-100" width="184" height="9" fill="#d9d5cc"/>
    <path d="M-86 -96 H86" stroke="rgba(0,0,0,.08)" stroke-width="2" stroke-dasharray="4 3"/>
  </g>`;
}
function interior() {
  // Lo que se ve por la puerta abierta: la pared roja con botellas, una lámpara y la barra
  let botellas = '';
  const r = rng(5);
  for (let i = 0; i < 9; i++) {
    const x = 1254 + i * 15 + r() * 4, h = 26 + r() * 16, c = ['#2f5d2a', '#6b3a12', '#8a6a2a', '#3a2a18', '#b88a3a'][Math.floor(r() * 5)];
    botellas += `<path d="M${x} 470 v-${h} q0 -6 3 -8 v-10 h4 v10 q3 2 3 8 v${h} Z" fill="${c}" opacity=".9"/>`;
  }
  return `<g clip-path="url(#c-hueco)">
    <rect x="1240" y="350" width="170" height="470" fill="url(#f-interior)"/>
    <rect x="1240" y="380" width="170" height="150" fill="#8d2a22" opacity=".85"/>
    <rect x="1240" y="470" width="170" height="6" fill="#e9dccb" opacity=".8"/>
    ${botellas}
    <ellipse cx="1310" cy="372" rx="48" ry="26" fill="rgba(255,226,160,.6)"/>
    <path d="M1310 350 V364" stroke="#2a1d14" stroke-width="2"/><path d="M1296 364 H1324 L1318 374 H1302 Z" fill="#f6dc9c"/>
    <rect x="1240" y="620" width="170" height="44" fill="#c4b49c"/>
    <rect x="1240" y="664" width="170" height="160" fill="#7b6650"/>
    <path d="M1240 664 H1410" stroke="rgba(255,240,210,.5)" stroke-width="3"/>
    <rect x="1240" y="770" width="170" height="60" fill="#4b4540"/>
  </g>`;
}
function barrotes(x0, x1, y0, y1, n) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = n1(x0 + (i + 0.5) * (x1 - x0) / n), ym = (y0 + y1) / 2;
    s += `<path d="M${x} ${y0} V${y1}" stroke="#1d1712" stroke-width="5"/>
      <ellipse cx="${x}" cy="${n1(ym)}" rx="7" ry="14" fill="#1d1712"/><ellipse cx="${x}" cy="${n1(y0 + 26)}" rx="5" ry="8" fill="#1d1712"/>
      <ellipse cx="${x}" cy="${n1(y1 - 26)}" rx="5" ry="8" fill="#1d1712"/>
      <path d="M${x - 2} ${y0} V${y1}" stroke="rgba(255,255,255,.12)" stroke-width="1.5"/>`;
  }
  return s;
}
function rotulo(nombre) {
  const [x, y, w, h] = ENTRADA.rotulo;
  const texto = `BAR   ${nombre}`;
  const tam = Math.min(74, Math.floor((w - 70) / (texto.length * 0.66)));
  const letras = (fill, dx, dy, extra = '') => `<text x="${x + w / 2 + dx}" y="${y + h / 2 + tam * 0.36 + dy}" text-anchor="middle" font-family="Alegreya SC, Georgia, serif" font-weight="800" font-size="${tam}" letter-spacing="${tam * 0.08}" fill="${fill}" ${extra}>${texto}</text>`;
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#3a2216"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#f-tesela)"/>
    <rect x="${x}" y="${y}" width="${w}" height="5" fill="rgba(255,220,180,.18)"/>
    <rect x="${x}" y="${y + h}" width="${w}" height="20" fill="#24140c"/>
    <rect x="${x}" y="${y + h}" width="${w}" height="20" fill="url(#f-tesela)" opacity=".5"/>
    <path d="M${x} ${y + h + 20} H${x + w}" stroke="rgba(0,0,0,.6)" stroke-width="4"/>
    ${letras('rgba(0,0,0,.55)', 3, 4)}
    ${letras('url(#f-oro)', 0, 0, 'stroke="#6b4b14" stroke-width="1.5"')}
  </g>`;
}

// ---------------------------------------------------------------- La fachada completa
function fachada(nombre = 'DOBLE J') {
  const r = rng(9);
  let losas = '';
  for (let x = -20, i = 0; x < 1820; i++) {
    const w = 90 + r() * 110, t = 150 + Math.floor(r() * 30);
    losas += `<rect x="${n1(x)}" y="856" width="${n1(w - 4)}" height="${n1(60 + r() * 14)}" fill="rgb(${t},${t - 3},${t - 8})"/>`;
    x += w;
  }
  const ventanas = [120, 340, 560].map(x => ventanaBaja(x, 430, 150, 270)).join('') +
    [140, 560, 1130, 1600].map(x => ventanaAlta(x, -90, 140, 210)).join('');
  return `<defs>
    <pattern id="f-estuco" patternUnits="userSpaceOnUse" width="128" height="128"><image id="fi-estuco" width="128" height="128" href=""/></pattern>
    <pattern id="f-granito" patternUnits="userSpaceOnUse" width="96" height="96"><image id="fi-granito" width="96" height="96" href=""/></pattern>
    <pattern id="f-adoquin" patternUnits="userSpaceOnUse" width="240" height="160"><image id="fi-adoquin" width="240" height="160" href=""/></pattern>
    <pattern id="f-tesela" patternUnits="userSpaceOnUse" width="12" height="12"><rect width="12" height="12" fill="#2a170e"/><rect x="1" y="1" width="10" height="10" rx="1" fill="#4a2c1b"/><rect x="2" y="2" width="5" height="3" fill="rgba(255,220,180,.08)"/></pattern>
    <pattern id="f-persiana" patternUnits="userSpaceOnUse" width="8" height="9"><rect width="8" height="9" fill="none"/><rect y="7" width="8" height="2" fill="rgba(60,25,5,.55)"/><rect y="0" width="8" height="2" fill="rgba(255,210,160,.25)"/></pattern>
    <linearGradient id="f-oro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dc8a"/><stop offset=".55" stop-color="#d4a945"/><stop offset="1" stop-color="#a27a26"/></linearGradient>
    <linearGradient id="f-vidrio" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f2c30"/><stop offset=".55" stop-color="#6b4a2c"/><stop offset="1" stop-color="#d79a52"/></linearGradient>
    <linearGradient id="f-interior" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd890"/><stop offset=".5" stop-color="#f0b060"/><stop offset="1" stop-color="#9a5a26"/></linearGradient>
    <linearGradient id="f-columna" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9c9a96"/><stop offset=".3" stop-color="#f4f2ee"/><stop offset=".55" stop-color="#e6e3dd"/><stop offset="1" stop-color="#8a8780"/></linearGradient>
    <linearGradient id="f-madera" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a2014"/><stop offset=".5" stop-color="#4f2d1b"/><stop offset="1" stop-color="#341c11"/></linearGradient>
    <linearGradient id="f-tarde" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121a33" stop-opacity=".78"/><stop offset=".33" stop-color="#1c1626" stop-opacity=".42"/><stop offset=".6" stop-color="#140d08" stop-opacity=".24"/><stop offset="1" stop-color="#0a0604" stop-opacity=".62"/></linearGradient>
    <radialGradient id="f-derrame" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffbf6a" stop-opacity=".55"/><stop offset=".5" stop-color="#ff9e45" stop-opacity=".2"/><stop offset="1" stop-color="#ff9e45" stop-opacity="0"/></radialGradient>
    <radialGradient id="f-farol" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe0a0" stop-opacity=".6"/><stop offset=".4" stop-color="#ffc06a" stop-opacity=".18"/><stop offset="1" stop-color="#ffc06a" stop-opacity="0"/></radialGradient>
    <clipPath id="c-hueco"><rect x="1246" y="352" width="146" height="456"/></clipPath>
  </defs>
  <rect x="-200" y="-700" width="2200" height="1450" fill="#d29b6c"/>
  <rect x="-200" y="-700" width="2200" height="1450" fill="url(#f-estuco)"/>
  <path d="M-200 -300 H2000" stroke="rgba(0,0,0,.08)" stroke-width="10"/>
  ${ventanas}
  <rect x="-200" y="742" width="1070" height="82" fill="#aaa59d"/><rect x="1530" y="742" width="470" height="82" fill="#aaa59d"/>
  <rect x="-200" y="742" width="1070" height="82" fill="url(#f-granito)"/><rect x="1530" y="742" width="470" height="82" fill="url(#f-granito)"/>
  <path d="M-200 742 H870 M1530 742 H2000" stroke="rgba(255,255,255,.35)" stroke-width="3"/>
  <rect x="870" y="318" width="660" height="510" fill="#6a645d"/>
  <rect x="870" y="318" width="660" height="510" fill="url(#f-granito)" opacity=".7"/>
  <rect x="870" y="318" width="660" height="510" fill="rgba(20,10,5,.42)"/>
  <rect x="870" y="318" width="64" height="510" fill="#a49e96"/><rect x="870" y="318" width="64" height="510" fill="url(#f-granito)"/>
  <path d="M934 318 V828" stroke="rgba(0,0,0,.35)" stroke-width="4"/>
  ${interior()}
  <rect x="1240" y="346" width="160" height="466" fill="none" stroke="#2a170e" stroke-width="10"/>
  <g>
    <rect x="950" y="342" width="222" height="470" fill="url(#f-madera)" stroke="#1e110a" stroke-width="3"/>
    <rect x="964" y="354" width="194" height="44" fill="#e7b46a" opacity=".85"/>
    <g clip-path="url(#c-montante)">${barrotes(964, 1158, 354, 398, 7)}</g>
    <rect x="964" y="408" width="194" height="250" fill="#d39552"/>
    <rect x="964" y="408" width="194" height="250" fill="url(#f-interior)" opacity=".6"/>
    ${barrotes(964, 1158, 408, 658, 6)}
    <rect x="964" y="408" width="194" height="250" fill="none" stroke="#1e110a" stroke-width="5"/>
    <rect x="976" y="676" width="80" height="118" fill="none" stroke="rgba(0,0,0,.4)" stroke-width="4"/><rect x="1066" y="676" width="80" height="118" fill="none" stroke="rgba(0,0,0,.4)" stroke-width="4"/>
    <path d="M1061 408 V804" stroke="#1e110a" stroke-width="4"/>
  </g>
  <clipPath id="c-montante"><rect x="964" y="354" width="194" height="44"/></clipPath>
  <path d="M1398 344 L1500 330 L1500 830 L1398 812 Z" fill="url(#f-madera)" stroke="#1e110a" stroke-width="3"/>
  <path d="M1410 372 L1488 364 L1488 600 L1410 604 Z" fill="#2c2420"/>
  <path d="M1410 372 L1488 364 L1488 600 L1410 604 Z" fill="url(#f-interior)" opacity=".35"/>
  <rect x="1428" y="440" width="22" height="16" fill="#f1ede3" transform="skewY(-5)"/><rect x="1456" y="470" width="18" height="22" fill="#e9e2d1" transform="skewY(-5)"/>
  <circle cx="1444" cy="512" r="9" fill="#2a5c8f" opacity=".85"/>
  <path d="M1412 640 L1486 636 M1412 720 L1486 718" stroke="rgba(0,0,0,.35)" stroke-width="4"/>
  <rect x="1404" y="590" width="10" height="26" rx="3" fill="#b8a46a"/>
  <g>
    <rect x="992" y="716" width="44" height="92" rx="6" fill="#4a2a18"/>
    <rect x="988" y="710" width="52" height="12" rx="4" fill="#5c3826"/>
    <path d="M996 730 V800" stroke="rgba(255,220,180,.15)" stroke-width="4"/>
  </g>
  <rect x="852" y="808" width="690" height="34" fill="#9d978e"/>
  <rect x="852" y="808" width="690" height="34" fill="url(#f-granito)"/>
  <rect x="852" y="808" width="690" height="4" fill="rgba(255,255,255,.35)"/>
  <rect x="852" y="842" width="690" height="16" fill="#6f6a63"/>
  <g>
    <rect x="1170" y="330" width="70" height="494" fill="url(#f-columna)"/>
    <rect x="1162" y="324" width="86" height="16" rx="3" fill="#e8e5df"/>
    <rect x="1160" y="806" width="90" height="20" rx="3" fill="#d6d2cb"/>
    <path d="M1186 380 V790" stroke="rgba(255,255,255,.5)" stroke-width="6"/>
    <path d="M1200 600 l6 22" stroke="rgba(0,0,0,.18)" stroke-width="2"/>
  </g>
  ${rotulo(nombre)}
  <g transform="translate(790 150)">
    <path d="M0 0 V-40" stroke="#1d1712" stroke-width="5"/>
    <rect x="-22" y="0" width="44" height="30" rx="4" fill="#1d1712"/>
    <rect x="-17" y="6" width="34" height="20" rx="3" fill="#ffe2a2"/>
  </g>
  <rect x="-200" y="824" width="2200" height="800" fill="#4a423a"/>
  <rect x="-200" y="900" width="2200" height="724" fill="url(#f-adoquin)"/>
  ${losas}
  <rect x="-200" y="852" width="2200" height="6" fill="rgba(0,0,0,.35)"/>
  ${mesaTerraza(250, 930, 1.05)}${silla(130, 980, 1, 1)}${silla(380, 984, 1, -1)}
  ${mesaTerraza(650, 940, 0.95)}${silla(540, 990, 0.95, 1)}
  <rect x="-200" y="-700" width="2200" height="2300" fill="url(#f-tarde)"/>
  <ellipse cx="1300" cy="840" rx="520" ry="200" fill="url(#f-derrame)" style="mix-blend-mode:screen"/>
  <ellipse cx="1320" cy="560" rx="200" ry="300" fill="url(#f-derrame)" style="mix-blend-mode:screen" opacity=".6"/>
  <circle cx="790" cy="170" r="360" fill="url(#f-farol)" style="mix-blend-mode:screen"/>
  ${[195, 415, 635].map(x => `<ellipse cx="${x}" cy="580" rx="140" ry="170" fill="url(#f-derrame)" style="mix-blend-mode:screen" opacity=".45"/>`).join('')}`;
}

// ---------------------------------------------------------------- Encuadre: qué trozo de fachada se ve
function encuadre(svg) {
  const w = svg.clientWidth, h = svg.clientHeight;
  if (!w || !h) return null;
  const a = w / h;
  let x0, y0, W, H;
  if (a < 1.05) {
    // En vertical: el rótulo arriba, la puerta detrás de la pizarra y la calle abajo
    W = Math.max(720, 1000 * a); H = W / a;
    x0 = ENTRADA.x - W / 2; y0 = 150;
    if (y0 + H > 1600) y0 = 1600 - H;
  } else {
    // En horizontal: toda la fachada, con la entrada a la derecha
    H = 1120; W = H * a;
    if (W > 1900) { W = 1900; H = W / a; }
    x0 = Math.max(-100, Math.min(1900 - W, ENTRADA.x - 0.64 * W)); y0 = 860 - 0.74 * H;
  }
  svg.setAttribute('viewBox', `${n1(x0)} ${n1(y0)} ${n1(W)} ${n1(H)}`);
  const px = (ENTRADA.puerta[0] - x0) / W * w, py = (ENTRADA.puerta[1] - y0) / H * h;
  const [, ry, , rh] = ENTRADA.rotulo;
  return { px, py, rotuloAbajo: (ry + rh + 20 - y0) / H * h, horizontal: a >= 1.05 };
}

function montar(svg, nombre) {
  svg.innerHTML = fachada(nombre);
  const t = texturas();
  for (const k of ['estuco', 'granito', 'adoquin']) if (t[k]) svg.querySelector('#fi-' + k).setAttribute('href', t[k]);
}

root.PerroBar = { montar, encuadre, fachada, ENTRADA };
})(typeof window !== 'undefined' ? window : globalThis);
