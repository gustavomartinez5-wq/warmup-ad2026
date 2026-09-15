# Seguimiento — Warm Up AD2026

Se actualiza al cerrar cada fase. Si el trabajo se corta a media fase, esto es lo que dice
dónde quedamos.

Última actualización: **15 de septiembre de 2026**.

---

## Dónde vamos

**La app está completa.** Quedan las seis pantallas de admin, la del reclutador y la de host.

| Pantalla | Link | Quién entra |
|---|---|---|
| Administración | https://warmup-ad2026.vercel.app/admin | cuenta del equipo |
| Vista de host | https://warmup-ad2026.vercel.app/host | cuenta del equipo |
| Reclutador | https://warmup-ad2026.vercel.app/mesa | nadie, es el QR |
| QR imprimible | https://warmup-ad2026.vercel.app/admin/qr | cuenta del equipo |

**Siguiente:** Fase 5, el ensayo. Se corre con Gustavo, dos teléfonos y una laptop: un host
mandando estudiantes imaginarios y dos reclutadores cambiando estados.

Antes del 28 conviene:

1. **Revisar el etiquetado de carreras.** Está en `supabase/carreras-asignadas.md`. Es criterio,
   no dato duro.
2. **Reconectar GitHub.** `gh auth status` dice que el token de `Mrnrv32` está vencido. El repo
   vive en local con nueve commits. Vercel despliega por CLI, así que solo falta el respaldo.
3. **Limpiar los estados de mesa** que queden de las pruebas, la mañana del evento.

## Fases cerradas

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

## Lo que está a medias

- **El etiquetado de carreras es criterio mío, sin revisar por Gustavo.** Está en
  `supabase/carreras-asignadas.md` para que lo lea. Lo más discutible: cuando una empresa
  dice «ingenierías en general» recibe las 22, biomédica incluida.
- Nada a medias en el código. Lo único abierto es criterio: el etiquetado de carreras
  necesita que Gustavo lo lea.
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

Del Excel de control, corte del Forms del 14-sep-2026 17:25 h con 61 registros, más la
confirmación de Management Solutions del 15.

| Indicador | Valor |
|---|---|
| Empresas registradas | 54 |
| Reclutadores Bloque 1 (10:00–13:00) | 71 |
| Reclutadores Bloque 2 (14:00–17:00) | 48 |
| Mesas apartadas | 71 de 74 |
| Capacidad del evento | 714 atenciones |
| Empresas con algo pendiente | 27 |

La base ya trae estas cifras cargadas y verificadas. Cuando entren registros nuevos, se
captura en el Excel como siempre y se vuelve a importar.
