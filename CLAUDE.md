# CLAUDE.md — Warm Up AD2026

Webapp de administración y operación del WarmUp AD2026 del CVDP. Evento: **28 de septiembre
de 2026**, 75 mesas, dos bloques.

Las reglas de cómo se escribe y cómo se trabaja viven en el `CLAUDE.md` del vault y en
`~/.claude/CLAUDE.md`. Aquí solo va lo que es de este repo.

**Antes de tocar nada, lee `SEGUIMIENTO.md`.** Ahí está en qué fase vamos y qué quedó a medias.
La fila del día del evento lleva su propia bitácora aparte: `BITACORA-fila.md`.

---

## Lo que no se rompe

- **El repo es público.** Nunca entran: el `.env`, el `.xlsx` de control, ni datos de personas
  (nombres de reclutadores, correos, celulares). El `.gitignore` ya bloquea `*.xlsx`.
- **La seguridad no es el paso final.** Cualquier tabla nueva nace sin permisos (migración 07).
  Si agregas una, decide explícitamente quién la lee.
- **Tener sesión no da acceso.** La cuenta tiene que estar en la tabla `equipo`. Es lo que
  impide que alguien se registre con la clave pública y lo vea todo.
- **El nombre del reclutador no sale a ninguna pantalla.** Ni en admin hace falta mostrarlo
  fuera de la tabla de reclutadores.
- **Ninguna pantalla se da por hecha sin verla renderizada a 390 px.** Los desbordes no
  existen en el código, solo al pintarse.
- **Las mesas viven en la app desde el 22-sep, no en el Excel.** Se acomodan con «Editar acomodo» en
  el Mapa de `/admin/mesas` y todo movimiento queda en `cambios_salon` (`/admin/cambios`). La importación del Excel está
  apagada: borraba y reinsertaba `reclutadores` con la columna Mesa del libro y se llevaba el
  acomodo. No se vuelve a prender sin resolver eso.
- **Una mesa nunca se mueve con `update` desde el navegador.** `reclutadores_mesa_unica` es un
  índice único parcial y no se puede diferir: dos `update` seguidos truenan o dejan el salón a
  medias. Van por las funciones de la migración 08 —`mover_mesa`, `intercambiar_mesas`,
  `recorrer_mesas`, `liberar_mesa`, `agregar_mesa`, `cambiar_empresa_de_mesa`— y por
  `acomodar_mesas` de la migración 13, que guarda varias mesas sueltas a la vez. Hacen el baile completo
  en una transacción y anotan en la bitácora.
- **El QR de las mesas es uno solo, y el teléfono recuerda número y empresa.** Si el equipo mueve,
  intercambia o libera la mesa, `/mesa` lo nota porque en su número ya no está su empresa, y
  muestra «Tu mesa cambió» con la mesa nueva. Si se quita la empresa de lo que se guarda en
  `recordarMesa`, el reclutador se queda marcando una mesa ajena sin enterarse.
- **La fila no guarda datos de personas.** Un turno es folio, servicio y estado. Ni nombre, ni
  matrícula, ni carrera: los datos de estudiantes no pueden subir a Supabase ni a Vercel, y la
  forma de cumplirlo es no tenerlos. Si alguna vez hace falta un dato de la persona, no se
  agrega una columna: se captura fuera de la app.
- **La regla de los pools vive en dos lados y tienen que decir lo mismo.** `pool_de` en la
  migración 09 y `poolDe` en `src/lib/fila.js`. Hoy la pantalla del estudiante no muestra el
  conteo que sale de `pool_de`, pero si vuelve a mostrarse y se separan, la persona vería un
  número de espera que no corresponde a su fila.
- **`reclutadores` no entra a la publicación de tiempo real.** Trae nombres de personas de fuera
  del Tec. Los cambios de forma del salón se avisan por el canal de difusión `salon-<bloque>`, y
  el aviso no lleva datos: el texto que se lee vive en la pantalla, no en el mensaje.
- **La forma del salón vive en `src/lib/plano.js` y dice lo mismo que el mapa oficial**
  (`Ediciones/WarmUp AD26/WarmUp AD26 - Mapa del evento.html`, en el vault): 15 columnas de 5,
  zigzag desde la mesa 1 abajo a la derecha, acceso frente a las mesas 31 a 40. Es lo que pinta la
  vista Mapa de `/host` y de `/admin/mesas`, y la hoja del plano de `/admin/impreso`. Si el
  salón cambia, se corrigen los dos.
- **Si cambia una mesa o una empresa, se regenera el mapa fijo.**
  `node scripts/hornear-mapa.mjs`, y se commitea. Ese JSON es lo que las pantallas muestran
  cuando la base no contesta, y la hoja impresa si la base falla; si se queda atrás, el día del
  evento manda gente a mesas equivocadas. `--verificar` avisa, y está en el preflight.

## Stack

Vite + React 19 + Tailwind 4 + react-router 7 + `@supabase/supabase-js`. SheetJS para leer el
`.xlsx`. `@dnd-kit` para arrastrar en el acomodo; se carga solo al entrar a editarlo. Sitio estático
en Vercel, sin servidor propio: no hay nada que renderizar en servidor y es una cosa menos que
pueda fallar el día del evento.

```
src/
├── App.jsx              rutas
├── index.css            paleta CVDP como tokens de Tailwind
├── datos/
│   └── mapa-fijo.json   el salón horneado, generado por scripts/hornear-mapa.mjs
├── lib/
│   ├── supabase.js      cliente + edicionActiva()
│   ├── mapaFijo.js      lo que se ve cuando la base no contesta
│   ├── mesaEquipo.js    editar el salón: las funciones de mesa y la bitácora
│   ├── fila.js          la fila: servicios, estados, consejos y las tres funciones sin sesión
│   ├── alerta.js        sonido, vibración y pantalla encendida al llamar un turno
│   └── sesion.jsx       contexto de sesión
├── components/          Protegida, MarcoAdmin, Cargando, EnObra, EditarMesa,
│                        CarrerasPicker, Enlace, AcomodoEnMapa, FichaEmpresa
└── pages/
    ├── Entrar.jsx       login del equipo
    ├── Mesa.jsx         pantalla del reclutador, sin login
    ├── Turno.jsx        pantalla del estudiante que espera, sin login
    ├── Fila.jsx         control de la fila, para el host de lista de espera
    ├── Host.jsx         vista del equipo el día del evento
    └── admin/           Tablero, Mesas, Reclutadores, Pendientes, Cambios, Qr, Impreso
```

## Rutas

| Ruta | Quién | Acceso |
|---|---|---|
| `/entrar` | equipo CVDP | correo y contraseña |
| `/admin/*` | equipo CVDP | sesión + estar en `equipo` |
| `/host` | hosts y becarios | sesión + estar en `equipo` |
| `/mesa` | reclutadores | por el QR, sin login |
| `/turno` | estudiantes | por el QR de la entrada, sin login |
| `/fila` | host de lista de espera | sesión + estar en `equipo` |

## Base de datos

Proyecto Supabase `warmup-sep2026` (`vaowqzodsivdeqbqpcrn`, us-east-1).
Las migraciones están en `supabase/migrations/`, en orden.

El modelo **copia la forma del Excel a propósito**: la hoja `Reclutadores` es una fila por
persona por bloque con su columna Mesa, y así queda en la tabla `reclutadores`. Eso hace que
la importación sea directa y que Gustavo reconozca lo que ve.

| Tabla | Para qué |
|---|---|
| `ediciones` | Una por evento. `total_mesas` sube al conseguir una mesa excedente |
| `empresas` | Contacto y textos originales de áreas y perfiles |
| `carreras` | Catálogo nacional: 47 carreras, 6 escuelas |
| `empresa_carreras` | Las carreras normalizadas. Son las que filtran el día del evento |
| `reclutadores` | Una fila por persona por bloque, con su mesa |
| `mesas_estado` | El estado en vivo. Solo el día del evento |
| `pendientes` | Los pendientes del Tablero del Excel |
| `cupos` | Sin pantalla desde el 22-sep: los cupos se llevan en un Excel aparte. La tabla se queda |
| `equipo` | Qué cuentas tienen acceso. Se maneja por SQL, no desde la app |
| `cambios_salon` | La bitácora del día: quién movió qué y cuándo. La escriben las funciones |
| `turnos` | La fila del día del evento. Folio, servicio y estado. Sin datos de persona |

**El mapa de mesas no es una tabla.** Se deriva de `reclutadores.mesa_numero` más el bloque.
Una mesa es excedente cuando su número pasa de `ediciones.total_mesas`.

### Quién ve qué

- Sin sesión: `carreras`, `ediciones` (solo `id, nombre, fecha, activa`), `mesas_estado`,
  y cinco funciones: `mesas_publicas(bloque)` y `set_estado_mesa(numero, bloque, estado)`
  para el reclutador; `sacar_turno(servicio)`, `mi_turno(id)` y `ceder_turno(id)` para el
  estudiante.
- Con sesión y en `equipo`: todo.
- Con sesión y fuera de `equipo`: nada.

Las cinco son `SECURITY DEFINER` y ejecutables por `anon` **a propósito**: son las dos
puertas sin contraseña de la app. El asesor de seguridad de Supabase las marca; es una
excepción aceptada, no un descuido. `set_estado_mesa` solo escribe `estado` y `ocupado_desde`,
y rechaza una mesa que no esté asignada en ese bloque.

`turnos` no se abre a `anon` ni para leerla. `mi_turno` devuelve **un** renglón y pide el uuid
completo, así que un teléfono no puede listar la fila ni leer el turno de alguien más.
`sacar_turno` solo inserta un turno nuevo en espera. `ceder_turno` solo cierra uno que siga en
espera o llamado, y también pide el uuid completo. Llamar, cerrar y borrar pasan por la tabla,
y eso pide cuenta del equipo.

Para dar de alta una cuenta: se crea en el panel de Supabase y se agrega a `equipo` por SQL.
Ver el comentario al final de `supabase/migrations/06_lista_del_equipo.sql`.

## Colores de estado

Paleta CVDP. Teal, ámbar y rojo son semánticos (DEC-019): aquí el color **es** el estado.

| Estado | Token | Hex |
|---|---|---|
| Disponible | `teal` | `#0A8C82` |
| Ocupado, dentro de tiempo | `tec` | `#0039A6` |
| Break | `ambar` | `#F5A81E` |
| No llegó | gris tenue | — |
| Pasado de 20 min · mesa excedente | `rojo` | `#C0392B` |

## Los expertos de portafolio

Siete personas dan revisión de portafolio creativo, no reclutamiento: cinco de EAAD, una de
Steelcase, `Portafolio · Diseño (Steelcase)`, y `Portafolio · Arquitectura`, que se registró el
23-sep. Entran como una
empresa cada una —`Portafolio · Diseño`, `Portafolio · Urbanismo`…— porque **las carreras van
pegadas a la empresa y no a la mesa**: con una sola empresa de cinco mesas, el estudiante de
urbanismo saldría mandado a la mesa de animación.

Las siete llevan el giro `Revisión de portafolio` (`GIRO_PORTAFOLIO` en `src/lib/cifras.js`).
Es lo que saca la zona completa con el filtro de giro de `/host`, lo que hace que la hoja
impresa las nombre aparte y lo que el Tablero resta de «Empresas registradas»: son 61 empresas
más 7 expertos, no 68 empresas. En Bloque 2 la zona son las tres últimas mesas —73, 74 y 75—; en
Bloque 1 son cuatro, de la 72 a la 75: Arquitectura entró en la 72 el 23-sep.

Las empresas que además revisan portafolio (Definity, Areya, BECK) no llevan mesa extra: la
hoja «Expertos Portafolio» del equipo solo dice quién revisa. Mesa aparte solo para expertos.

**Tipografía: Inter, no Neue Haas.** Neue Haas está licenciada y el repo es público. Inter es
neo-grotesca como ella y se carga de Google Fonts. Es la única desviación consciente del
sistema de diseño.

## El Excel

`~/Downloads/WarmUp AD26 - Control de Mesas y Cupos.xlsx`. Sigue siendo la lista de personas del
equipo, pero **ya no dice en qué mesa va nadie** y **no se importa** desde el 22-sep. El lector
(`excel.js`, `importar.js`) queda para comparar; `verificar-importacion.mjs --aplicar` sale con
error a propósito.

**Trampa conocida:** el campo "cantidad de personas" del Forms no coincide con la lista de
nombres, casi nunca. Se cuentan filas de la hoja `Reclutadores`, jamás ese campo. Contar el
número dio un sobrecupo de seis que no existía.

## El acomodo del salón

**Cada bloque se acomoda por su cuenta.** El 22-sep la base quedó en orden alfabético por
bloque: una empresa de todo el día puede tener números distintos en B1 y B2.

**El salón se ve en el Mapa.** La rejilla («Empresas y Expertos») salió el 22-sep. `/admin/mesas`
solo tiene el Mapa y `/host` tiene Mapa y Lista, y abre en el Mapa.

**El admin tiene 7 pestañas:** Tablero, Mapa de mesas, Reclutadores, Pendientes, Cambios del día,
QR y Hoja de papel. Empresas, Cupos e Importar salieron el 22-sep, y sus rutas llevan al Mapa.

**La ficha de cada empresa se abre tocando su mesa en el Mapa de admin** (`FichaEmpresa`). Ahí se
editan el contacto (representante, celular, correo) y las carreras. La bitácora anota que cambió el
contacto, sin los valores. Los nombres de reclutadores se cambian en Reclutadores. Una mesa libre
abre el detalle de siempre, por «Ya la conseguí».

**«Editar acomodo» vive en el Mapa, de `/admin/mesas` y de `/host`, y es mesa por mesa**, como
los íconos de un celular. Es el mismo componente (`AcomodoEnMapa`).
Soltar una mesa sobre otra las intercambia (la 56 en la 54 → la 54 pasa a la 56); soltar sobre
una libre la mueve ahí. Una empresa puede quedar partida: es decisión del equipo. Portafolio se
mueve igual. Las que cambiaron llevan contorno cian y «antes N». Nada se guarda hasta «Guardar
acomodo · N mesas», que guarda directo, sin recuadro de confirmar: la primera versión lo tenía y
un guardado se quedó ahí sin llegar a la base. Hay «Deshacer último» y «Deshacer todo».
«Orden alfabético» regresa el borrador al acomodo del 22-sep: empresas A–Z en mesas seguidas
desde la 1 y portafolio en las últimas mesas del salón, en el orden que traía. Se guarda igual
que cualquier cambio. Mientras
se edita se bloquean el otro bloque y el cambio de vista. En el celular se deja el dedo un
momento sobre la mesa para levantarla.

**En `/host` el editor usa los colores del estado en vivo y las mesas en sesión quedan fijas**:
llevan candado, no se arrastran y no se les suelta otra encima. «Orden alfabético» no se aplica
si movería una mesa en sesión y dice cuál. El estado en vivo es del número, así que el color va
con el número donde estaba la mesa. Soltar solo cuenta sobre la mesa que está bajo el dedo: con el
respaldo de «la más cercana», soltar sobre una mesa en sesión la intercambiaba con la vecina.

`acomodar_mesas` (migración 13) recibe solo las filas que cambian y su número nuevo. Rechaza
números fuera del salón o repetidos, filas de otro bloque, choques con una mesa que no se movió
y cambios en una mesa en sesión. `reordenar_salon` (migración 12, por empresa completa) se queda
en la base sin pantalla que la use; `/admin/acomodo` redirige a `/admin/mesas`.

**Después de acomodar se hornea el mapa fijo.** `/admin/impreso` ya lee de la base y cae al mapa
horneado solo si no contesta; pero `/host` y `/mesa` usan el horneado cuando la base falla.

## Verificación

La prueba dura ya no es contra el Tablero del Excel: la base manda. Se revisa por SQL que no
haya números repetidos por bloque ni números fuera del salón, y `hornear-mapa.mjs --verificar`.
Desde el 22-sep por la noche una empresa ya puede estar partida y portafolio puede moverse. Al corte del 22-sep-2026 por la noche, con las bajas
de Definity y Redwood: 70 lugares en Bloque 1 (1–67 y 73–75) y 60 en Bloque 2 (1–57 y 73–75).
Libres: B1 68–72, B2 58–72.

## La fila del día del evento

**El recorrido es siempre el mismo.** El estudiante saca turno con el QR de la entrada, en
`/turno`, sin contraseña y sin escribir nada: toca lo que busca y recibe un número. Pasa al
módulo de lista de espera, donde le toman sus datos fuera de la app, y espera sentado. Cecilia
lo llama desde `/fila`; su celular dice «Pasa al módulo de lista de espera», y de ahí lo llevan
con la empresa. **Nadie elige empresa ni camina por las mesas**, y para pasar con otra se saca
otro turno. Detalle y estado de las pruebas en `BITACORA-fila.md`.

**Tiene 5 minutos para llegar al módulo** desde que lo llaman (`TOLERANCIA_MIN`). Pasado ese
tiempo, `/fila` pone el llamado en ámbar y Cecilia puede marcarlo «No llegó». **Si regresa
después, Cecilia usa «Regresar a la fila» y no le pide otro turno**: su celular vuelve solo a la
espera con el mismo número. Por eso «Tu turno ya pasó» no tiene botón grande para sacar otro.

**El celular nunca manda a una mesa.** Cecilia puede apartarle mesa en `/fila`, pero eso es dato
del equipo: la persona siempre ve el módulo. El texto vive en `INDICACION_MODULO`,
en `src/lib/fila.js`. Si la mesa apartada deja de servir —la empresa no llegó, se liberó, alguien
más la ocupó o cambió de empresa—, el renglón de `/fila` lo avisa en ámbar. El cambio de empresa
solo se nota mientras Cecilia no recargue la página: la empresa apartada vive en memoria, porque
`turnos` no la guarda.

**Cecilia toca «Pasó» al entregar al estudiante al host de salón**, en el módulo, no al terminar
la sesión (decidido el 22-sep). Es cuando su celular cambia a «Listo».

**Una mesa ocupada no se mueve.** Mover, intercambiar y recorrer borran el estado en vivo de los
números que tocan (`limpia_estado`, migración 08): una sesión en curso pierde su reloj y el
reclutador ve «Tu mesa cambió» a media entrevista. Es regla de operación, no candado: el host
espera a que termine la sesión (decidido el 22-sep).

**El celular no dice cuántos van delante.** Solo su número, la hora en que lo sacó y «Puedes
tomar asiento, en un momento más te avisaremos tu turno». «Eres el siguiente» podía quedarse
mucho rato si la fila se atoraba, y confundía. No hay tiempo estimado. `mi_turno` sigue
devolviendo `adelante`; la pantalla no lo pinta.

**La espera da señales de vida sin prometer nada.** Un punto «En vivo» que late y un consejo de
búsqueda de empleo que cambia cada 12 segundos. Los consejos están en `CONSEJOS` de
`src/lib/fila.js` y **salen de los decks cerrados del CVDP** —CV estratégico, Estrategias de
búsqueda de empleo y, los de portafolio, la Guía de Empleo de Industrias Creativas—; no se
inventan. Si cambia un deck, se revisan ahí.

**Ceder el turno es un estado aparte: «Cedió su turno».** El botón «¿Tienes que irte? No te
preocupes, cede tu turno» pide confirmar en la pantalla y llama a `ceder_turno`, que escribe
`cedio`. Primero se guardaba como «No llegó»; se separó el 21-sep porque Cecilia necesita la
cuenta real de quién no se presentó.

**Las mesas se agrupan por pool, no por servicio.** Las mesas no están tipificadas: el mismo
reclutador revisa un CV y luego hace una entrevista. CV y entrevista son un solo pool, y
portafolio va aparte porque sí es una zona distinta, reconocida por `GIRO_PORTAFOLIO`. Es lo que
usa `/fila` para ofrecer mesas al llamar.

**En iPhone las notificaciones web no llegan** salvo que la persona instale la página en su
pantalla de inicio. Por eso el aviso es la pantalla abierta que cambia sola, más sonido; y el
respaldo de verdad es que Cecilia cante el número.

## Fuera de alcance

Registro de estudiantes, correos automáticos, QR por estudiante, validación de asistencia, y
el evento virtual del 29.

La captura de matrícula y carrera para indicadores **tampoco es de la app**: se hace aparte, en
Excel o Forms. Es lo que permite que la fila no guarde datos de nadie.
