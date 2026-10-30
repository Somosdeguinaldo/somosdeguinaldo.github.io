# El Perro

El truque de Fuenteguinaldo y Castillejo de Azaba, para jugar en el móvil o el ordenador.
Se juega en el Bar Doble J: 1 contra 1 con Tío Basilio, o 2 contra 2 con Maribel de compañera.
Incluye el tutorial de Tío Basilio, la baraja española dibujada en vectorial, sonido y cuentas de jugador
con el progreso guardado.

**Jugar:** https://somosdeguinaldo.github.io/

## Cómo está organizado

```
docs/                 La web: lo que publica GitHub Pages (se genera con build.js; no se toca a mano)
  index.html          El juego entero en una página
  config.js           Los datos de Supabase (vacío = el progreso se guarda solo en el dispositivo)
  manifest.webmanifest, sw.js, icono-*.png   Para instalarlo como app en el móvil (y jugar sin cobertura)
src/                  Las piezas del juego
  engine.js           Las reglas del Perro (bazas, ligado, flor, truque, cobros, juegos y vacas)
  ai.js               Los jugadores del ordenador
  naipes.js           La baraja española (dibujos SVG)
  arte.js, menu.js    La mesa, la gente y la puerta del bar
  sonido.js           Cuatro canciones lo-fi, el ruido del bar y los efectos (todo sintetizado)
  tutorial.js         El tutorial de Tío Basilio
  cuenta.js           Cuentas y progreso
  mesa.js             La mesa con amigos: partidas en línea con un código o un enlace
  ui.js               La interfaz
  template.html       El HTML y los estilos
  sw.js               El «service worker»: guarda una copia del juego en el móvil
  iconos/             El icono de la app (icono.js dibuja el SVG; los PNG salen de ahí)
supabase/esquema.sql  La tabla de jugadores y sus reglas de seguridad
supabase/progreso.sql Cómo se guarda el progreso: solo se puede sumar lo jugado (función apuntar_progreso)
build.js              Junta src/ en docs/index.html (y en el-perro.html, para probar en local)
test.js               Pruebas de las reglas
test-oculto.js        Mesa con amigos: miles de partidas al azar en las que cada invitado solo ve sus cartas,
                      comprobando que todos los móviles van igual
test-cuenta.js        Pruebas de cómo se guarda y se junta el progreso (dispositivo y nube)
config.ejemplo.js     Plantilla de docs/config.js
```

Después de cambiar algo en `src/`: `node build.js` (o `npm run build`) y `npm test` para comprobar las reglas,
la mesa con amigos y el guardado del progreso. No hace falta instalar nada: solo Node.

## Tenerlo como app en el móvil

No hace falta ninguna tienda de aplicaciones: se instala desde la propia web y queda con su icono (el perro sobre el
tapete), se abre a pantalla completa y se puede jugar contra Tío Basilio sin cobertura.

- **iPhone:** abre la web en **Safari**, toca el botón de **Compartir** (el cuadrado con la flecha hacia arriba) y elige
  **«Añadir a pantalla de inicio»** → **Añadir**. (Tiene que ser Safari; en iOS 16.4 o más nuevo también vale desde Chrome.)
- **Android:** abre la web en **Chrome**, toca los tres puntos y elige **«Añadir a pantalla de inicio»** o **«Instalar aplicación»**.

La app se actualiza sola cuando hay internet. En el iPhone, la app de la pantalla de inicio guarda su progreso aparte del de
Safari: con una cuenta («Tu cuenta») se recupera en los dos sitios.

## Publicarlo en GitHub Pages (gratis)

El código ya está en este repositorio. Solo falta encender la web:

1. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
2. Rama **`main`** y carpeta **`/docs`**. Guarda.
3. En un par de minutos estará en **https://somosdeguinaldo.github.io/**.

Así ya se puede jugar. El progreso se guarda en cada dispositivo hasta que conectes la base de datos.
Cada vez que se suba un cambio a `main`, la web se actualiza sola.

## Conectar la base de datos (cuentas de jugador), también gratis

**Ya está hecho:** el proyecto de Supabase es `el-perro` (organización *elperro*, región París) y sus datos ya están
en `docs/config.js`. Solo quedan dos ajustes que se hacen a mano en el panel de Supabase (pasos 3 y 4).
Lo de abajo sirve por si algún día hay que montarlo de nuevo.

Se usa [Supabase](https://supabase.com): da cuentas con correo y contraseña y una base de datos PostgreSQL.
Su plan gratuito sobra para un pueblo entero.

1. Entra en supabase.com, crea una cuenta y un proyecto nuevo (elige la región de Europa, por ejemplo Frankfurt o París).
2. **Crear la tabla**: en el proyecto, abre **SQL Editor**, pega el contenido de `supabase/esquema.sql` y pulsa **Run**;
   luego haz lo mismo con `supabase/progreso.sql`.
   Crea la tabla `jugadores` con una regla para que cada jugador solo pueda leer y cambiar su propia ficha.
3. **Dirección de la web**: en **Authentication → URL Configuration**, pon en *Site URL* la dirección de tu web
   (`https://somosdeguinaldo.github.io/`). Así los correos de confirmación y de «olvidé mi contraseña» vuelven al juego.
4. **Confirmar correo**: en **Authentication → Sign In / Providers → Email**, desactiva «Confirm email» para que se entre
   directamente al crear la cuenta. El correo que trae Supabase de serie solo escribe a los miembros de tu organización
   (y unos pocos correos por hora), así que con la confirmación puesta tus amigos no podrían crearse la cuenta.
   Si algún día quieres los correos de verdad (confirmar, «olvidé mi contraseña»), hay que poner un servicio de correo
   propio en **Authentication → Emails → SMTP Settings** (Resend o Brevo tienen plan gratis).
5. **Los dos datos**: en **Project Settings → API Keys** (o con el botón **Connect** del proyecto) copia *Project URL* y la
   *Publishable key* (`sb_publishable_…`; en proyectos antiguos, la *anon public*), y pégalos en `docs/config.js`:

   ```js
   window.PERRO_NUBE = {
     url: 'https://abcdefghijkl.supabase.co',
     clave: 'sb_publishable_...',
   };
   ```

   Esa clave es pública a propósito: lo que protege los datos son las reglas de la tabla.
   **Nunca** pongas la *secret key* ni la *service_role*.
6. Sube el `docs/config.js` cambiado a GitHub. En la puerta del bar aparecerá el posavasos **Tu cuenta**
   para crear la cuenta o entrar, y se abrirá la mesa con amigos.

## Qué se guarda de cada jugador

En la tabla `jugadores`, una fila por persona: su nombre («cómo te llaman en el bar») y su progreso en un campo JSON
(`progreso`):

- partidas jugadas, ganadas y perdidas, en total y por modo (1 contra 1 y 2 contra 2);
- juegos y vacas ganados y perdidos;
- chinas ganadas y perdidas, y número de jugadas;
- racha de victorias (la actual y la mejor);
- las partidas abandonadas: salir a mitad (o cerrar la app) después de jugar alguna jugada cuenta como perdida y
  corta la racha (en la mesa con amigos, recargar la página no, porque se vuelve a la misma partida);
- si ha hecho el tutorial, la fecha de la última partida…

**Nadie escribe su ficha a mano.** El juego no manda la ficha entera: manda lo que se acaba de jugar y la base de
datos lo suma con la función `apuntar_progreso` (`supabase/progreso.sql`), que comprueba que cuadre (chinas, juegos y
vacas de acuerdo con las jugadas, y no más jugadas de las que da tiempo a jugar). Así, dos móviles o dos pestañas a la
vez no se borran lo ganado, y sin cobertura lo pendiente se guarda en el móvil y se manda luego. Del nombre sí se puede
cambiar directamente (solo esa columna). Como el juego corre en el móvil de cada uno, esto no impide del todo las
trampas, pero ya no se puede poner cualquier cifra.

Si alguien juega sin cuenta y luego entra en la suya, se le suma lo que llevaba jugado en ese dispositivo.

## Jugar con amigos (la mesa del fondo)

En la puerta del bar, el papel de **«Se buscan jugadores»** pegado en la pizarra abre la mesa con amigos:
uno abre una mesa, le sale un código de cinco letras (y un enlace, `…/#mesa=K7QXM`), y los demás entran con el
código o tocando el enlace. Cada uno ve los motes de los que están sentados; las sillas libres las ocupa el ordenador.

Funciona con el mismo Supabase de las cuentas, **sin crear nada más**: usa *Realtime* (canales con presencia y
mensajes), que viene activado en todos los proyectos. Solo hay que tener puesto `docs/config.js`.

- Si al abrir una mesa sale «No se ha podido entrar en la mesa», mira en Supabase **Realtime → Settings** que esté
  activado **«Allow public access to channels»** (viene activado de serie).
- La librería de Supabase (`@supabase/supabase-js@2.117.3`) se descarga de jsDelivr solo cuando alguien abre la mesa.
- Quien abre la mesa lleva la partida: baraja y reparte en su móvil, y a cada uno le manda **solo sus cartas, cifradas**
  (los demás no reciben la baraja ni pueden calcularla). Si cierra la página, se acaba para todos.
- **Nadie puede hacerse pasar por otro**: cada móvil tiene su identidad (unas llaves que se guardan en él) y todo
  mensaje va firmado. El código de la mesa sale de la llave de quien la abre, así que solo él puede mandar como
  anfitrión; el enlace lleva además unas letras de más para comprobarlo mejor (`…/#mesa=K7QXM-ABCDEFG`).
- Si se va alguien, juega por él el ordenador hasta que vuelva **desde el mismo móvil** con el enlace. Si alguien entra
  con su mote desde otro móvil, no se le sienta solo: a quien abrió la mesa le sale un aviso para devolverle la silla.
- Nadie se queda esperando: si a alguien se le va la app a segundo plano o se le apaga el móvil, al acabarse su cigarro
  (y unos segundos más) se juega como si se le hubiera consumido; sin límite de tiempo, a los tres minutos decide el
  ordenador por esa vez.
- El plan gratuito de Supabase admite 200 conexiones a la vez (unas 50 mesas de cuatro) y 100 mensajes por segundo
  entre todas; una mesa manda uno o dos por segundo como mucho.
