# Seguimiento — Warm Up AD2026

Se actualiza al cerrar cada fase. Si el trabajo se corta a media fase, esto es lo que dice
dónde quedamos.

Última actualización: **15 de septiembre de 2026**.

---

## Dónde vamos

**Fase 3 — Pantalla del reclutador.** Terminada. En vivo:

- **https://warmup-ad2026.vercel.app/mesa** — sin contraseña, es la del QR
- **https://warmup-ad2026.vercel.app/admin/qr** — el QR imprimible

**Siguiente:** Fase 4 — vista de host. Decidido con Gustavo el 15-sep:

1. **Rejilla y lista, con interruptor.** La rejilla usa `RejillaMesas` para que el salón se
   lea igual que en admin. La lista va ordenada por estado, con las disponibles hasta arriba,
   que es lo que se busca cuando traes un estudiante al lado.
2. **Los mismos umbrales del reclutador**: ámbar a los 18, rojo a los 20. Si el reclutador ve
   rojo, el equipo ve rojo.
3. **Una mesa ocupada muestra empresa, estado y desde cuándo.** A quién se atendió no se
   guarda: el reclutador no registra nada.

Falta todavía, y no bloquea:

- **Etiquetar las carreras de 53 de las 54 empresas**, desde la ficha de cada una. Sin eso el
  filtro por carrera de la Fase 4 no filtra nada.
- **Reconectar GitHub.** `gh auth status` dice que el token de `Mrnrv32` está vencido.

## Fases cerradas

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

- **Las carreras de 53 de las 54 empresas están sin etiquetar.** Es captura manual desde la
  ficha de cada empresa. Sin eso, el filtro por carrera de la Fase 4 no sirve.
- `/host` sigue siendo marcador. Lo construye la Fase 4.
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
