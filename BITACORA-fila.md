# Bitácora — La fila del día del evento

Se escribe al cerrar cada fase. Si el trabajo se corta a media fase, esto es lo
que dice dónde quedamos.

Última actualización: **21 de septiembre de 2026**, con los textos ajustados al recorrido
real del día. Fases 0, 1, 2, 4 y 5 cerradas; falta la 3, que pide cuenta del equipo.

---

## Qué es esto

La fila para el estudiante que llega el 28 y tiene que esperar. Un turno es un
número: ni nombre, ni matrícula, ni carrera. La restricción que manda es que no
pueden subir datos de estudiantes a Supabase ni a Vercel, y la forma de cumplirla
es no tenerlos. La identidad la pone la persona al presentarse en la mesa, y los
datos para indicadores los captura Gustavo aparte, en Excel o Forms.

| Ruta | Quién | Acceso |
|---|---|---|
| `/turno` | estudiantes | por el QR de la entrada, sin login |
| `/fila` | host de lista de espera (Cecilia) | sesión + estar en `equipo` |

---

## Dónde vamos

| Fase | Qué | Estado |
|---|---|---|
| 0 | Código | ✅ 18-sep |
| 1 | Migración en la base | ✅ 18-sep |
| 2 | Verificar al estudiante | ✅ 18-sep |
| 3 | Verificar a Cecilia | ⬜ pide cuenta del equipo — es de Gustavo |
| 4 | `git push` y producción | ✅ 18-sep |
| 5 | Dejar el repo al día | ✅ 18-sep |
| 6 | Quitar el conteo de personas delante | ✅ 21-sep |
| 7 | Ceder turno (migración 10) | ✅ 21-sep |
| 8 | Verificar y desplegar 6 y 7 | ✅ 21-sep |
| 9 | Simulación con agentes Sonnet: guion, agentes, reporte | ✅ 21-sep |
| 10 | Documentación: `CLAUDE.md` y decisiones | ✅ 21-sep |
| 11 | Pantallas del estudiante según el reporte marcado | ✅ 21-sep, sin desplegar |
| 12 | `/fila` según el reporte, y estado «Cedió su turno» (migración 11) | ⬜ |
| 13 | Verificar, desplegar y dejar la documentación al día | ⬜ |

**Fases 6 a 10**, del 21-sep, salen de tres observaciones de Gustavo: no decir
cuántos van delante, un botón para ceder el turno (queda como «No llegó») y una
simulación con agentes para saber si los textos confunden. El plan completo está al
final, en *Plan del 21-sep*. **La fase 3** sigue siendo de ustedes: pide sesión.

---

## Fase 0 — Código · 18-sep

| Archivo | Qué |
|---|---|
| `supabase/migrations/09_lista_de_espera.sql` | Tabla `turnos`, `sacar_turno`, `mi_turno`, `pool_de`, política del equipo |
| `src/lib/fila.js` | Servicios, umbral, los dos wrappers sin sesión, el turno en el celular |
| `src/lib/alerta.js` | Sonido, vibración y pantalla encendida |
| `src/pages/Turno.jsx` | `/turno`, sin sesión. Sacar turno y esperar |
| `src/pages/Fila.jsx` | `/fila`, detrás de `Protegida` |
| `src/App.jsx` | Las dos rutas |

Sigue el patrón de `/mesa`: la tabla nace cerrada por la migración 07 y anon
entra solo por dos funciones `SECURITY DEFINER`. `mi_turno` devuelve un renglón
y pide el uuid completo, así que un teléfono no puede listar la fila ni leer el
turno de otro.

---

## Fase 1 — La base · 18-sep

**La migración 09 está aplicada en producción** (`vaowqzodsivdeqbqpcrn`), no en
una rama: branching pide plan Pro y el proyecto está en Free.

Se aplicó a producción porque la migración es aditiva —tres tipos, una tabla, tres
funciones, dos índices y una política, todo nuevo— y no modifica ni un objeto de
los que ya existían. Lo único que toca algo previo es agregar `turnos` a la
publicación de tiempo real.

Deshacerla, si alguna vez hiciera falta:

```sql
drop table if exists turnos;
drop function if exists sacar_turno(servicio_t), mi_turno(uuid), pool_de(servicio_t);
drop type if exists servicio_t, turno_t, destino_t;
```

**La tabla quedó vacía.** Los turnos de prueba de la fase 2 se borraron al
terminar (`delete from turnos`).

---

## Fase 2 — El estudiante · 18-sep

Verificado en local contra la base real, a 390 px.

| # | Prueba | Resultado |
|---|---|---|
| 1 | El renglón no identifica a nadie | ✅ diez columnas, ninguna de persona |
| 2 | 6 delante | ✅ «En un momento más pasarás» |
| 3 | 3 delante | ✅ «3 personas delante de ti» |
| 4 | 1 delante | ✅ «1 persona delante de ti», en singular |
| 5 | 0 delante | ✅ «Eres el siguiente» |
| 6 | Llamado a mesa | ✅ «Mesa 3 · Index Nuevo León» — *cambió el 21-sep, ver abajo* |
| 7 | Llamado con el host | ✅ «Con el host» — *cambió el 21-sep, ver abajo* |
| 8 | No llegó | ✅ pantalla propia y botón para formarse otra vez |
| 9 | Volver a entrar | ✅ cae en su turno, no saca otro |
| 10 | Sin desbordes a 390 px | ✅ ningún elemento con `scrollWidth > clientWidth` |

**Las dos filas son reales.** Con 3 turnos de CV y 2 de entrevista esperando, un
turno nuevo de entrevista vio «En un momento más pasarás» (5 delante) y uno de
portafolio vio «Eres el siguiente» (0). Es lo que se quería: CV y entrevista
comparten mesas y se cuentan juntos; portafolio va aparte.

**Seguridad, con la clave pública:**

| Prueba | Resultado |
|---|---|
| `select * from turnos` | ✅ 401 · `permission denied for table turnos` |
| `PATCH` a un turno ajeno | ✅ 401 |
| `DELETE` de un turno | ✅ 401 |
| `mi_turno` con un uuid inventado | ✅ 200 con `[]`, no filtra nada |

**El folio aguanta la concurrencia.** Seis llamadas simultáneas a `sacar_turno`
dieron 1 a 6 sin repetir ni chocar: es el `pg_advisory_xact_lock`.

**Lo que se probó fue el respaldo, no el aviso.** El teléfono se actualizó solo
por el sondeo de 15 segundos (`RESPALDO_MS` en `Turno.jsx`). El camino rápido es
el canal de difusión `fila`, y ese solo se dispara desde `/fila`, que pide
sesión. Queda para la fase 3.

---

## Fase 3 — Cecilia · pendiente

`/fila` pide cuenta del equipo y las contraseñas no pasan por el chat. Lo corre
Gustavo:

1. Abrir `/fila` con la cuenta del equipo.
2. Con `/turno` abierto en un celular y `/fila` en la laptop: llamar y ver que el
   teléfono cambia **al momento** y suena. Si tarda hasta 15 segundos, el canal
   de difusión no está llegando y hay que revisarlo.
3. Llamar otra vez a alguien ya llamado: tiene que volver a sonar.
4. Agregar un turno a mano, para quien llega sin celular.
5. Bajar el reporte y confirmar que no trae columnas de persona.

---

## Fase 4 — Producción · 18-sep

**El 403 del 17-sep ya no está.** El push salió sin problema; se había arreglado
al reconectar el conector de GitHub en Vercel.

- Commit `d120f8c`, ocho archivos, 1,324 líneas.
- Vercel desplegó solo: `dpl_rVM6sm2ww…`, estado READY en producción.
- `https://warmup-ad2026.vercel.app/turno` probado en vivo: saca turno, devuelve
  folio y muestra «Eres el siguiente». El turno de prueba se borró.

Falta probarlo desde un celular de verdad, no desde el navegador emulado.

---

## Fase 5 — El repo al día · 18-sep

- **`CLAUDE.md`.** Se quitó la lista de espera de *Fuera de alcance*. Se agregaron
  `turnos` a la tabla de tablas, `/turno` y `/fila` a la de rutas, las cuatro
  funciones públicas al bloque de *Quién ve qué*, los archivos nuevos al árbol, una
  sección propia de la fila, y dos reglas a *Lo que no se rompe*: que la fila no
  guarda datos de personas, y que `pool_de` y `poolDe` tienen que decir lo mismo.
- **Esta bitácora** queda apuntada desde el encabezado del `CLAUDE.md`.

Pendiente menor: el **QR de la entrada** hacia `/turno` en `/admin/qr`, para que
salga en la misma hoja imprimible que los de mesa. Por confirmar con Gustavo: si
lo imprime en Canva aparte, no hace falta.

---

## Ajustes del 21-sep — los textos siguen el recorrido real

Observaciones de Gustavo después de probar. El recorrido del día es siempre:
turno por el QR → **módulo de lista de espera**, donde le toman sus datos →
el host la lleva con la empresa. Nadie elige empresa ni camina por las mesas, y
para pasar con otra empresa se saca otro turno.

| Antes | Ahora |
|---|---|
| Pantalla principal: «No te pedimos tu nombre ni tu matrícula» | Se quitó |
| Portafolio: «Zona aparte, al fondo del salón» | «Para carreras creativas» |
| Esperando: sin indicación | Banda fija: «Puedes tomar asiento, en un momento más te avisaremos tu turno». *Primero decía «Pasa al módulo…»; Gustavo lo cambió el mismo día* |
| 0 delante: «No te alejes del módulo» | «Te avisamos aquí en cualquier momento» |
| 1 a 3 delante: «Ya casi. Mantente cerca» | «Ya casi. Te avisamos aquí» |
| Llamado: «Mesa 3 · Index» o «Con el host» | Siempre «Pasa al módulo de lista de espera. De ahí el host te lleva con la empresa» |
| Atendido: «Aprovecha el resto del salón…» | «Ya pasaste con la empresa. Si quieres pasar con otra, saca un turno nuevo», con el botón al frente |

En `/fila` la mesa apartada se queda, pero como dato del equipo: la hoja dice
«Llamar sin mesa — la decide el host» y «O llamar y apartarle una mesa», y avisa
qué ve la persona en su celular. En el reporte la columna es «Mesa apartada».

El texto del módulo vive en un solo lugar: `INDICACION_MODULO` en `src/lib/fila.js`.

Verificado a 390 px contra la base: fila larga, 1 delante, llamado con mesa
apartada (el celular no menciona la mesa) y atendido, sin desbordes. El caso de 0
delante no se pintó: había un turno de ustedes en espera (folio 8) y no se tocó.
Solo cambió su texto de pie.

**Los folios 1 a 8 de la base son de ustedes**, del 21-sep entre 15:29 y 21:06.
Se dejaron como estaban; de la prueba solo se borraron los folios 9 a 14.

---

## Decisiones, para no rediscutirlas

- **El celular siempre manda al módulo de lista de espera, nunca a una mesa.** Ahí
  le toman sus datos y el host la lleva con la empresa. La mesa apartada en `/fila`
  es para el equipo.
- **Las mesas se agrupan por pool, no por servicio.** CV y entrevista comparten
  mesas; portafolio es zona aparte y sale del giro `GIRO_PORTAFOLIO`, no del número
  de mesa. `/fila` lo usa para ofrecer mesas al llamar. La regla vive en dos lados
  que tienen que decir lo mismo: `pool_de` en la migración 09 y `poolDe` en
  `src/lib/fila.js`.
- **El celular no dice cuántos van delante** (21-sep). Primero se daba con menos de
  cuatro delante; se quitó porque «Eres el siguiente» podía quedarse mucho rato si
  la fila se atoraba. `mi_turno` sigue devolviendo `adelante`, sin pintarse.
- **No hay tiempo estimado.** Hace que la gente calcule y se vaya.
- **Ceder el turno queda como «No llegó»** (21-sep), sin estado nuevo. El teléfono
  distingue a quien cedió porque sabe que fue él; la base y `/fila` no.
- **La pantalla de llamado va en teal, no en rojo.** Aquí el color es el estado
  (DEC-019) y el rojo ya significa «se pasó de los 20 minutos». Lo que pasa
  cuando llaman a alguien es que se abrió un lugar, que es lo que dice el teal.
- **En iPhone las notificaciones web no llegan** salvo que la persona instale la
  página en su pantalla de inicio. Por eso el aviso es la pantalla abierta más
  sonido, y el respaldo de verdad es que Cecilia cante el número.
- **El prototipo de mayo no se usa.** `Proyecto Nueva app para WarmUp (1)/warmup-app`
  tiene la misma función, construida antes de encontrar esta app. No se despliega
  y no se mantiene.

---

## Plan del 21-sep

- **6 · Sin conteo.** La espera queda en número, banda «Puedes tomar asiento, en un
  momento más te avisaremos tu turno» y «Deja esta pantalla abierta». La base no se
  toca: `mi_turno` sigue dando `adelante`, la pantalla no lo pinta.
- **7 · Ceder.** Migración 10 con `ceder_turno(p_id)`: pasa a `no_llego` solo desde
  `espera` o `llamado`. Botón «¿Tienes que irte? No te preocupes, cede tu turno»,
  confirmación en la pantalla, y pantalla de «Cediste tu turno».
- **8 · Verificar.** Cinco pruebas a 390 px contra la base; los turnos de prueba se
  borran por folio, sin tocar los de ustedes. Push y paquete de producción.
- **9 · Simulación.** Guion con el texto exacto de cada pantalla; cuatro agentes
  Sonnet (tres estudiantes y Cecilia); reporte en
  `WarmUp AD26 - Simulación de la fila.md` con casillas para que Gustavo elija.
  No se aplica nada.
- **10 · Documentación.** `CLAUDE.md` de la app con el recorrido real, sin conteo y
  con ceder, redacción aprobada con el plan.

---

## Fase 6 — Sin conteo · 21-sep

- `Turno.jsx`: la espera quedó en número, banda «Puedes tomar asiento, en un momento
  más te avisaremos tu turno» y «Deja esta pantalla abierta». Salió la tarjeta de
  estado con sus tres variantes.
- `fila.js`: salieron `UMBRAL_ADELANTE` y `TEXTO_FILA_LARGA`.
- **Se queda en la base sin usarse:** `mi_turno.adelante` y `pool_de`. No estorban;
  `poolDe` sí se sigue usando en `/fila` para ofrecer mesas de portafolio aparte.
- Build limpio. Se verifica pintado en la fase 8, junto con ceder.

---

## Fase 7 — Ceder turno · 21-sep

- **Migración 10 aplicada en producción:** `ceder_turno(p_id uuid) returns boolean`,
  `SECURITY DEFINER`, ejecutable por anon. Pasa a `no_llego` solo desde `espera` o
  `llamado`. Deshacerla: `drop function if exists ceder_turno(uuid);`
- `fila.js`: `cederTurno(id)`.
- `Turno.jsx`: componente `CederTurno` al pie de la espera y del llamado. Pide
  confirmar en la pantalla: «¿Ceder tu turno? Tu número se libera y no se puede
  recuperar», con «Me quedo» y «Sí, ceder mi turno». Después: «Cediste tu turno.
  Gracias por avisar» y «Sacar otro turno». El teléfono olvida el turno al ceder.
- `/fila` no cambió: lo ve pasar a «No llegó».
- Build limpio. Se verifica en la fase 8.

---

## Fase 8 — Verificación · 21-sep

A 390 px contra la base real, con un turno de prueba (folio 12) que ya se borró.
Los folios 1 a 11 son de ustedes y no se tocaron.

| # | Prueba | Resultado |
|---|---|---|
| 1 | Espera sin conteo | ✅ número, banda y aviso; sin desbordes |
| 2 | Ceder | ✅ «Me quedo» regresa sin cambios; «Sí» deja `no_llego`, muestra «Cediste tu turno» y el teléfono olvida el turno. Probado desde el llamado, con el fondo teal |
| 3 | Ceder un turno ya cerrado | ✅ `false`, sin cambios |
| 4 | Ceder un uuid inventado | ✅ `false` |
| 5 | Tabla cerrada a la clave pública | ✅ `select`, `update` y `delete` en 401; `ceder_turno` sí responde |

Desplegado: commit `afaf433`. El paquete de producción trae «cede tu turno» y
«Cediste tu turno», y ya no trae «Eres el siguiente» ni «delante de ti».

---

## Fase 9 — Simulación · 21-sep

**9a · Guion ✅ 21-sep.** En el vault:
`12 - Programa Becarios/WarmUp/Ediciones/WarmUp AD26/WarmUp AD26 - Guion de pantallas de la fila.md`.
Siete pantallas del estudiante y tres de Cecilia, con el texto exacto marcado por
tamaño y tipo. Las del estudiante salieron de la app contra la base (folio 12, ya
borrado); `/fila` se montó aislado con datos de mentira, sin sesión ni base.

**9b · Agentes:** lanzados el 21-sep. Corrida `wf_1c42d7a0-c98`: cuatro agentes Sonnet
en paralelo (E1 primer semestre por CV, E2 diseño por portafolio con prisa, E3 último
semestre por entrevista, y Cecilia). A los estudiantes se les pasaron solo las
pantallas y lo que se ve en el salón; a Cecilia, el guion completo. Si se corta,
se retoma con `resumeFromRunId` y los agentes que ya terminaron no se repiten.

Terminó en 2 min 43 s, los cuatro sin error.

**9c · Reporte ✅ 21-sep.** En el vault:
`12 - Programa Becarios/WarmUp/Ediciones/WarmUp AD26/WarmUp AD26 - Simulación de la fila.md`,
con las respuestas completas en el `.json` de al lado. **Nada aplicado:** Gustavo marca.

Tres hallazgos de dos o más agentes: la espera larga no da señal de vida (los tres
estudiantes), «el host» no se sabe quién es, y no se sabe cuánto tiempo hay para
llegar al ser llamado. Este último depende de una regla de operación que no está
escrita: cuánto espera Cecilia antes de marcar «No llegó».

Una propuesta de agente es falsa y está marcada: «puedes bloquear tu celular, el
sonido te avisa igual». Con el teléfono bloqueado la página deja de correr.

---

## Fase 10 — Documentación · 21-sep

- **`CLAUDE.md` de la app**, con la redacción aprobada en el plan: la sección *La fila
  del día del evento* reescrita con el recorrido real (módulo, host, nadie elige
  empresa), el celular que nunca manda a una mesa, sin conteo, y ceder como «No
  llegó». *Quién ve qué* pasa a cinco funciones públicas con `ceder_turno`.
- De paso, dos líneas que habían envejecido: la regla de los pools ya no puede decir
  que la persona ve un número de espera, y el árbol de `fila.js` ya no dice «umbral».
- *Decisiones* de esta bitácora al día. Las menciones del umbral en las fases 0 y 2
  se quedan: son registro de lo que se probó entonces.

---

## Plan del 21-sep, segunda vuelta — lo que Gustavo marcó en el reporte

Del reporte `WarmUp AD26 - Simulación de la fila.md`, con sus comentarios:

- **11 · Estudiante.** Hora en que sacó turno, punto «En vivo» y una animación suave
  en la espera; consejos de búsqueda de empleo que rotan, sacados de los decks de CV
  y Estrategias; «De ahí te llevamos con la empresa»; «Tienes 5 minutos para llegar
  al módulo»; en «Tu turno ya pasó», «Si ya estás en el módulo, avísanos ahí»;
  «Listo» con «Muchas gracias por participar…»; «Revisa esta página para saber
  cuándo sigue tu turno»; ceder como botón con borde; al ceder, «Si regresas más
  tarde, saca un turno nuevo» (no hay hora límite).
- **12 · Cecilia.** «Llamar sin mesa — Se le asigna al llegar al módulo»; al llamado,
  «Llamado hace N min», y aviso cuando pasan los 5 minutos; el turno a mano muestra
  qué número salió; en cerrados sin «esperando»; **se reabre** el estado «Cedió su
  turno» (migración 11), aparte de «No llegó».
- **Regla nueva:** si alguien regresa al módulo después de «No llegó», Cecilia usa
  «Regresar a la fila» y no le pide otro turno.
- **Operación, no código:** letrero físico «Lista de espera» en el módulo.

---

## Fase 11 — Estudiante · 21-sep

Código listo y compilado; **sin desplegar** hasta que la migración 11 esté aplicada
(fase 12). Commit local.

- **Espera:** punto «En vivo» que late (se detiene con *reducir movimiento*), «Sacaste
  tu turno a las …», consejos que rotan cada 12 s y «Revisa esta página para saber
  cuándo sigue tu turno». Ceder pasó a botón con borde.
- **Consejos:** 19, en `CONSEJOS` de `src/lib/fila.js`, sacados de los decks cerrados
  de CV estratégico y Estrategias de búsqueda de empleo. Se muestran los del servicio
  elegido y luego los generales; portafolio solo ve los generales, porque no hay deck
  de portafolio.
- **Llamado:** «Tienes 5 minutos para llegar al módulo» y «De ahí te llevamos con la
  empresa». `TOLERANCIA_MIN` en `fila.js`.
- **Listo:** «Muchas gracias por participar, puedes sacar un turno nuevo en el módulo
  de lista de espera». Se dejó el botón «Sacar otro turno».
- **Tu turno ya pasó:** «Si ya estás en el módulo, avísanos ahí» y «Esta pantalla
  cambia sola cuando te regresemos a la fila». El botón grande de «Formarme otra vez»
  bajó a una liga discreta, «Sacar un turno nuevo», para no duplicar a quien Cecilia
  regresa a la fila.
- **Cediste tu turno:** agrega «Si regresas más tarde, saca un turno nuevo».
- La hora del turno necesita que `mi_turno` devuelva `creado_en`: va en la migración 11.

