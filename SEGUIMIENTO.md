# Seguimiento — Warm Up AD2026

Se actualiza al cerrar cada fase. Si el trabajo se corta a media fase, esto es lo que dice
dónde quedamos.

Última actualización: **24 de septiembre de 2026**, con la baja de PwC y COPARMEX en los dos bloques.

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
| Cambios del día | https://warmup-ad2026.vercel.app/admin/cambios |
| Latido de la base | https://warmup-ad2026.vercel.app/api/latido |

**Lo que falta, en orden:**

0. **Regenerar el mapa fijo si cambia una mesa.** `node scripts/hornear-mapa.mjs`, commitear y
   desplegar. `--verificar` dice si ya se quedó atrás; está en el preflight.

1. ~~Subir lo del 17-sep.~~ Resuelto: desde el 21-sep el `git push` funciona desde esta máquina
   y Vercel despliega solo.

2. **Las dos pruebas que piden sesión del equipo.** Son dos minutos y las tiene que hacer
   Gustavo, porque las contraseñas no pasan por el chat: abrir `/host` con la cuenta del
   equipo, tocar una mesa y darle a Guardar; y con dos `/host` abiertos a la vez, ver que el
   cambio aparece en el otro sin recargar.
3. **Pendientes que quedan con las empresas:** nombres faltantes (Caterpillar, HEB, Heineken,
   P&G, Vitro, SEG) y el correo «.con» de EATON. Index ya se resolvió: vienen como Index.
4. **Correr el preflight en seco** una vez antes del 28. Está en `PREFLIGHT.md`.
5. ~~Los dos agentes de host en Sonnet.~~ Hecho el 21-sep, dentro de la simulación del día
   completo (H1 y Cecilia). Gustavo marcó el reporte el 22-sep y ya se aplicó.

## Fases cerradas

### PwC no viene y COPARMEX a los dos bloques · 24-sep-2026

| Empresa | Qué quedó |
|---|---|
| PwC | No viene. Se liberaron B1-54 y B2-40. La empresa sigue en `empresas` sin mesas, así que el Tablero la cuenta todavía en las 61 |
| COPARMEX | Las mismas dos personas en la mañana y en la tarde: B1-12 y 13, y entran B2-18 y 19, con los nombres de B1 |

B1 se recorrió: 55–69 bajaron uno. B2: 18–39 subieron dos y 41–54 uno, para que COPARMEX quede
en su lugar alfabético. Quedan B1 72 mesas (1–68 y 72–75, libres 69–71) y B2 58 (1–55 y 73–75).
Mapa horneado; `--verificar` al día y sin números repetidos. El Excel de control no se tocó:
sigue sin los cambios del 23 y el 24.

### Confirmaciones por correo · 23-sep-2026

Gustavo revisó los correos de confirmación. Se aplicó a la base con las funciones de la app.

| Empresa | Qué quedó |
|---|---|
| Index | Dos personas de soporte en los dos bloques, sin mesa: 4 mesas en B1 y 2 en B2. Vienen como Index, no como Regal Rexnord. Nombres completados en la base |
| Growth & Profit | Cambian las personas; van dos, solo B1: 28 y 29 |
| COPARMEX | Las dos personas en B1: la de B2-18 pasa a B1-13 |
| Clarios, Benavides, OmniSource, Tec, Areya | Confirmaron; pendiente resuelto |

B1 se recorrió para que cada empresa quede junta y en el mismo orden: 13–35 subieron uno, luego
29–36. Heineken son dos personas por bloque: sale la tercera mesa de B2, agregada esa mañana. B2
se compactó del 1 al 54 en el mismo orden. Gustavo pasó Heineken de B1 a la 33–34, en su lugar
alfabético. Entró un séptimo experto, `Portafolio · Arquitectura` (ARQ), en B1-72, pegado a la
zona de portafolio; se agregó a `carreras-por-empresa.sql` con los otros seis, que no estaban y
ese script les habría borrado las carreras. Quedan B1 73 mesas (1–69 y 72–75, libres 70 y 71) y
B2 57 (1–54 y 73–75). Mapa horneado.

Una primera versión de esta entrada llevaba nombres de reclutadores y se subió al repo público.
Se quitaron aquí; siguen en el historial de git (commit `c1f3ec5`).

### 61 empresas, no 67 · 23-sep-2026

El Tablero decía 67 «Empresas registradas» porque contaba las seis fichas de portafolio
(`Portafolio · …`) como empresas. Ahora cuenta 61 y abajo dice «más 6 expertos de portafolio».
El cambio está en `calcularCifras`, que resta las de `GIRO_PORTAFOLIO`. Se revisó por SQL que no
hay empresas repetidas en la base: 67 filas, 61 nombres de empresa y 6 de portafolio. Se vio
renderizado a 390 px con datos simulados.

### El admin adelgaza · 22-sep-2026

Con el Mapa editable, varias pantallas repetían lo mismo. Gustavo decidió qué se queda.

| Qué | Qué pasó |
|---|---|
| «Empresas y Expertos» (la rejilla) | Sale de admin y de `/host`. `/host` queda con Mapa y Lista y abre en Mapa |
| Cupos | Sale: se lleva en un Excel aparte. La tabla `cupos` se queda en la base sin pantalla |
| Empresas | Sale. Su ficha se abre tocando la mesa en el Mapa de admin (`FichaEmpresa`) |
| Importar Excel | Sale del todo. El lector se queda para `verificar-importacion.mjs` |
| Tablero, Reclutadores, Pendientes, Cambios, QR, Hoja de papel | Se quedan |

Las rutas `/admin/empresas`, `/admin/cupos`, `/admin/importar` y `/admin/acomodo` llevan al Mapa.

En la ficha se editan el **contacto** (nuevo: antes no se editaba en ningún lado) y las carreras,
con un solo «Guardar». `guardarContacto` en `mesaEquipo.js` anota en la bitácora que cambió el
contacto, sin los valores. Las carreras usan `guardarCarreras`, que sí revisa si falla. La ficha
vieja no lo revisaba.

| Prueba | Resultado |
|---|---|
| `update` de contacto con la cuenta del equipo (se deshizo) | 1 fila; `anon` rechazado; contacto intacto al final |
| Mapa de admin a 390 px | Sin selector de vistas; «Editar acomodo» visible |
| Tocar una mesa con empresa | Abre la ficha: contacto editable, reclutadores, lo que escribió, carreras |
| El botón de la ficha | «Sin cambios» hasta que algo cambia; luego «Guardar» |
| Tocar una mesa libre | Abre el detalle («Nadie apartó esta mesa») |
| `/host` a 390 px | «Mapa · Lista» en el mismo renglón que el bloque; abre en Mapa |
| grep de lo borrado | Sin referencias sueltas |
| `npm run build` | Limpio |

Falta que Gustavo guarde un contacto real desde la ficha.

### «Editar acomodo» también en /host · 22-sep-2026

Mismo editor del Mapa de admin, en el Mapa de `/host`. Decisiones de Gustavo: las mesas en sesión
se ven y no se mueven, y los colores son los del estado en vivo.

- `AcomodoEnMapa` recibe tres opciones: `pintar` (color en vivo), `fija` (mesa en sesión) y
  `avisar` (el canal que `/host` ya tiene abierto, para no abrir otro).
- En `/host`, «Editar acomodo» sale junto a «+ Agregar mesa», solo en «Mapa» y con la base viva.
  Mientras se edita se esconden buscador y filtros, y se bloquean bloque y vista.
- Las filas salen de `datosDelSalon()`, sin nombres de reclutadores.

| Prueba (página local con estados de mentira) | Resultado |
|---|---|
| Mesa en sesión | Candado, no se levanta, no acepta que se suelte otra encima |
| Mesa en break | Se mueve normal |
| Soltar sobre una ocupada | Antes la intercambiaba con la vecina; corregido |
| «Orden alfabético» con la 57 en sesión | No se aplica: «Espera a que terminen: 57» |
| 390 px, toque largo | Intercambia; sin scroll lateral |
| `/host` sin editar | El botón sale solo en «Mapa» y cabe a 390 px |
| `npm run build` | Limpio |

Falta que Gustavo pruebe desde `/host` con su cuenta.

### Orden alfabético en el editor del Mapa · 22-sep-2026

Gustavo guardó su primer acomodo real en B1 a las 21:03: dos guardados, 10 mesas, con `acomodar`
en la bitácora. Con eso queda probado el camino completo desde el navegador. El mapa se horneó al
día (70 y 60).

Pidió un botón para regresar al estado original. «Orden alfabético» en el editor deja el
borrador así:
- empresas A–Z en mesas seguidas desde la 1;
- portafolio en las últimas mesas del salón, en el orden que traía.

Se guarda como cualquier cambio. El orden de `localeCompare('es', base)` da exactamente el de la
base (comprobado con B2, que sigue alfabético). En local, después de 4 movimientos, el botón
regresó el Mapa idéntico al del 22-sep.

### Acomodo mesa por mesa sobre el Mapa · 22-sep-2026

El editor por empresa completa no era lo que hacía falta. Gustavo quiere mover mesas sueltas en el
plano: por ejemplo, dejar una mesa de una empresa sola en otro lugar. Además, su primer guardado
con la versión anterior no llegó a la base: no hubo llamada a la función en los registros de
Supabase, así que se quedó en el recuadro de confirmar.

| Decisión de Gustavo | Qué quedó |
|---|---|
| Mesa por mesa, solo en el plano | «Editar acomodo» aparece solo en «Mapa» |
| Soltar encima intercambia | La 56 sobre la 54: la 54 pasa a la 56. Sobre una libre, se mueve |
| Guardar todo junto al final, directo | «Guardar acomodo · N mesas», sin recuadro de confirmar |
| Portafolio se mueve | Igual que cualquier mesa |
| Rejilla → «Empresas y Expertos», Plano → «Mapa» | En admin y en `/host`. En admin, A–Z y solo para ver |

Piezas:
- Migración 13 con `acomodar_mesas`.
- `AcomodoEnMapa.jsx`, que se carga aparte al entrar a editar (48 kB).
- Salen `AcomodoEnRejilla.jsx`, `src/lib/acomodo.js`, `@dnd-kit/sortable` y `@dnd-kit/utilities`.
- `RejillaMesas` mide su ancho al montarse; antes el primer cuadro salía con 4 columnas.

| Prueba | Resultado |
|---|---|
| `acomodar_mesas` con 56↔54 y 10→68 (se deshizo) | 3 mesas; la 10 queda libre; bitácora `acomodar` con empresa, de y a |
| Choque con una mesa quieta · fuera del salón · otro bloque · número repetido | Rechaza las cuatro |
| Mesa en sesión | Rechaza y dice cuál |
| Permisos | `anon` no la puede ejecutar |
| Salón y bitácora al terminar las pruebas | Intactos |
| Mapa a 1400 px: 56 sobre 54 | Intercambiadas, con contorno cian y «antes» |
| Una mesa de Johnson a la libre 68 | Johnson queda en 43–45 y 68; la 42 libre |
| Portafolio 75 → 70, y «Deshacer último» | Se mueve y vuelve; el botón baja de 4 a 3 mesas |
| Mapa a 390 px, plano girado, toque largo | Intercambia; sin scroll lateral |
| «Empresas y Expertos» | A–Z por el nombre visible; sin botón de editar |
| `/host` a 390 px | El selector de tres cabe en un renglón |
| `npm run build` | Limpio |

Se probó montando la página real con datos del mapa horneado, porque `/admin` pide sesión.

### Acomodo de mesas arrastrando · 22-sep-2026

Desde la tarde del 22-sep, las mesas viven en la app y no en el Excel: van en orden alfabético
por bloque. Gustavo pidió acomodarlas arrastrando empresas, como los íconos de un celular.

| Decisión de Gustavo | Qué quedó |
|---|---|
| Se arrastra la empresa completa | Una ficha por empresa. Sus mesas van seguidas y se renumeran solas |
| Cada bloque por su cuenta | Selector B1 · B2. El número no se amarra entre bloques |
| Importador apagado | `/admin/importar` solo muestra el aviso. `verificar-importacion.mjs --aplicar` sale con error |
| El Excel no se toca | Las bajas de Definity y Redwood van solo a la base |

Piezas:
- Migración 12 con `reordenar_salon`.
- `src/lib/acomodo.js` y `AcomodoEnRejilla.jsx`.
- «Editar acomodo» en `/admin/mesas`: la misma rejilla se vuelve arrastrable. Se carga aparte
  (49 kB) al entrar a editar. Primero fue una pantalla aparte, `/admin/acomodo`; Gustavo lo quería
  sobre el Mapa de mesas y esa ruta ahora redirige ahí.
- `/admin/impreso` ahora lee de la base y usa el mapa horneado de respaldo.

Bajas avisadas el 22-sep:
- **Definity:** queda una persona en B1 y dos en B2. Las dos personas que iban a los dos bloques
  no asisten.
- **Redwood:** su reclutadora confirma los dos bloques. Sale la segunda persona «Por definir».

Se aplicaron con las funciones de la app, en una transacción: `liberar_mesa` para las seis filas y
`reordenar_salon` para cada bloque, respetando el orden alfabético. Quedó Definity en B1-16 y B2-20
y 21, y Redwood en B1-53 y B2-46. Cambiaron de número 27 empresas en B1 y 22 en B2. El pendiente de
Redwood en la base quedó resuelto.

| Cifra | B1 | B2 |
|---|---|---|
| Lugares | 70 (1–67 y 73–75) | 60 (1–57 y 73–75) |
| Libres | 68–72 | 58–72 |

| Prueba | Resultado |
|---|---|
| Arrastre con mouse a 390 px | Definity pasa de 12–14 a 1–3. Las demás se recorren y marcan «antes» |
| Presión larga con toque simulado | Levanta y mueve la ficha. Un deslizamiento corto hace scroll y no mueve nada |
| Teclado (Espacio, flecha, Espacio) | Mueve la ficha |
| 390 px | El documento mide 390 px, sin scroll lateral |
| 1280 px | Cinco columnas con nombres completos. Portafolio va aparte con las mesas libres |
| `npm run build` | Limpio. El paquete principal no creció |
| `reordenar_salon` con el mismo orden | 0 cambios, nada en la bitácora |
| Falta una empresa · empresa repetida | Rechaza las dos |
| Mesa en sesión que cambiaría de número | Rechaza y dice cuál (probado en un bloque que se deshace) |
| Permisos | `anon` no la puede ejecutar; `authenticated` sí |
| Después de las bajas | Sin repetidos, sin huecos, ninguna empresa partida, orden alfabético intacto |
| Bitácora | 6 «liberar» y 2 «reordenar» |
| `hornear-mapa.mjs --verificar` | Al día: 70 y 60 |

Se probó en una página local temporal con el mapa horneado, porque `/admin` pide sesión. La versión
sobre el Mapa de mesas se probó igual, montando la página real con datos del mapa: el botón abre el
modo, el otro bloque se bloquea, una empresa de seis mesas va al final al soltarla en una libre, y
a 390 px el toque largo mueve la empresa sin scroll lateral. Falta que Gustavo haga un guardado real.

### Mapa compactado con el Excel del equipo · 22-sep-2026

Datos del Excel del equipo del 22-sep (`… 28 de septiembre (4).xlsx`), hojas Reclutadores y
Expertos Portafolio. Libro con Excel COM (respaldo «antes de compactar mapa 22-sep») y base por
SQL: no hay credenciales del equipo para correr el importador.

| Cambio | Decisión de Gustavo |
|---|---|
| BBVA solo en Bloque 1 | Sale de B2 |
| Definity: dos personas aparecen solo en Expertos Portafolio | Siguen en sus mesas; revisan portafolio sin mesa extra |
| Redwood: su reclutadora en los dos bloques y una persona por definir en los dos | Se usa lo del Excel, porque aún están por definir |
| SEG anotó 2 personas y dio 1 nombre | Entra «Por definir» en B2 |
| Clarios | Contacto actualizado a la reclutadora de Bloque 2 |
| Mapa | Compactado: primero las 11 empresas de todo el día (1–22, mismo número en los dos bloques), luego las de un bloque, cada una en mesas seguidas. B1 1–70, B2 1–57, portafolio 73–75 |

| Prueba | Resultado |
|---|---|
| Tablero del libro | 65 empresas · 73 en B1 · 60 en B2 · 73 mesas · 798 de capacidad · 13 por confirmar |
| Libro contra base (md5 por bloque) | Idénticos |
| SQL | Sin mesas repetidas, ninguna empresa partida, las de todo el día con el mismo número |
| `hornear-mapa.mjs --verificar` | Al día: 73 y 60 |
| `/mesa` a 375 px | Mesas nuevas, sin scroll lateral |
| `npm run build` | Limpio |

Primer intento: `Range.Sort` de COM ordenó columnas en vez de filas. Se restauró el respaldo y se
rehízo sin ordenar la hoja.

### Plano del salón en /host · 22-sep-2026

Tercera vista en `/host`: Rejilla · Plano · Lista. Pinta las mesas donde están en el piso, según el
mapa oficial del vault (`Ediciones/WarmUp AD26/WarmUp AD26 - Mapa del evento.html`). La forma vive
en `src/lib/plano.js` y la pinta `src/components/PlanoSalon.jsx`.

- Abajo de 900 px va vertical: mesa 1 arriba, puertas de servicio a la izquierda, acceso a la
  derecha. Desde 900 px va como el mapa oficial: mesa 1 abajo a la derecha, acceso abajo.
- Nombre completo de la empresa en hasta tres renglones; una palabra larga baja un punto para no
  partirse. Portafolio lleva contorno punteado y se nombra por su perfil.
- Mismos colores, reloj, hoja de detalle y alta en mesa libre que la rejilla. Con filtro, las que
  no coinciden se apagan sin moverse.

| Prueba | Resultado |
|---|---|
| Posición de 1, 5, 6, 10, 31, 35, 36, 40, 71 y 75 contra el mapa oficial | Cuadran; acceso frente a 31–40 |
| 390, 768, 1024 y 1280 px, los dos bloques | Sin nombres cortados, sin palabras partidas, sin scroll lateral |
| `npm run build` | Limpio |

Se verificó en una página local temporal con el mapa fijo y estados de mentira, porque `/host` pide
sesión.

**El mismo día, tres cosas más.** El encabezado de `/host` deja de ir fijo cuando la pantalla mide
menos de 560 px de alto: con el celular acostado se comía la pantalla. `/admin/mesas` gana el
selector Rejilla · Plano, con sus propios colores de estado. Y `/admin/impreso` gana un selector
Listas · Plano: la hoja del plano va acostada, una por bloque, con número, empresa y las carreras
dentro de cada mesa (las primeras doce y `+n`). `PlanoSalon` ya solo acomoda; cada pantalla pinta
su mesa y la pasa en `celda`.

| Prueba | Resultado |
|---|---|
| Hoja del plano a PDF, carta acostada | Una hoja por bloque, sin cortar columnas |
| Nombres en el papel y en pantalla | Ninguno partido a media palabra |
| `npm run build` | Limpio |

### Management Solutions y GPvivienda · 22-sep-2026

Dos cambios que avisó Gustavo, con los datos del Forms del 22-sep (`… 28 de septiembre (3).xlsx`).
Libro con Excel COM (respaldo «antes de Management Solutions y GPvivienda 22-sep») y base por SQL.

| Cambio | Mesa |
|---|---|
| Management Solutions baja a 1 persona en los dos bloques. Se queda el consultor de la oficina MTY | B1-1 y B2-1. La 2 queda libre en los dos bloques |
| GPvivienda, empresa nueva (registro 65): Arquitectura y construcción, ARQ, IC y LDI | B2-53 |

| Prueba | Resultado |
|---|---|
| Tablero del libro | 62 empresas · 72 en B1 · 58 en B2 · 780 de capacidad |
| Lector de la app sobre el libro | 62 y 130, sin avisos |
| Libro contra base (md5) | Idénticos: 130 reclutadores, 62 empresas |
| `hornear-mapa.mjs --verificar` | Al día: 72 y 58 |
| `npm run build` | Limpio |

Después, con el OK de Gustavo, entró lo demás del mismo archivo (respaldo «antes de Steelcase,
Redwood y EATON 22-sep»):

| Cambio | Mesa |
|---|---|
| Una persona de Steelcase revisa portafolio LDI. Experta aparte: `Portafolio · Diseño (Steelcase)`, EP-6 | B1-73. La zona de portafolio de B1 pasa a 73–75 |
| Redwood, registro 64: 1 persona, solo B2. Sale de B1 y sale la segunda «Por definir». Queda como pendiente confirmar B1 | B2-5. Libres B1-5, B1-6, B2-6 |
| EATON, empresa nueva (registro 66): Manufactura, IIS, BIE, IM, IMA, IMT, BME. El correo dice «.con»: pendiente | B2-54 |
| Definity, Areya y BECK también revisan portafolio, sin mesa extra | — |

| Prueba | Resultado |
|---|---|
| Tablero del libro | 64 empresas · 71 en B1 · 58 en B2 · 774 de capacidad · 10 por confirmar |
| Libro contra base (md5) | Idénticos: 129 reclutadores, 64 empresas |
| `hornear-mapa.mjs --verificar` | Al día: 71 y 58 |

**Un alta más, en la tarde.** Sustainability Engineering Group (registro 67): Arquitectura y
construcción, IC y ARQ, una persona en B2-55, junto a EATON. Anotó 2 personas y dio 1 nombre, así
que queda un pendiente abierto. Libro y base idénticos: 65 empresas, 71 en B1 y 59 en B2.

La hoja «Expertos Portafolio» pone a tres personas de Areya en B2. Gustavo confirmó el 22-sep que
de Areya viene solo una, la que ya está en B2-52. No cambia nada.

### Lo que se aplicó de la simulación del día completo · 22-sep-2026

Gustavo marcó el reporte.
- En pantalla:
  - Aviso en `/fila` si la mesa apartada deja de servir.
  - «Tu mesa cambió» con un botón por mesa.
  - Línea de los 20 minutos en `/mesa`.
  - «Si llega, toca Disponible.» en `/host`.
  - Consejos de portafolio de la Guía de Industrias Creativas.
  - «Para volver, escanea el QR de la entrada.»
- Reglas escritas en el `CLAUDE.md`: no se mueve una mesa ocupada; «Pasó» al entregar al estudiante
  al host; la 73 de Bloque 1 es libre. Esto último corrige la entrada del 17-sep, que decía que la
  zona de portafolio eran las tres últimas mesas en los dos bloques.

Verificado a 390 px con datos simulados.

### Simulación del día completo con Sonnet · 21-sep-2026

Plan: guion (A) → siete agentes Sonnet con imprevistos sorteados para el host (B) → reporte con
casillas (C). Nada se aplica; Gustavo marca.

- **A ✅** Guion en el vault: `Ediciones/WarmUp AD26/WarmUp AD26 - Guion de pantallas del día.md`,
  sacado del render a 390 px con datos de mentira.
- **B · lanzada.** Corrida `wf_bed6e9b1-28b`, 7 agentes Sonnet (E1, E2, E3, Cecilia, H1, R1, R2).
  Si se corta, se retoma con `resumeFromRunId`. El sorteo se hizo con `secrets` de Python sobre el
  mapa de Bloque 1, porque el Workflow no permite `Math.random`:
  - No llegaron: Tecnológico de Monterrey (61) y Growth & Profit Consulting (16).
  - Goldco pasa de la 48 a la 68, que tiene KATCON.
  - Johnson Controls pasa de la 52 a la 73, que está libre.
  - Mesas de los reclutadores: R1 en la 50 (Caterpillar) y R2 en la 2 (Management Solutions),
    con el intercambio 2 ↔ 3.
- **B ✅** Los siete terminaron sin error, en 4 min.
- **C ✅** Reporte en el vault: `Ediciones/WarmUp AD26/WarmUp AD26 - Simulación del día completo.md`,
  con el `.json` al lado. Nueve hallazgos con casillas. **Nada aplicado:** Gustavo marca. Los dos más
  serios, confirmados en el código:
  - Mover una mesa con una sesión en curso borra su reloj: `limpia_estado` en la migración 08.
  - `/fila` no se entera si la mesa que Cecilia apartó deja de estar disponible.

### Ajustes al salón por la simulación de Antigravity · 21-sep-2026

Cuatro agentes (dos reclutadores y dos hosts) recorrieron `/mesa` y `/host`. El reporte está en
`Ediciones/WarmUp AD26/WarmUp AD26 - Simulación del salón y reclutadores.md`. Gustavo eligió qué
aplicar:

- **`/mesa` se da cuenta si le mueven la mesa.** El teléfono guarda la empresa junto con el
  número. Si en su número ya no está su empresa, sale «Tu mesa cambió»: con una sola mesa en el
  bloque, «Ir a la mesa N»; con varias, la lista filtrada por su empresa. Cubre también el
  intercambio, en el que el número sigue asignado pero a otra empresa. El QR sigue siendo uno solo.
- **`/mesa`:** el reloj ya no parpadea a los 20 (queda rojo con «de más»); «Cambiar» pasó del pie al
  encabezado; la pantalla no se apaga mientras la mesa está Ocupado.
- **`EditarMesa`:** Recorrer e Intercambiar piden confirmar, como Liberar, y dicen qué empresas se
  mueven.
- **`/host`:** sin filtro, la Rejilla pinta del 1 al total y la mesa libre queda punteada; al
  tocarla se abre Agregar con ese número. El buscador busca por palabras: «IMT manufactura» trae
  las que coinciden con las dos.

Verificado a 390 px con datos simulados: los tres casos de mesa cambiada, el reloj sin `late`, el
wake lock que se pide y se suelta, «18 · Libre» en su lugar y la confirmación sin llamada a la base
hasta tocar «Sí, mover».

### Expertos de portafolio, 75 mesas y control completo del salón · 17-sep-2026

Llegaron tres cosas juntas: los cinco expertos de portafolio creativo de EAAD, el salón
confirmado en 75 mesas, y la necesidad de reacomodar el salón el día del evento sin entrar
por SQL.

**Los cinco expertos.** Entran como una empresa cada uno, nombrada por el perfil que revisa,
porque las carreras van pegadas a la empresa: con una sola empresa de cinco mesas, el
estudiante de urbanismo habría salido mandado a la mesa de animación. Giro nuevo para las
cinco, `Revisión de portafolio`, que es lo que saca la zona completa de un toque.

| Empresa | Bloque · Mesa | Carreras |
|---|---|---|
| Portafolio · Diseño | B1 · 74 | LDI |
| Portafolio · Urbanismo | B1 · 75 | LUB |
| Portafolio · Diseño y Animación | B2 · 73 | LDI, LAD |
| Portafolio · Todos los perfiles | B2 · 74 | ARQ, LDI, LAD, LUB |
| Portafolio · Animación | B2 · 75 | LAD |

Las últimas tres mesas quedan como zona de portafolio en los dos bloques. En Bloque 2 ya
estaban libres; en Bloque 1 las tenía GE Vernova con tres personas, y se movieron completas
—72, 73 y 74 pasan a 33, 34 y 35, las que dejó libres Areya— para no partir a la empresa.
Quedan libres la 72 y la 73 en Bloque 1.

Dos pendientes nuevos, los dos anotados en la nota de su empresa: Saúl Cabriales contestó
horario de 10:00 a 12:00 y se va una hora antes de que cierre Bloque 1, y Cecilia González
dijo «todos los perfiles», que se tomó como las cuatro carreras de EAAD.

**El control del salón.** `EditarMesa` es ahora el único editor y lo usan las dos puertas:
`/host` en el celular y `/admin/reclutadores` en el escritorio. Siete acciones, nombradas como
se dicen en el salón: cambiar quién se sienta, mover, intercambiar, recorrer desde aquí,
liberar, agregar mesa y cambiar de bloque. Cuando el número que se pide está tomado, la hoja
no se queda en «no puedes»: ofrece intercambiar o recorrer, y guarda antes lo que ya se cambió
arriba para que elegir una salida no lo tire.

Los movimientos viven en Postgres (`08_editar_el_salon.sql`), no en el navegador:
`reclutadores_mesa_unica` es un índice único parcial y no se puede diferir, así que dos
`update` seguidos truenan o —peor— dejan el salón a medias si se cae la red entre uno y otro.
La migración arregla además que **`'cancelado'` no estaba en el enum `estatus_t`**: se había
agregado a mano a la base viva y nunca se commiteó.

También quedó `/admin/cambios`, la bitácora del día. Existe por una razón concreta: el 28 manda
la app, pero una reimportación del libro borra y reinserta `reclutadores`, así que sin esta
lista todo lo que el equipo arregla en el salón se pierde al día siguiente sin que nadie se dé
cuenta.

**Que los otros hosts se enteren.** Canal de difusión `salon-<bloque>`: quien guarda avisa y
las otras pantallas vuelven a pedir `mesas_publicas`. Es difusión y no `postgres_changes` sobre
`reclutadores` a propósito —esa tabla trae nombres de personas de fuera del Tec—, y el texto
que se lee vive en la pantalla y no en el mensaje: la clave pública está a la vista y
cualquiera podría mandar un aviso con lo que quisiera escrito.

| Prueba | Resultado |
|---|---|
| Tablero del libro | 60 empresas · 73 en B1 · 57 en B2 · 780 de capacidad |
| Lector de la app sobre el libro | 60 y 130, sin avisos |
| Libro contra base, fila por fila (md5) | Idénticos: 130 reclutadores, 60 empresas |
| Mesas repetidas · mesa más alta | 0 · 75 en los dos bloques |
| Empresas sin carreras etiquetadas | 0 de 60. Etiquetas: 1,112 |
| Pendientes abiertos | 27 |
| `hornear-mapa.mjs --verificar` | Al día: 73 y 57 |
| `/mesa` en los dos bloques a 390 px | Buscar «portafolio» da 2 mesas en B1 y 3 en B2, en vivo |
| `/host`, filtro de giro «Revisión de portafolio» | Las 3 mesas de B2, en teal |
| `/admin/impreso` | «Revisión de portafolio (EAAD): 74, 75», y LDI llega a la 74 y LUB a la 75 |
| Editor a 390 px, modo alta | Arranca en «Otra empresa…» con la 72 sugerida y el botón apagado |
| Editor a 390 px, número tomado | «La mesa 7 la tiene Cemex» + intercambiar + «65 mesas suben una» |
| Intercambiar dos mesas (contra la base, deshecho) | Cemex a la 1 y Management Solutions a la 7 |
| Recorrer un tramo (contra la base, deshecho) | Steelcase 70 y 71 pasan a 71 y 72; KATCON no se mueve |
| Recorrer sin hueco hasta el final | Avisa y no toca nada |
| Mover a una mesa tomada | Avisa y no toca nada |
| Liberar y reasignar | La mesa queda libre y **no hereda el estado viejo** |
| Cambiar la empresa de una mesa | Entra la nueva y el nombre pasa a «Por definir» |
| Bitácora | Una línea por acción, y las trece formas se leen en español |
| Dos pantallas abiertas | La que no hizo el cambio muestra el aviso y refresca sin recargar |
| `/mesa` al llegar el aviso | Vuelve a pedir `mesas_publicas`, una vez |
| Permisos de las nueve funciones | `authenticated` sí, `anon` no |
| `npm run build` | Limpio |

Las escrituras se probaron como una cuenta del equipo dentro de una transacción que se deshace
al final: la base quedó igual que estaba. **Falta la puntada que une pantalla y escritura**
—guardar desde `/host` con la cuenta de verdad— y ver dos `/host` a la vez. Son los dos puntos
de arriba.

### Revisión con el equipo: registro contra hoja · 17-sep-2026

Se cruzó persona por persona el registro crudo del Forms (62) contra la hoja del equipo (112
filas) y Gustavo lo revisó con su compañera en `~/Downloads/WarmUp AD26 - Revisión Registro vs
Reclutadores.xlsx`. Se aplicó lo que decidieron, al libro (respaldo «antes de decisiones
17-sep») y a la base con la misma lógica del importador:

| Decisión | Efecto |
|---|---|
| Areya va en Bloque 2, confirmada | B1 33–35 libres; B2 52–54 |
| BBVA viene en los dos bloques, confirmada | Sin cambio de mesa |
| KATCON son 2 | Sale la mesa 75. **Ya no hay excedente** |
| Gentherm sí es apellido | Se quitaron esas notas y las de mesa que ya no aplicaban |
| Index viene como Regal Rexnord; Clarios por confirmar | Quedan como pendientes abiertos |
| ELLAZ era una prueba | Borrada con su etiqueta |

La prueba de Gustavo en el editor no dejó otra huella: las carreras de la base cuadran contra
`carreras-por-empresa.sql` salvo ELLAZ. BECK se sumó a ese archivo.

| Prueba | Resultado |
|---|---|
| Tablero del libro | 55 empresas · 71 en B1 · 54 en B2 · 750 de capacidad |
| Libro contra base (md5) | Idénticos: 125 reclutadores, 55 empresas |
| Mesas repetidas · mesa más alta | 0 · 74 en B1, 61 en B2 |
| Etiquetas | 1,103 (1,101 + las 2 de BECK) |
| Pendientes | 25 abiertos, 3 resueltos (Areya, BBVA, KATCON) |

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

Del Excel de control, con la revisión del equipo del 17-sep-2026 (Forms con 62 registros) y
los cinco expertos de portafolio de EAAD.

| Indicador | Valor |
|---|---|
| Empresas registradas | 60 (55 + 5 de portafolio) |
| Reclutadores Bloque 1 (10:00–13:00) | 73 |
| Reclutadores Bloque 2 (14:00–17:00) | 57 |
| Mesas apartadas | 74 de 75 |
| Capacidad del evento | 780 atenciones |
| Empresas con algo pendiente | 30 (3 ya resueltos) |

La base ya trae estas cifras cargadas y verificadas. Cuando entren registros nuevos, se
captura en el Excel como siempre y se vuelve a importar.
