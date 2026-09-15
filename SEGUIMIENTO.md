# Seguimiento — Warm Up AD2026

Se actualiza al cerrar cada fase. Si el trabajo se corta a media fase, esto es lo que dice
dónde quedamos.

Última actualización: **15 de septiembre de 2026**.

---

## Dónde vamos

**Fase 0 — Infraestructura.** Terminada del lado técnico. Faltan dos pasos que solo puede
hacer Gustavo:

1. **Crear la cuenta del equipo** en el panel de Supabase → Authentication → Users → Add user.
   Correo y contraseña los elige él; no se escriben aquí ni en el vault.
   Después hay que agregarla a la tabla `equipo` (ver
   `supabase/migrations/06_lista_del_equipo.sql`).
2. **Reconectar GitHub.** `gh auth status` dice que el token de la cuenta `Mrnrv32` está
   vencido. Sin eso no se puede crear el repo ni conectar Vercel.

Hasta que eso pase, la app corre en local con `npm run dev`.

**Siguiente:** Fase 1 — importador del Excel, Tablero, Mapa de mesas, Empresas, Reclutadores.

## Fases cerradas

### Fase 0 — Infraestructura · 15-sep-2026

- Proyecto Supabase `warmup-sep2026` (`vaowqzodsivdeqbqpcrn`, us-east-1), plan gratuito.
- Esquema completo, 7 migraciones, respaldadas en `supabase/migrations/`.
- Catálogo sembrado: 47 carreras en 6 escuelas, de la base nacional de junio 2026.
- Edición "Warm Up AD2026" creada, activa, 74 mesas, con las 6 franjas de cupo.
- App Vite + React con la piel CVDP: login, marco de admin y las pantallas marcadas
  como pendientes de su fase.
- Carpeta agregada a los filtros de Obsidian para que no indexe `node_modules`.

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

**Marcar Ocupado siempre reinicia el cronómetro.** Se tomó como "empezó una sesión nueva".
Si resulta molesto el día del ensayo, se cambia a que no reinicie si ya estaba ocupada.

## Lo que está a medias

Nada a medias. Las pantallas de admin, `/mesa` y `/host` son marcadores a propósito: dicen
qué fase las construye.

## Lo que se intentó y no funcionó

- **Probar RLS con `set local role anon` dentro de un solo bloque:** el primer error aborta la
  transacción y se pierde el resto. Hay que envolver cada prueba en su propio `begin/exception`
  y hacer `reset role` en los dos caminos.
- **Contar con `raise notice`:** el MCP de Supabase no devuelve los avisos. Los resultados se
  guardan en una tabla temporal y se hace `select` al final. El MCP solo devuelve el resultado
  de la última sentencia.
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

Contra estas cifras se verifica la Fase 1. La base todavía está vacía de empresas y
reclutadores: solo tiene el catálogo de carreras y las franjas de cupo.
