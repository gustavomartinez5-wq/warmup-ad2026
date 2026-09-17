# Seguimiento — Warm Up AD2026

Se actualiza al cerrar cada fase. Si el trabajo se corta a media fase, esto es lo que dice
dónde quedamos.

Última actualización: **17 de septiembre de 2026**.

---

## Dónde vamos

**La app está completa, probada bajo carga y lista.** Faltan cosas de calendario, no de código.

| Pantalla | Link |
|---|---|
| Administración | https://warmup-ad2026.vercel.app/admin |
| Vista de host | https://warmup-ad2026.vercel.app/host |
| Reclutador, por el QR | https://warmup-ad2026.vercel.app/mesa |
| QR imprimible | https://warmup-ad2026.vercel.app/admin/qr |
| Hoja de papel | https://warmup-ad2026.vercel.app/admin/impreso |
| Latido de la base | https://warmup-ad2026.vercel.app/api/latido |

**Lo que falta, en orden:**

0. **Regenerar el mapa fijo si cambia una mesa.** `node scripts/hornear-mapa.mjs`, commitear y
   desplegar. `--verificar` dice si ya se quedó atrás; está en el preflight.

1. **Subir 7 commits.** `git push` falla con 403: git en esta máquina autentica como
   `tsunamipro-dev`, sin escritura en el repo. Lo corre Gustavo desde su terminal.
2. **Mesa 75 de Bloque 1.** El salón tiene 74 y Bloque 1 ocupa 75: hay que conseguir una mesa
   más o resolver Areya (ver «Hoja del equipo del 17-sep»).
3. **Correr el preflight en seco** una vez antes del 28. Está en `PREFLIGHT.md`.
4. **Los dos agentes de host en Sonnet**, para la parte de comprensión.

## Fases cerradas

### Hoja del equipo del 17-sep · 17-sep-2026

Gustavo pasó la hoja compartida del equipo (`Warm Up _Tecnológico de Monterrey…28 de
septiembre (1).xlsx`). No trae mesas: las asignó Claude, junto a su empresa cuando había lugar.
Se aplicó al libro de control con Excel COM (respaldo en `~/Downloads/… (respaldo antes de hoja
del equipo 17-sep).xlsx`) y la base se llevó a lo que lee el importador de ese libro.

| Cambio | Mesa |
|---|---|
| Index suma 3 personas en B1 (llega a 8) | 3, 4, 22 |
| Cydsa suma una segunda persona en B1 (ya estaba en el libro, no en la base) | 24 |
| GE Vernova suma una tercera persona en B1 | 74 |
| KATCON: la hoja repite un nombre y cuenta 3. Tercera «Por definir» | **75, excedente** |
| BBVA pasa a ambos bloques, por confirmar | B2-49 |
| BECK, empresa nueva: Arquitectura y construcción, carreras IC y ARQ | B2-50 |
| Sale EY de B1-24: estaba solo en la base; la hoja la pone solo en B2 | — |
| Areya: la hoja la pone en B2 y el Forms en B1. **Sigue en B1, por confirmar (ámbar)** | 33–35 |
| El recorrido de Celestica quedó también en el libro | — |

Cinco notas de empresa al día; los pendientes pasan de 27 a 28.

| Prueba | Resultado |
|---|---|
| Tablero del libro | 55 empresas · 75 en B1 · 51 en B2 · 756 de capacidad · 15 por confirmar |
| Lector de la app sobre el libro | 55 y 126, sin avisos |
| Libro contra base, fila por fila (md5) | Idénticos. 126 reclutadores, 55 empresas |
| Mesas repetidas | 0 |
| `hornear-mapa.mjs --verificar` | Al día: 75 y 51 |
| `/mesa` en producción a 390 px | B1 con 75, B2 con 51, sin scroll lateral ni errores |
| `npm run build` | Limpio |

**No se pudo ver `/host` ni `/admin/impreso`:** piden sesión y se denegó quitar la guardia en
local. `/mesa` usa los mismos datos.

**En la base hay una empresa «ELLAZ»** (Moda, una carrera, sin reclutadores), creada desde la app
el 17-sep a las 00:10. No está en el libro; el importador la avisaría como baja. No se tocó.

### Plan B: la app sirve aunque la base no conteste · 16-sep-2026

Gustavo preguntó qué le contesta a su jefa cuando pregunte «¿y si falla?». Lo que quería poder
decir era: aunque falle, seguimos viendo las mesas, quién está en cada una y el buscador.
**No era cierto todavía.** `/host` pedía todo a la base al abrir, así que sin base la pantalla
quedaba vacía, y hasta un Recargar normal la dejaba en blanco mientras esperaba.

Quién está en cada mesa no cambia durante el evento: se sabe desde días antes. Ahora eso viaja
horneado dentro de la app.

| Se cae | Qué se ve |
|---|---|
| El tiempo real | Todo. Hay que tocar Recargar |
| La base entera | El salón completo en gris, con buscador. Sin estados ni relojes |
| Todo | La hoja impresa |

- `scripts/hornear-mapa.mjs` genera `src/datos/mapa-fijo.json` —mesa, empresa, giro, carreras y
  el catálogo de 47 carreras— y con `--verificar` avisa si se quedó atrás. **Se commitea a
  propósito:** generarlo en el build de Vercel arriesga publicar un mapa vacío si ese día la
  base está pausada. 3.5 kB comprimido.
- `src/lib/mapaFijo.js` lo sirve a las pantallas. Todas las mesas salen en `sin_dato`.
- **`estadoVivo.js` pintaba de teal cualquier estado que no reconocía.** Sin arreglar eso, el
  mapa fijo habría mostrado las 119 mesas en verde y un host habría mandado estudiantes a mesas
  ocupadas. `sin_dato` tiene ahora rama propia en `pintar`, peso propio en la lista y su lugar
  en los conteos.
- `Enlace` tiene cuarto estado, `frio`: **Datos fijos**, en ámbar. Las pastillas de conteo se
  esconden mientras no se conozcan los estados: contar lo que no se sabe es peor que no contar.
- `?sinbase=1` finge la caída para poder probarlo desde un celular, sin herramientas de
  desarrollador. No es una pantalla aparte: hace fallar las mismas llamadas.
- `/admin/impreso`: dos hojas, una por bloque, del mismo JSON —así el papel y el celular no se
  pueden desfasar—. Quién está en cada mesa y a qué mesa mandar cada carrera.

**No se hizo, a propósito:** cola de escrituras sin conexión —un «Ocupado» que aterriza diez
minutos tarde pone un estado falso y arranca un reloj equivocado— y service worker, cuyo modo
de falla clásico es servir una versión vieja justo el día del evento.

**Verificado, renderizado a 375 px:**

| Prueba | Resultado |
|---|---|
| `hornear-mapa.mjs` contra la base | 70 en Bloque 1, 49 en Bloque 2, 47 carreras |
| `--verificar` después de generar | Al día |
| Datos de personas en el JSON | Ninguno. Ni un correo ni un teléfono |
| `/host` con la base caída | Las 70 mesas, empresas y buscador. Nada se ve verde |
| Buscar «IRS» sin base | «Ingeniería en Robótica y Sistemas Digitales — 32 mesas» |
| Vista de lista sin base | «Sin dato», punto gris |
| Cambiar de bloque con la base caída | El mapa fijo del bloque nuevo, no el del viejo |
| La base se cae **a media jornada** | Se quedan los últimos estados vivos, no el mapa fijo |
| `/mesa` sin base | Mesa 7, Cemex, y avisa que no va a guardar |
| Con la base normal | «En vivo», colores, relojes y escritura, igual que antes |
| Recargar | Ya no deja la pantalla en blanco |
| Errores de consola | Ninguno |
| `/admin/impreso` con estilos de impresión | Solo las hojas, tres columnas, legible |
| `npm run build` | Limpio. El paquete sube 3 kB comprimidos |

**Lo que se encontró al hacerlo:** `sembrada` se recalculaba en cada render y entraba en las
dependencias de `traer`, así que el efecto del canal se habría remontado sin parar. Se memorizó.
Y el semáforo en frío traía un «reconectar» que duplicaba el «Reintentar» de la banda y apretaba
el encabezado hasta partir el título; se quitó.

### El plan gratuito aguanta, y el latido · 16-sep-2026

Gustavo dio los números reales del evento: 10:00 a 17:00, 70–75 reclutadores, unos 400
estudiantes. La cuenta, con los estudiantes contando como cero porque no tocan la app:

| | |
|---|---|
| Escrituras en todo el día | ~1,650, una cada 13 segundos |
| Mensajes de tiempo real | ~6,600 en todo el día |
| Contra el tope de 100 por segundo | usamos 0.31 — **327 veces de margen** |
| Contra los 2 millones al mes | usamos 0.33% de la cuota |
| Contra las 200 conexiones | usamos ~81 |

El peor momento realista —cambio de turno, todos terminando en dos minutos— son 2 mensajes por
segundo. El 16-sep se midió el sistema a 540 sin perder uno. **No hace falta Supabase Pro.**

**El riesgo real resultó ser otro, y es de calendario.** Supabase pausa los proyectos gratuitos
que pasan 7 días con poca actividad. Del corte del registro al 28 puede haber una semana muerta,
y un proyecto pausado la mañana del evento no levanta sin restaurarlo a mano.

Se resolvió con `api/latido.js` y una entrada de cron en `vercel.json`: una vez al día hace tres
consultas de lectura contra la base. Verificado en producción — responde con la edición, la
fecha, las 47 carreras y las 70 mesas del Bloque 1, y el rewrite de la SPA sigue intacto porque
la regla ahora excluye `/api/`.

También quedó `PREFLIGHT.md`: la lista de 15 minutos para la mañana del 28. El paso que no se
puede saltar es el 5, probar `/mesa` y `/host` **en la red de Centrales Norte**, no en la
oficina: es lo único que no se puede verificar desde el escritorio.

**Se canceló la prueba de lectura bajo escritura.** Se había diseñado cuando el tope de mensajes
parecía un riesgo; con 327 veces de margen respondía una pregunta que ya no existe.

### Ensayo de carga y primer agente · 16-sep-2026

Se abrieron **72 websockets reales** contra Supabase —uno por teléfono, con el mismo canal y
filtro de `src/pages/Mesa.jsx`, más dos hosts sin filtro como `src/pages/Host.jsx`— y se
escribió por `set_estado_mesa`, el camino del botón. El arnés está en `scripts/arnes-carga.mjs`
con cuatro escenarios: `apertura`, `regimen`, `rafaga`, `bloque`.

| Escenario | Conexiones | Escrituras | Fallas | Pico msg/s | Perdidos |
|---|---|---|---|---|---|
| Apertura, todos a la vez | 72 en 1.1 s | 70 | 0 | 210 | 0 |
| Régimen, 3 min de ritmo real | 72 | 388 | 0 | **12** | 0 |
| Ráfaga deliberada | 72 | 350 | 0 | **540** | 0 |
| Cambio de bloque | 123 | 119 | 0 | 210 | 0 |

**El tope de 100 mensajes por segundo no muerde.** En régimen normal el pico fue de 12, ocho
veces por debajo. Y en la ráfaga se llegó a 540 —cinco veces el tope documentado— sin perder
un solo mensaje ni fallar una escritura. La advertencia que quedó anotada el 15-sep queda
**resuelta: no hace falta subir a Supabase Pro.**

Conectar 72 teléfonos tomó 1.1 segundos, mediana de 346 ms. La apertura del salón no es problema.

**Convergencia de la pantalla real:** con la carga corriendo encima, la vista de host en
producción se comparó contra la base al parar. 21 disponibles, 34 ocupadas, 15 en break en las
dos, y mesa por mesa idénticas, sin una sola recarga.

#### El semáforo de conexión · 16-sep-2026

Gustavo preguntó qué pasa si alguien machaca recargar creyendo que la app se congeló.
Medido: **una recarga de `/mesa` cuesta 1 petición** a Supabase (112 ms) y 1 KB de Vercel,
porque el resto sale de caché. Por ahí no hay riesgo.

El riesgo estaba en otro lado. Las dos pantallas se suscribían con `.subscribe()` **sin
callback**: si el websocket se caía —mal wifi, o el tope de 200 conexiones— la pantalla se
veía idéntica y solo dejaba de actualizarse. Un host con números viejos manda estudiantes a
mesas ocupadas, y nadie se entera. Y una pantalla que parece congelada es justo lo que hace
que la gente machaque recargar.

Ahora las dos traen `src/components/Enlace.jsx`: un punto y una palabra —Conectando, En vivo,
Sin conexión— y cuando se cae, un botón de reconectar que re-monta el canal sin recargar la
página.

#### Lo que encontró el agente reclutador

Se lanzó un agente con el papel y la liga, sin manual. Encontró lo que ningún script encuentra:

| Hallazgo | ¿Real? |
|---|---|
| Una empresa con dos mesas se ve idéntica dos veces; no sabe cuál es la suya | **Sí** — corregido |
| La lista no decía el estado de cada mesa | **Sí** — corregido |
| Las instrucciones empezaban por Ocupado cuando lo primero es Disponible | **Sí** — corregido |
| No decía en ningún lado que la sesión dura 20 minutos | **Sí** — corregido |
| Nunca se dice dónde encontrar el número de mesa | **Sí** — corregido |
| Cualquiera puede abrir y controlar la mesa de otro | **Sí, por diseño.** Decisión de Gustavo |
| El break no lleva reloj | Sí, por diseño |
| «El buscador se queda pegado» | No. Verificado: 49 → 2 → 49 |
| «Bloque 1 no muestra mesas» | No. Verificado: muestra sus 70 |
| «Ningún botón aparece marcado al entrar» | No, sí está marcado — pero el anillo era tan sutil que un agente mirando fijo no lo vio. Se hizo cian |

Lo corregido: las tarjetas del selector ahora muestran el estado —que distingue dos mesas de
la misma empresa y avisa antes de entrar donde alguien trabaja—, las instrucciones van en el
orden en que se usan y dicen los 20 minutos, la primera línea dice que el número está en el
acrílico, y el anillo del botón activo pasó a cian.

**Falta correr los dos agentes de host.** El del reclutador dio suficiente material para una
tanda de correcciones; los de host se corren después de que Gustavo decida sobre lo de las
dos mesas.

### Simulación del evento · 15-sep-2026

Se corrió el Bloque 1 completo —71 mesas— con la vista de host abierta y un reclutador real
en la mesa 7, moviendo estados por el mismo camino que usa el teléfono. El guion vive en
`scripts/simular-evento.mjs` y se puede repetir: `poblar`, `correr`, `rafaga`, `limpiar`.

| Prueba | Resultado |
|---|---|
| Poblar 71 mesas con una foto realista | 43 ocupadas, 8 break, 5 no llegaron, 15 disponibles |
| Colores contra las pastillas | Cuadran exacto en las cinco tomas |
| Dos minutos de movimiento | 574 cambios, 0 fallas, mediana 92 ms, peor 299 ms |
| Ráfaga de las 71 a la vez | 683 ms en total, 0 fallas, peor 679 ms |
| La pantalla siguió el ritmo | Sí, sin recargar y sin desfasarse |
| Teléfono del reclutador | Se sincronizó solo con lo que hizo el guion |
| Salón entero en ámbar y luego en rojo | Legible, sin desbordes |
| Buscar «IRS» con 5 mesas libres | 50 mesas de esa carrera, las 4 libres hasta arriba |
| Errores de consola | Ninguno de la app |

**Lo que la simulación destapó y ya se corrigió:**

- **El parpadeo de la rejilla se quitó.** Con 71 mesas pasadas de 20 minutos, las 71
  parpadeaban juntas y la pantalla entera latía: dejaba de resaltar nada, que es justo lo
  contrario de para lo que existe. Ahora en la rejilla y en la lista el rojo es fijo, y la
  pastilla «pasadas de 20» lleva la cuenta. El parpadeo se quedó donde hay un solo reloj: la
  pantalla del reclutador y la hoja de detalle.
- **Se agregó «Recargar» a la vista de host**, por lo del tope de mensajes.

### Fase 2 — Cupos y pendientes · 15-sep-2026

- `/admin/cupos`: las seis franjas como tarjetas, con reclutadores, capacidad, cupo CV y
  cupo entrevista calculados, los dos campos de registro editables y el semáforo. Arriba, los
  supuestos —atenciones por hora y % para CV— también editables: cambiarlos recalcula todo.
- `/admin/pendientes`: los 27 del Excel, con pestañas de abiertos y resueltos y buscador.
  Resolver no borra: marca. Una reimportación respeta lo resuelto.
- El Tablero suma dos cifras: pendientes abiertos y empresas sin carreras etiquetadas.

**Verificado contra la hoja Cupos del Excel:**

| Prueba | Resultado |
|---|---|
| Capacidad total | 714, igual que el Excel |
| Franja de Bloque 1 | 71 reclutadores, 142 capacidad, 85 CV, 57 entrevista |
| Registrar 130 de 142 | Semáforo «Por cerrar», 12 disponibles |
| Registrar 140 de 142 | Semáforo «Lleno», 2 disponibles |
| Volver a 0 | «Abierto», 142 disponibles |
| Supuestos a 3 por hora y 50% | Capacidad 1071, cupos 107 y 106 |
| Supuestos de vuelta a 2 y 60% | 714, 85 y 57 |
| Pendientes cargados | 27 abiertos, igual que el Tablero del Excel |
| Resolver uno y reimportar el Excel | Sigue resuelto, y las 1,101 etiquetas intactas |
| Las dos pantallas a 375 px | Sin desbordes, sin errores de consola |

### Etiquetado de carreras · 15-sep-2026

Las 54 empresas quedaron etiquetadas contra la lista cerrada de 47 carreras, leyendo lo que
cada una escribió en el Forms. El criterio es amplio a propósito, como lo pidió Gustavo: una
empresa que pide «Ing. de Calidad» recibe IIS, IQ e INA; una que pide «negocios y análisis de
datos» recibe BGB, LIT, LAE, LAF, LEC e IDM.

- El mapeo está en `supabase/carreras-por-empresa.sql`, con grupos reutilizables
  (`ing`, `manuf`, `tec`, `neg`, `todas`) para que se lea y se corrija fácil.
- La tabla de revisión, con lo que dijo cada empresa al lado de lo que recibió, está en
  `supabase/carreras-asignadas.md`.
- **IIS/BIE, IMT/BME y LIN/BGB son la misma carrera en planes distintos.** Se etiquetan las
  dos para que el filtro encuentre a la empresa sin importar cuál traiga la matrícula.

| Prueba | Resultado |
|---|---|
| Empresas sin etiquetar | 0 de 54 |
| Nombres que no cruzaron entre el mapa y la base | 0 |
| Carreras sin ninguna empresa | 0. La que menos tiene son 4 |
| Filtro ARQ en `/host` | Devuelve solo las de arquitectura |
| Filtro IDM en Bloque 2 | 16 empresas |
| Etiquetas totales | 1,101 |

Las más pedidas: IIS y BIE con 42 empresas, LAE con 40, ISD con 39. Las menos: LBC, LNB y LTM
con 4, y solo porque cuatro empresas dijeron «todas las carreras». Ninguna empresa pidió
producción musical ni nutrición por su nombre.

### Fase 4 — Vista de host · 15-sep-2026

- `/host` con dos vistas y un interruptor: rejilla —el salón, con `RejillaMesas`— y lista
  ordenada por estado con las disponibles arriba.
- Buscador por empresa o número, y filtros por carrera y por giro.
- Cuatro botones de estado, «No llegó» incluido, para los cambios de último minuto.
- Pastillas de conteo arriba, con una de «pasadas de 20» que solo aparece cuando hay alguna.
- `src/lib/estadoVivo.js` decide el color: la mesa ocupada escala de azul a ámbar a rojo con
  el tiempo, y break va en ámbar punteado para no confundirse con una sesión pasada.

**Verificado con los datos reales:**

| Prueba | Resultado |
|---|---|
| Reclutador marca Ocupado en `/mesa` | `/host` lo pinta azul con el reloj, sin recargar |
| Host marca Break | El teléfono del reclutador lo muestra, sin recargar |
| Host marca «No llegó» | La mesa se apaga y la pastilla sube a 1 |
| Filtro por carrera LAF | Devuelve solo las dos mesas de British American Tobacco |
| Filtro por giro Financiero | Devuelve solo BBVA México |
| Vista de lista | Disponibles arriba, luego break, luego ocupadas |
| Rejilla a 375 px y a 1280 px | 3 y 12 columnas, sin desbordes |
| Conteos de las pastillas | Cuadran con lo que se ve |
| Buscar «IRS» | 16 empresas, 31 mesas, con la carrera nombrada debajo |
| Buscar «robotica» sin acento | Encuentra IRS e ISD |
| Buscar «mecatronica» | Encuentra IMT y BME |
| Buscar «consultoria» | Filtra por giro |
| Buscar «PwC» | Una empresa |

### Fase 3 — Pantalla del reclutador · 15-sep-2026

- `/mesa`: elige número de mesa y se queda en ella aunque recargue. La mesa elegida vive en
  el `localStorage` del teléfono, no en la base.
- Cronómetro calculado desde `ocupado_desde`, nunca desde un contador en memoria.
- `/admin/qr`: un QR para todas las mesas, imprimible y descargable como PNG.
  Los estilos de impresión dejan solo la hoja blanca.
- `src/lib/reloj.js` tiene los umbrales, y los va a usar igual la vista de host.

**Verificado con los datos reales:**

| Prueba | Resultado |
|---|---|
| Entrar a `/mesa` sin sesión | Carga la lista del bloque del reloj |
| Elegir mesa y recargar | Vuelve a su mesa, el tiempo sigue corriendo |
| 18 min 30 s | Ámbar, sin parpadear |
| 20 min 22 s | Rojo parpadeante y «00:22 de más» |
| 23 min | Rojo fijo y «03:12 de más» |
| Disponible | Para el reloj y lo deja en 00:00 |
| Cambio hecho desde la base | Llega por realtime, sin recargar |
| Dos pestañas con mesas distintas | Cada una con su estado, sin pisarse |
| `/mesa` a 375 px | Sin desbordes, sin errores de consola |
| `/mesa` en el sitio publicado | Carga la lista con la clave pública |

### Fase 1 — Admin · 15-sep-2026

- Importador del libro de control, leído en el navegador con SheetJS. Vista previa de altas,
  cambios y bajas antes de aplicar. El libro nunca se escribe.
- Tablero, mapa de mesas por bloque, empresas con ficha y etiquetado de carreras,
  y tabla de reclutadores editable.
- `src/lib/cifras.js` calcula con las mismas fórmulas del Tablero del Excel.
- `scripts/verificar-importacion.mjs` corre el mismo código que el navegador y compara
  contra las cifras del Excel.

**Verificado con el libro real, corte del 15-sep:**

| Cifra | App | Excel |
|---|---|---|
| Empresas | 54 | 54 |
| Reclutadores Bloque 1 | 71 | 71 |
| Reclutadores Bloque 2 | 48 | 48 |
| Mesas apartadas | 71 | 71 |
| Capacidad | 714 | 714 |
| Nombres por confirmar | 10 | 10 |

Además: 3 mesas libres —la 3, la 4 y la 74, igual que dice el panel del vault—, 7 reclutadores
sin nombre y ninguno sin mesa.

| Prueba | Resultado |
|---|---|
| Reimportar el mismo libro | 0 altas, 0 cambios, 54 sin cambio. No duplica |
| Carreras etiquetadas tras reimportar | Sobreviven |
| Fila TOTAL de la hoja Empresas | Se salta. Lee 54, no 55 |
| Mesa 76 con el salón en 74 | Tablero y mapa la marcan en rojo, y la 75 también |
| Botón "Ya la conseguí" | El total sube a 75 y el rojo de la 75 se apaga |
| Mesa repetida en el mismo bloque | El editor avisa y no deja guardar |
| Subir un archivo por el input del navegador | Lee y compara bien |
| Bajas en la vista previa | Avisa las 54 y no borra nada |
| Todas las pantallas a 375 px | Sin desbordes |
| Mapa por columna a 375 px | 3 columnas que arrancan en 1, 26 y 51 |
| Mapa por columna a 1280 px | 11 columnas de 7 que arrancan en 1, 8, 15, 22… |

### Fase 0 — Infraestructura · 15-sep-2026

- Proyecto Supabase `warmup-sep2026` (`vaowqzodsivdeqbqpcrn`, us-east-1), plan gratuito.
- Esquema completo, 7 migraciones, respaldadas en `supabase/migrations/`.
- Catálogo sembrado: 47 carreras en 6 escuelas, de la base nacional de junio 2026.
- Edición "Warm Up AD2026" creada, activa, 74 mesas, con las 6 franjas de cupo.
- App Vite + React con la piel CVDP: login, marco de admin y las pantallas marcadas
  como pendientes de su fase.
- Carpeta agregada a los filtros de Obsidian para que no indexe `node_modules`.
- Desplegada en Vercel, proyecto `warmup-ad2026`, cuenta `gustavomartinez5-1840`.
  Producción: https://warmup-ad2026.vercel.app — pública y sin protección, como se pidió.

**Verificado:**

| Prueba | Resultado |
|---|---|
| `anon` lee empresas, reclutadores, pendientes, cupos, empresa_carreras | Bloqueada |
| `anon` lee carreras, ediciones, mesas_estado | Ve lo que debe |
| `anon` lee `ediciones.total_mesas` | Bloqueada |
| `anon` llama `mesas_publicas` | Funciona |
| `anon` marca ocupada una mesa asignada | Funciona |
| `anon` marca una mesa que no existe | Rechazada |
| `anon` escribe `mesas_estado` directo | Rechazado |
| `anon` inserta una empresa | Rechazado |
| Cuenta con sesión fuera de `equipo`: lee, escribe, se mete a `equipo` | Nada, nada, rechazado |
| `npm run build` | Limpio |
| `/admin` sin sesión | Manda a `/entrar` |
| Contraseña equivocada | "Ese correo y esa contraseña no coinciden." |
| Login y `/mesa` a 375 px | Se ven bien, sin errores de consola |
| Marco de admin a 375 px | La página no desborda; solo las pestañas hacen scroll |
| `/admin`, `/mesa`, `/host` en el sitio publicado | 200, el rewrite de SPA funciona |
| Contraseña equivocada en el sitio publicado | Rechaza bien: el sitio sí habla con Supabase |
| `edicionActiva()` y `mesas_publicas` por HTTP con la clave publicable | Responden |

## Decisiones que se tomaron sobre la marcha

**La tabla `equipo` y la función `es_equipo()`.** No estaba en el plan. Salió al ver que el
repo público expone la clave anónima y que Supabase permite registrarse con ella: cualquiera
habría quedado como `authenticated`, y las políticas originales le daban acceso completo.
Ahora hace falta estar en una lista que solo se toca por SQL. Candidata a `DEC-NNN`.

**Permisos por omisión apagados.** Supabase concede acceso a `anon` y `authenticated` en toda
tabla nueva del esquema `public`. Una tabla que se cree después y se olvide revocar queda
abierta en silencio. Se apagó con `alter default privileges` (migración 07).

**Inter en vez de Neue Haas.** Neue Haas está licenciada y el repo es público. Inter es
neo-grotesca como ella. Es la única desviación consciente del sistema de diseño.
Vale la pena avisarle a Gustavo.

**La cuenta del equipo la crea Gustavo, no Claude.** Así la contraseña no pasa por el chat ni
queda escrita en un vault que se abre en pantalla compartida.

**La clave publicable vive en `src/lib/config.js`, no solo en variables de entorno.**
Se lee igual desde el paquete compilado, así que esconderla no aporta nada: lo que protege
los datos es el RLS. Dejarla en el código quita un paso que puede faltar en un despliegue
el día del evento. Las variables de entorno siguen mandando cuando existen.

**Marcar Ocupado siempre reinicia el cronómetro.** Se tomó como "empezó una sesión nueva".
Si resulta molesto el día del ensayo, se cambia a que no reinicie si ya estaba ocupada.

**Los reclutadores se reemplazan enteros en cada importación; las empresas se actualizan.**
En la tabla de reclutadores no vive nada capturado desde la app, así que borrar e insertar es
más simple y no pierde nada. Las empresas sí guardan las carreras etiquetadas, por eso van
por upsert conservando su id.

**Los pendientes salen de la columna Notas de la hoja Empresas, no de la lista del Tablero.**
Esa columna es la que el Tablero cuenta para "Empresas con algo pendiente" y da 27. La lista
de viñetas del Tablero trae 21 y está escrita a mano.

**Mesas apartadas se cuenta como mesas distintas usadas, no como MAX de los dos bloques.**
El Excel usa `MAX(B1, B2)` y hoy las dos dan 71. Contar las distintas es más honesto si algún
día los bloques usan numeraciones separadas.

**SheetJS se carga aparte.** Pesa 375 kB. Cargarlo solo al abrir la importación deja la
pantalla del reclutador y la del host en la mitad del peso, que es lo que importa el 28.

**Los supuestos de cupo son editables desde la app.** El Excel los tiene como celdas sueltas
en la hoja Cupos; aquí viven en `ediciones` y cambiarlos recalcula las seis franjas. El
semáforo usa umbrales que el Excel no traía: menos de 70% Abierto, de 70 a 95% Por cerrar,
95% o más Lleno.

**Resolver un pendiente no lo borra.** La reimportación vuelve a leer las notas del Excel,
así que borrarlos los traería de vuelta al día siguiente. Marcarlos resueltos es lo que
sobrevive.

**El buscador de `/host` entiende carreras, no solo empresas.** Escribir «IRS» saca las 16
empresas que la buscan. Las siglas se comparan por principio —«IM» encuentra IM, IMA, IMD e
IMT— y el nombre completo por cualquier parte, sin acentos: «robotica» llega a IRS y a ISD.
Debajo del buscador sale qué carrera reconoció, para que quede claro por qué salió esa lista.
Los dos selectores siguen ahí para cuando se quiere hojear en vez de buscar.

**La mesa ocupada cambia de color con el tiempo, no solo el número.** Azul mientras va bien,
ámbar a los 18 y rojo pasados los 20. El salón se lee de reojo y las que llevan mucho saltan
solas, que es para lo que existe esa pantalla.

**Break va en ámbar punteado y sin cronómetro.** Ámbar también marca los 18 minutos, así que
sin esa diferencia una mesa en break y una que ya se pasó se veían igual.

**El reclutador tiene tres botones, no cuatro.** El plan decía cuatro, con «No llegó».
Ese estado no tiene sentido en su propio teléfono: si lo está tocando, llegó. Es una
observación del equipo sobre una mesa vacía, así que el botón vive en `/host`. El estado
`no_llego` existe igual en la base.

**La mesa elegida se guarda en el teléfono, no en la base.** Así dos personas pueden usar la
misma mesa desde distintos aparatos sin pelearse, y perderla no rompe nada: se vuelve a elegir.

**El bloque sale del reloj, con el corte a la 13:30, y el interruptor es por aparato.**
Un interruptor global habría necesitado columna nueva y podía dejar a todo el salón en el
bloque equivocado por un descuido. Si el evento se recorre mucho, la Fase 4 puede agregar uno
del lado del equipo.

**Parpadea solo el minuto 20.** De 21 en adelante el rojo se queda fijo: lo que importa
después es cuánto lleva de más, y un número parpadeando media hora deja de verse.

**El mapa de mesas se llena por columna, no por renglón.** Gustavo lo pidió con un dibujo:
1, 2, 3 bajando por la primera columna y el 8 arriba de la segunda. Vive en
`src/components/RejillaMesas.jsx`: fija los renglones según el ancho real del contenedor y
deja que las columnas salgan solas con `grid-auto-flow: column`. En celular da 3 columnas de
25; en laptop, 11 de 7. **La vista de host de la Fase 4 tiene que usar el mismo componente.**

**Estatus `cancelado` agregado al enum.** El Tablero del Excel ya lo descuenta
(`Reclutadores!F:F,"<>Cancelado"`). Hoy no hay ninguno, pero la importación tenía que aguantarlo.

## Cambios hechos a mano, fuera del Excel

### Celestica pasa completa a Bloque 2 · 15-sep-2026

**Replicado en el libro el 17-sep-2026.** Ya no se pierde al reimportar.

Gustavo avisó que Celestica ya no viene en Bloque 1. Claudia Villarreal estaba en la mesa 22
de Bloque 1 y Mario Gerardo Mata en la 22 de Bloque 2; ahora van los dos en Bloque 2.

Como la 21 y la 23 estaban ocupadas, se **recorrió** el tramo para que queden juntos:

- **Bloque 2, mesas 23 a 47: cada una sube un número**, y pasan a ser 24 a 48. La 48 estaba
  libre, así que el recorrido para ahí y nadie más se mueve.
- Claudia queda en la **mesa 23 de Bloque 2**, junto a Mario en la 22.
- La **mesa 22 de Bloque 1 queda libre.**

| Antes | Después |
|---|---|
| Bloque 1: 71 reclutadores | 70 |
| Bloque 2: 48 reclutadores | 49 |
| Libres en Bloque 1: 3, 4, 74 | 3, 4, **22**, 74 |
| Capacidad: 714 | 714, no cambia |

Verificado: 0 mesas repetidas dentro de un bloque, Celestica no aparece en Bloque 1 y sale dos
veces seguidas en Bloque 2.

**Esto vive solo en la base.** Para que sobreviva a una reimportación hay que hacer lo mismo en
la hoja `Reclutadores` del Excel: mover la fila de Claudia a Bloque 2 con mesa 23, y sumarle 1
a la columna Mesa de las filas de Bloque 2 que hoy digan de 23 a 47.

## El tope del plan gratuito de Supabase

**Resuelto el 16-sep:** el ensayo llegó a 540 mensajes por segundo sin perder nada. Lo que
sigue abajo se deja como referencia de los límites, pero no es un riesgo abierto.

Las cifras del plan Free, confirmadas en la documentación el 15-sep-2026:

| Límite | Free | Dónde quedamos |
|---|---|---|
| Conexiones simultáneas | 200 | ~80 el día del evento. Holgado |
| Mensajes de tiempo real por segundo | 100 | Una ráfaga lo pasa |

Cada cambio de estado se reparte a cada pantalla suscrita: un host mirando y el reclutador de
esa mesa. Con 71 reclutadores tocando el botón en el mismo segundo y varios hosts abiertos, la
ráfaga se pasa de 100 mensajes.

**Las escrituras nunca están en riesgo:** van por REST, no por tiempo real. Lo peor que pasa
es que la pantalla de host se atrase unos segundos. Por eso tiene botón de Recargar.

En régimen normal —dos a cinco cambios por segundo— no se acerca al tope. La decisión de subir
a Pro (500 mensajes por segundo) es de Gustavo; en la simulación no hizo falta.

## Lo que está a medias

- **El etiquetado de carreras quedó revisado y aprobado por Gustavo el 16-sep-2026.**
  La tabla sigue en `supabase/carreras-asignadas.md` por si hay que ajustar alguna.
- Nada a medias en el código.
- Cupos y Pendientes son marcadores. Los datos de pendientes ya están importados.

## Lo que se intentó y no funcionó

- **Probar RLS con `set local role anon` dentro de un solo bloque:** el primer error aborta la
  transacción y se pierde el resto. Hay que envolver cada prueba en su propio `begin/exception`
  y hacer `reset role` en los dos caminos.
- **Contar con `raise notice`:** el MCP de Supabase no devuelve los avisos. Los resultados se
  guardan en una tabla temporal y se hace `select` al final. El MCP solo devuelve el resultado
  de la última sentencia.
- **`edicionActiva()` pedía `select('*')`:** `anon` no puede leer `ediciones.total_mesas`,
  así que la consulta fallaba entera y la pantalla se quedaba en "Cargando" para siempre,
  sin decir por qué. Habría reventado la pantalla del reclutador en la Fase 3. Ahora hay dos
  funciones —`edicionActiva()` con las columnas públicas y `edicionCompleta()` para el
  equipo— y `Cargando` tiene estado de error.
- **Copiar el `.xlsx` a `public/` para probar la subida desde el navegador:** el entorno lo
  bloqueó, y con razón — ese libro trae correos y celulares de 54 empresas y `public/` se
  publica entero. Se resolvió de dos maneras: el importador se verificó desde Node con el
  libro en su lugar, y el camino del navegador con un libro sintético de dos empresas
  inventadas.
- **Los tres controles de filtro en un solo renglón:** a 375 px el buscador quedaba en
  cuarenta píxeles, ilegible. Se vio al renderizar, no en el código. Ahora el buscador va
  completo arriba y los dos selectores debajo, a la mitad cada uno.
- **Probar el QR con la cuenta de prueba:** no hizo falta. Esa pantalla no lee nada de la
  base, así que se verificó quitando la guardia en local y restaurándola.
- **Dos pestañas del mismo navegador para simular dos teléfonos:** comparten `localStorage`,
  así que la segunda hereda la mesa de la primera. Se resuelve tocando «Esta no es mi mesa».
  En teléfonos distintos no pasa.
- **`raise notice` para depurar SQL:** el MCP no devuelve los avisos ni los resultados
  intermedios, solo el de la última sentencia.
- **Primera prueba de escritura del intruso:** dio "pasó" por un falso positivo. El insert
  usaba un subselect sobre `ediciones`, que bajo RLS devolvía cero filas, así que insertaba
  cero y nunca disparaba el `with check`. Con un valor literal, rechaza bien.

## Números del último corte

Del Excel de control, con la hoja del equipo del 17-sep-2026 (Forms con 62 registros).

| Indicador | Valor |
|---|---|
| Empresas registradas | 55 |
| Reclutadores Bloque 1 (10:00–13:00) | 75 |
| Reclutadores Bloque 2 (14:00–17:00) | 51 |
| Mesas apartadas | 75 de 74 — falta una |
| Capacidad del evento | 756 atenciones |
| Empresas con algo pendiente | 28 |

La base ya trae estas cifras cargadas y verificadas. Cuando entren registros nuevos, se
captura en el Excel como siempre y se vuelve a importar.
