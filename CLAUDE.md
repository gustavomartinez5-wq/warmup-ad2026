# CLAUDE.md — Warm Up AD2026

Webapp de administración y operación del WarmUp AD2026 del CVDP. Evento: **28 de septiembre
de 2026**, 74 mesas, dos bloques.

Las reglas de cómo se escribe y cómo se trabaja viven en el `CLAUDE.md` del vault y en
`~/.claude/CLAUDE.md`. Aquí solo va lo que es de este repo.

**Antes de tocar nada, lee `SEGUIMIENTO.md`.** Ahí está en qué fase vamos y qué quedó a medias.

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
- **El Excel manda hasta el día del evento; el 28 manda la app.**

## Stack

Vite + React 19 + Tailwind 4 + react-router 7 + `@supabase/supabase-js`. SheetJS para leer el
`.xlsx` en el navegador. Sitio estático en Vercel, sin servidor propio: no hay nada que
renderizar en servidor y es una cosa menos que pueda fallar el día del evento.

```
src/
├── App.jsx              rutas
├── index.css            paleta CVDP como tokens de Tailwind
├── lib/
│   ├── supabase.js      cliente + edicionActiva()
│   └── sesion.jsx       contexto de sesión
├── components/          Protegida, MarcoAdmin, Cargando, EnObra
└── pages/
    ├── Entrar.jsx       login del equipo
    ├── Mesa.jsx         pantalla del reclutador, sin login
    ├── Host.jsx         vista del equipo el día del evento
    └── admin/           Tablero, Mesas, Empresas, Reclutadores, Cupos, Pendientes, Importar
```

## Rutas

| Ruta | Quién | Acceso |
|---|---|---|
| `/entrar` | equipo CVDP | correo y contraseña |
| `/admin/*` | equipo CVDP | sesión + estar en `equipo` |
| `/host` | hosts y becarios | sesión + estar en `equipo` |
| `/mesa` | reclutadores | por el QR, sin login |

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

**El mapa de mesas no es una tabla.** Se deriva de `reclutadores.mesa_numero` más el bloque.
Una mesa es excedente cuando su número pasa de `ediciones.total_mesas`.

### Quién ve qué

- Sin sesión: `carreras`, `ediciones` (solo `id, nombre, fecha, activa`), `mesas_estado`,
  y las dos funciones `mesas_publicas(bloque)` y `set_estado_mesa(numero, bloque, estado)`.
- Con sesión y en `equipo`: todo.
- Con sesión y fuera de `equipo`: nada.

`mesas_publicas` y `set_estado_mesa` son `SECURITY DEFINER` y ejecutables por `anon` **a
propósito**: son la puerta del reclutador. El asesor de seguridad de Supabase las marca; es
una excepción aceptada, no un descuido. `set_estado_mesa` solo escribe `estado` y
`ocupado_desde`, y rechaza una mesa que no esté asignada en ese bloque.

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
Tablero del Excel**. Al corte del 15-sep-2026: 54 empresas, 71 reclutadores en Bloque 1,
48 en Bloque 2, 71 mesas apartadas, 714 atenciones.

## Fuera de alcance

Registro de estudiantes, correos automáticos, QR por estudiante, lista de espera, validación
de asistencia, el evento virtual del 29, y cualquier pantalla para estudiantes.
