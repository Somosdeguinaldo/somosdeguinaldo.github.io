// Junta todas las piezas en un único HTML.
//  · el-perro.html  → vista previa (sin base de datos: el progreso se guarda en el dispositivo)
//  · docs/index.html → la web para GitHub Pages; carga docs/config.js con los datos de Supabase
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');
const pieza = f => read(path.join('src', f));   // las piezas del juego están en src/
let html = pieza('template.html');
const partes = [['/*ENGINE*/', 'engine.js'], ['/*AI*/', 'ai.js'], ['/*ARTE*/', 'arte.js'], ['/*NAIPES*/', 'naipes.js'], ['/*SONIDO*/', 'sonido.js'],
  ['/*MENU*/', 'menu.js'], ['/*TUTO*/', 'tutorial.js'], ['/*CUENTA*/', 'cuenta.js'], ['/*MESA*/', 'mesa.js'], ['/*UI*/', 'ui.js']];
for (const [mark, file] of partes) {
  const src = pieza(file);
  if (src.includes('</script')) throw new Error(file + ' contiene </script>');
  if (!html.includes(mark)) throw new Error('Falta la marca ' + mark);
  html = html.replace(mark, () => src);
}
fs.writeFileSync(path.join(dir, 'el-perro.html'), html.replace('<!--CONFIG-->', ''));
// En la web, lo de la cabecera (título, fuentes y estilos) va en <head> y el resto en <body>
const corte = html.indexOf('</style>') + '</style>'.length;
const cabeza = html.slice(0, corte), cuerpo = html.slice(corte);
const web = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="El Perro, el truque de Fuenteguinaldo y Castillejo de Azaba. Juega en el Bar Doble J contra Tío Basilio o en pareja con Maribel.">
<meta name="theme-color" content="#120d0a">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icono-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="apple-mobile-web-app-title" content="El Perro">
<meta name="application-name" content="El Perro">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect x='10' y='4' width='44' height='56' rx='6' fill='%23fbf6e9' stroke='%23231d18' stroke-width='3'/%3E%3Ccircle cx='32' cy='32' r='13' fill='%23f0c53c' stroke='%23231d18' stroke-width='3'/%3E%3Ccircle cx='32' cy='32' r='5' fill='%23c62d2a'/%3E%3C/svg%3E">
${cabeza}
</head>
<body>
${cuerpo.replace('<!--CONFIG-->', '<script src="config.js"></script>')}
<script>
// Para poder jugar sin cobertura (contra Tío Basilio) una vez instalada en el móvil
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
</script>
</body>
</html>
`;
fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
fs.writeFileSync(path.join(dir, 'docs', 'index.html'), web);
if (!fs.existsSync(path.join(dir, 'docs', 'config.js'))) fs.writeFileSync(path.join(dir, 'docs', 'config.js'), read('config.ejemplo.js'));
fs.writeFileSync(path.join(dir, 'docs', '.nojekyll'), '');

// Para instalarla como app (pantalla de inicio): los iconos, el manifiesto y el «service worker»
const ICONOS = ['icono-180.png', 'icono-192.png', 'icono-512.png', 'icono-maskable-512.png'];
for (const f of ICONOS) fs.copyFileSync(path.join(dir, 'src', 'iconos', f), path.join(dir, 'docs', f));
const manifiesto = {
  name: 'El Perro · Bar Doble J',
  short_name: 'El Perro',
  description: 'El truque de Fuenteguinaldo y Castillejo de Azaba.',
  lang: 'es',
  id: './',
  start_url: './',
  scope: './',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#120d0a',
  theme_color: '#120d0a',
  icons: [
    { src: 'icono-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
fs.writeFileSync(path.join(dir, 'docs', 'manifest.webmanifest'), JSON.stringify(manifiesto, null, 2) + '\n');
// La versión cambia con cada cambio del juego: así el móvil se entera y renueva lo guardado
const version = require('crypto').createHash('sha1').update(web).digest('hex').slice(0, 10);
fs.writeFileSync(path.join(dir, 'docs', 'sw.js'), read(path.join('src', 'sw.js')).replace('__VERSION__', version));
console.log('el-perro.html', (html.length / 1024).toFixed(1) + ' KB · docs/index.html listo');
