# Plan — ensayo con agentes

Propuesta, sin correr todavía. Decide Gustavo si se hace, con cuántos y cuándo.

## Por qué, si ya hubo simulación

La simulación del 15-sep probó que la máquina aguanta: 574 cambios en dos minutos sin fallas,
las 71 mesas en ráfaga en 683 ms. Pero el guion le hablaba directo a la base, saltándose las
pantallas. Probó el motor, no el tablero.

Lo que falta probar es lo otro: **si una persona que nunca vio la app, con el celular en la
mano y un estudiante enfrente, entiende qué tocar.** El criterio de cierre del plan original
lo dice así: «el ensayo corre completo sin que nadie tenga que preguntar cómo se usa».

Un agente de Claude sirve para eso porque **no sabe nada de antemano**: se le da un papel y la
liga, y tiene que resolverlo leyendo la pantalla. Si se atora, ahí está el problema de diseño.
Si inventa un botón que no existe, ahí está lo que la pantalla prometía y no cumplía.

## Qué probaría, y qué no

**Sí:**

- Si las instrucciones de la pantalla del reclutador alcanzan sin que nadie explique.
- Si un host encuentra a dónde mandar a un estudiante de una carrera, sin entrenamiento.
- Cómo se comporta Supabase con gente real navegando, no con un guion disparando REST:
  conexiones de tiempo real abiertas, mensajes por segundo, latencia de las pantallas.
- Si el tope de 100 mensajes por segundo del plan gratuito se siente o no se siente.

**No:**

- Si el salón físico funciona. Dónde poner los acrílicos, si hay señal en Centrales Norte,
  si el QR se lee con la luz de ahí. Eso es de cuerpo presente.
- Si los reclutadores de verdad —gente de empresa, apurada, con su propio celular— se
  comportan como un agente. Un agente es paciente y lee todo. Una persona no.

Por eso esto **no reemplaza el ensayo con personas**, lo antecede: sirve para llegar al
ensayo con personas sin errores tontos.

## Cómo se armaría

### Los papeles

| Papel | Cuántos | Qué hace |
|---|---|---|
| Reclutador | 6 | Entra por la liga del QR, busca su mesa y maneja su flujo dos horas comprimidas |
| Host | 2 | Recibe estudiantes inventados y decide a qué mesa mandarlos |
| Becario | 1 | Recorre el salón buscando mesas vacías y marca «No llegó» |

Nueve agentes. No 71: el volumen ya lo cubre `scripts/simular-evento.mjs`, que puede correr
en paralelo para poner el salón lleno de fondo mientras los nueve trabajan de verdad.

### Lo que se le dice a cada uno

Al reclutador, nada de la app. Solo el papel:

> Eres reclutador de una empresa en una feria de empleo del Tec. Te tocó una mesa y te dieron
> este QR: `https://warmup-ad2026.vercel.app/mesa`. Vas a atender estudiantes de 20 minutos.
> Tu empresa es <empresa>. Empieza. Reporta cada paso: qué viste, qué tocaste, qué esperabas
> que pasara y qué pasó. Si algo no se entiende, dilo en vez de adivinar.

Al host, igual: el papel y la liga, sin manual.

**La instrucción que hace que esto sirva:** *si algo no se entiende, dilo en vez de adivinar*.
Un agente que resuelve todo calladamente no reporta nada útil.

### Lo que se mide

De los agentes:

- Cuántos llegaron a marcar su primer estado sin preguntar.
- Dónde dudaron, con la frase textual de la duda.
- Qué botón buscaron que no existía.
- Cuántos marcaron mal por leer mal.

De Supabase, en paralelo:

- Conexiones simultáneas y mensajes por segundo, en Project Settings → Product Reports →
  Realtime del panel.
- Latencia y errores, con `query_logs` sobre `edge_logs`.
- Si algún cambio no llegó a alguna pantalla.

## Cuánto cuesta

Nueve agentes manejando navegador durante un rato no es barato: cada uno toma pantallazos,
lee, decide y vuelve. Es el camino caro de esta cuenta.

**Alternativa más barata que prueba casi lo mismo:** tres agentes —un reclutador, un host, un
becario— en vez de nueve, con el guion corriendo de fondo para el volumen. Los problemas de
comprensión salen con el primer agente; del tercero en adelante se repiten.

**Recomendación:** empezar con tres. Si los tres pasan limpio, no hace falta pagar por nueve.

## Cuándo

Después de que Gustavo revise el etiquetado de carreras y antes del ensayo con personas.
Idealmente con tres o cuatro días de colchón, para que dé tiempo de arreglar lo que salga.

## Cómo se deja la base

La prueba escribe estados de mesa igual que el evento. Al terminar:

```sql
delete from mesas_estado;
```

No toca empresas, reclutadores, carreras, cupos ni pendientes.

Los agentes entran a `/mesa` sin cuenta. Los que hagan de host necesitan la cuenta del equipo:
hay que decidir si se les da la de Gustavo por un rato o se crea una temporal y se borra al
final, como se ha hecho en cada verificación.

## Qué se hace con lo que salga

Lo que aparezca entra a `SEGUIMIENTO.md` en su propia sección, como se hizo con la simulación.
Lo que sea corrección de pantalla se arregla y se vuelve a desplegar. Lo que sea de logística
del salón se te pasa a ti, que ahí no manda la app.
