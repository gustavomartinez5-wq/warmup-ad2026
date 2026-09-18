# Bitácora — La fila del día del evento

Se escribe al cerrar cada fase. Si el trabajo se corta a media fase, esto es lo
que dice dónde quedamos.

Última actualización: **18 de septiembre de 2026**, fases 0, 1 y 2 cerradas.

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
| 4 | `git push` y producción | ⬜ |
| 5 | Dejar el repo al día | ⬜ |

**Lo siguiente, en orden:**

1. **Fase 3.** Abrir `/fila` con la cuenta del equipo y correr las cinco pruebas
   de abajo. Es lo único que falta para dar la fila por buena.
2. **`git push`.** Sigue abierto el pendiente del 17-sep: git en esta máquina
   autentica como `tsunamipro-dev` y falla con 403. Sale de la terminal de
   Gustavo. **Hasta que no se despliegue, producción no tiene la fila**, aunque
   la base ya la tenga.
3. **Fase 5,** la documentación.

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
| 6 | Llamado a mesa | ✅ «Mesa 3 · Index Nuevo León» |
| 7 | Llamado con el host | ✅ «Con el host» |
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

## Fase 4 — Producción · pendiente

La base ya está. Falta el código:

1. `git push` desde la terminal de Gustavo.
2. Probar `/turno` en producción desde un celular de verdad.

---

## Fase 5 — El repo al día · pendiente

1. **`CLAUDE.md`.** En *Fuera de alcance* dice «lista de espera... y cualquier
   pantalla para estudiantes». Ya no es cierto. Hay que quitarlo, y agregar
   `turnos` a la tabla de tablas, `/turno` y `/fila` a la de rutas, y las dos
   funciones nuevas al bloque de *Quién ve qué*.
2. **`SEGUIMIENTO.md`.** Una sección de la fila apuntando aquí.
3. **`/admin/qr`.** El QR de la entrada que apunta a `/turno`, para que salga en
   la misma hoja imprimible. *(Por confirmar: si se imprime en Canva aparte, no
   hace falta.)*

---

## Decisiones, para no rediscutirlas

- **La fila se cuenta por pool de mesas, no por etiqueta.** CV y entrevista
  comparten mesas: contarlos por separado daría un número falso, porque quien
  viene por CV también espera a los de entrevista. Portafolio sí es pool aparte y
  sale del giro `GIRO_PORTAFOLIO`, no del número de mesa. La regla vive en dos
  lados que tienen que decir lo mismo: `pool_de` en la migración 09 y `poolDe` en
  `src/lib/fila.js`.
- **Con la fila larga no se da el número.** Ver «van 23 delante» hace que la
  gente calcule y se vaya. El umbral es 4 y es una constante en `src/lib/fila.js`,
  junto al texto. No hay pantalla de configuración.
- **No hay tiempo estimado.** Mismo motivo.
- **La pantalla de llamado va en teal, no en rojo.** Aquí el color es el estado
  (DEC-019) y el rojo ya significa «se pasó de los 20 minutos». Lo que pasa
  cuando llaman a alguien es que se abrió un lugar, que es lo que dice el teal.
- **En iPhone las notificaciones web no llegan** salvo que la persona instale la
  página en su pantalla de inicio. Por eso el aviso es la pantalla abierta más
  sonido, y el respaldo de verdad es que Cecilia cante el número.
- **El prototipo de mayo no se usa.** `Proyecto Nueva app para WarmUp (1)/warmup-app`
  tiene la misma función, construida antes de encontrar esta app. No se despliega
  y no se mantiene.
