# Bitácora — editar el salón desde /host

Vive solo mientras este trabajo está en vuelo. Al cerrar la Fase 5 se pliega en
`SEGUIMIENTO.md` y este archivo se borra.

El plan completo está en la conversación; aquí va nada más dónde quedamos.

---

**Fase en curso:** 2
**Lo siguiente:** la hoja de edición en `/host` — botón «Editar esta mesa» dentro de `Detalle`.
**Algo a medias en la base:** nada. 54 empresas, 70 y 49 reclutadores, 1,101 etiquetas.

---

## Fase 1 · Los cimientos — cerrada

- **Qué quedó hecho:** `src/lib/mesaEquipo.js` con las lecturas y las cinco escrituras del
  equipo, y `src/components/CarrerasPicker.jsx` extraído de `admin/Empresas.jsx`, que ahora lo
  usa. Nada visible cambió.
- **Qué falta para cerrarla:** nada.
- **Verificado:** las consultas dan 119 filas, 54 empresas, 1,101 etiquetas, 70 y 49 por bloque.
  Sin sesión, `datosDelSalon()` se rechaza con *permission denied for table reclutadores* — que
  es justo lo que tiene que pasar. El acordeón renderizado a 375 px: seis escuelas, las siglas
  como pastillas, prender y apagar cambia la cuenta y el conjunto. `npm run build` limpio.
- **Cómo deshacer:** `git revert` del commit. Nada tocó la base.
- **Al cerrar:** `e1fa185` · ~14.92 M tokens.

## Fase 2 · Editar una mesa que ya existe — pendiente

- **Qué quedó hecho:**
- **Qué falta para cerrarla:** `EditarMesa.jsx`, el botón en `Detalle`, la guarda de mesa
  repetida, y que no aparezca cuando la fuente no es viva.
- **Verificado:**
- **Cómo deshacer:**
- **Al cerrar:**

## Fase 3 · Empresa nueva y agregar mesa — pendiente

## Fase 4 · Que los otros hosts se enteren solos — pendiente

## Fase 5 · El respaldo al día, y la documentación — pendiente

---

## Lo que no se toca en este trabajo

El estatus `'cancelado'` lo usan el editor, el importador y las cifras, pero **no está en el
enum de las migraciones** (`01_esquema_base.sql:5`). Se agregó a mano a la base viva y nunca se
commiteó. Hoy funciona; una base nueva levantada desde `supabase/migrations/` rechazaría ese
valor. Se avisó y se decide aparte.
