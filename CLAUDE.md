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
- **El Excel manda hasta el día del evento; el 28 manda la app.** Lo que se mueva el 28 desde
  la app queda en `cambios_salon` y se ve en `/admin/cambios`. Hay que pasarlo al libro: una
  reimportación borra y reinserta `reclutadores` y se lleva lo que se arregló en el salón.
- **Una mesa nunca se mueve con `update` desde el navegador.** `reclutadores_mesa_unica` es un
  índice único parcial y no se puede diferir: dos `update` seguidos truenan o dejan el salón a
  medias. Van por las funciones de la migración 08 —`mover_mesa`, `intercambiar_mesas`,
  `recorrer_mesas`, `liberar_mesa`, `agregar_mesa`, `cambiar_empresa_de_mesa`—, que hacen el
  baile completo en una transacción y anotan en la bitácora.
- **La fila no guarda datos de personas.** Un turno es folio, servicio y estado. Ni nombre, ni
  matrícula, ni carrera: los datos de estudiantes no pueden subir a Supabase ni a Vercel, y la
  forma de cumplirlo es no tenerlos. Si alguna vez hace falta un dato de la persona, no se
  agrega una columna: se captura fuera de la app.
- **La regla de los pools vive en dos lados y tienen que decir lo mismo.** `pool_de` en la
  migración 09 y `poolDe` en `src/lib/fila.js`. Si se separan, la persona ve un número de
  espera que no corresponde a la fila en la que está.
- **`reclutadores` no entra a la publicación de tiempo real.** Trae nombres de personas de fuera
  del Tec. Los cambios de forma del salón se avisan por el canal de difusión `salon-<bloque>`, y
  el aviso no lleva datos: el texto que se lee vive en la pantalla, no en el mensaje.
- **Si cambia una mesa o una empresa, se regenera el mapa fijo.**
  `node scripts/hornear-mapa.mjs`, y se commitea. Ese JSON es lo que las pantallas muestran
  cuando la base no contesta y lo que sale en la hoja impresa; si se queda atrás, el día del
  evento manda gente a mesas equivocadas. `--verificar` avisa, y está en el preflight.

## Stack

Vite + React 19 + Tailwind 4 + react-router 7 + `@supabase/supabase-js`. SheetJS para leer el
`.xlsx` en el navegador. Sitio estático en Vercel, sin servidor propio: no hay nada que
renderizar en servidor y es una cosa menos que pueda fallar el día del evento.

```
src/
├── App.jsx              rutas
├── index.css            paleta CVDP como tokens de Tailwind
├── datos/
│   └── mapa-fijo.json   el salón horneado, generado por scripts/hornear-mapa.mjs
├── lib/
│   ├── supabase.js      cliente + edicionActiva()
│   ├── mapaFijo.js      lo que se ve cuando la base no contesta
│   ├── mesaEquipo.js    editar el salón: las seis funciones y la bitácora
│   ├── fila.js          la fila: servicios, umbral y las dos funciones sin sesión
│   ├── alerta.js        sonido, vibración y pantalla encendida al llamar un turno
│   └── sesion.jsx       contexto de sesión
├── components/          Protegida, MarcoAdmin, Cargando, EnObra, EditarMesa,
│                        CarrerasPicker, RejillaMesas, Enlace
└── pages/
    ├── Entrar.jsx       login del equipo
    ├── Mesa.jsx         pantalla del reclutador, sin login
    ├── Turno.jsx        pantalla del estudiante que espera, sin login
    ├── Fila.jsx         control de la fila, para el host de lista de espera
    ├── Host.jsx         vista del equipo el día del evento
    └── admin/           Tablero, Mesas, Empresas, Reclutadores, Cupos, Pendientes,
                          Cambios, Importar, Qr, Impreso
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
| `cupos` | Seis franjas. El registro de estudiantes se teclea, no se captura aquí |
| `equipo` | Qué cuentas tienen acceso. Se maneja por SQL, no desde la app |
| `cambios_salon` | La bitácora del día: quién movió qué y cuándo. La escriben las funciones |
| `turnos` | La fila del día del evento. Folio, servicio y estado. Sin datos de persona |

**El mapa de mesas no es una tabla.** Se deriva de `reclutadores.mesa_numero` más el bloque.
Una mesa es excedente cuando su número pasa de `ediciones.total_mesas`.

### Quién ve qué

- Sin sesión: `carreras`, `ediciones` (solo `id, nombre, fecha, activa`), `mesas_estado`,
  y cuatro funciones: `mesas_publicas(bloque)` y `set_estado_mesa(numero, bloque, estado)`
  para el reclutador, `sacar_turno(servicio)` y `mi_turno(id)` para el estudiante.
- Con sesión y en `equipo`: todo.
- Con sesión y fuera de `equipo`: nada.

Las cuatro son `SECURITY DEFINER` y ejecutables por `anon` **a propósito**: son las dos
puertas sin contraseña de la app. El asesor de seguridad de Supabase las marca; es una
excepción aceptada, no un descuido. `set_estado_mesa` solo escribe `estado` y `ocupado_desde`,
y rechaza una mesa que no esté asignada en ese bloque.

`turnos` no se abre a `anon` ni para leerla. `mi_turno` devuelve **un** renglón y pide el uuid
completo, así que un teléfono no puede listar la fila ni leer el turno de alguien más; y
`sacar_turno` solo inserta un turno nuevo en espera. Llamar, cerrar y borrar pasan por la
tabla, y eso pide cuenta del equipo.

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

Cinco personas de EAAD dan revisión de portafolio creativo, no reclutamiento. Entran como una
empresa cada una —`Portafolio · Diseño`, `Portafolio · Urbanismo`…— porque **las carreras van
pegadas a la empresa y no a la mesa**: con una sola empresa de cinco mesas, el estudiante de
urbanismo saldría mandado a la mesa de animación.

Las cinco llevan el giro `Revisión de portafolio` (`GIRO_PORTAFOLIO` en `src/lib/cifras.js`).
Es lo que saca la zona completa con el filtro de giro de `/host` y lo que hace que la hoja
impresa las nombre aparte. Las últimas tres mesas del salón —73, 74 y 75— son esa zona.

**Tipografía: Inter, no Neue Haas.** Neue Haas está licenciada y el repo es público. Inter es
neo-grotesca como ella y se carga de Google Fonts. Es la única desviación consciente del
sistema de diseño.

## El Excel

`~/Downloads/WarmUp AD26 - Control de Mesas y Cupos.xlsx`. El importador lee tres hojas:
`Reclutadores`, `Empresas` y `Catálogo de Empresas`. **Nunca escribe el libro.**

**Trampa conocida:** el campo "cantidad de personas" del Forms no coincide con la lista de
nombres, casi nunca. Se cuentan filas de la hoja `Reclutadores`, jamás ese campo. Contar el
número dio un sobrecupo de seis que no existía.

## Verificación

La prueba dura: después de importar, las cifras de la app tienen que dar **igual que el
Tablero del Excel**. Al corte del 17-sep-2026, con los expertos de portafolio: 60 empresas,
73 reclutadores en Bloque 1, 57 en Bloque 2, 74 mesas apartadas de 75, 780 atenciones.

## La fila del día del evento

El estudiante que llega y tiene que esperar entra por `/turno`, sin contraseña y sin escribir
nada: toca lo que busca y recibe un número. Cecilia lo llama desde `/fila`, y elige si lo manda
directo a una mesa o con el host para que él asigne. Detalle completo y estado de las pruebas
en `BITACORA-fila.md`.

**La fila se cuenta por pool de mesas, no por etiqueta.** Las mesas no están tipificadas por
servicio: el mismo reclutador revisa un CV y luego hace una entrevista. Así que CV y entrevista
son un solo pool, y portafolio va aparte porque sí es una zona distinta. Contar por etiqueta
daría un número mentiroso: quien viene por CV también espera a los de entrevista.

**Con la fila larga no se da el número.** A partir de cuatro personas delante, la pantalla dice
«En un momento más pasarás» en vez de la cuenta, y no hay tiempo estimado. Ver «van 23 delante»
hace que la gente calcule y se vaya. El umbral y el texto son constantes en `src/lib/fila.js`.

**En iPhone las notificaciones web no llegan** salvo que la persona instale la página en su
pantalla de inicio. Por eso el aviso es la pantalla abierta que cambia sola, más sonido; y el
respaldo de verdad es que Cecilia cante el número.

## Fuera de alcance

Registro de estudiantes, correos automáticos, QR por estudiante, validación de asistencia, y
el evento virtual del 29.

La captura de matrícula y carrera para indicadores **tampoco es de la app**: se hace aparte, en
Excel o Forms. Es lo que permite que la fila no guarde datos de nadie.
