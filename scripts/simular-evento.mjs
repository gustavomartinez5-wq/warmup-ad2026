/**
 * Simulación del día del evento.
 *
 * Mueve los estados de las mesas por el mismo camino que usa el teléfono del
 * reclutador —la función pública `set_estado_mesa`, sin sesión— para ver cómo se
 * comporta el salón completo antes del 28.
 *
 *   node scripts/simular-evento.mjs poblar   [b1|b2]   una foto realista del salón
 *   node scripts/simular-evento.mjs correr   [b1|b2]   dos minutos de movimiento
 *   node scripts/simular-evento.mjs rafaga   [b1|b2]   todos a la vez, a ver qué aguanta
 *   node scripts/simular-evento.mjs limpiar  [b1|b2]   deja el salón como estaba
 *
 * No toca empresas, reclutadores ni cupos: solo `mesas_estado`.
 */
import { supabase } from '../src/lib/supabase.js'

const accion = process.argv[2] ?? 'poblar'
const bloque = process.argv[3] ?? 'b1'

const azar    = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
const deLista = l => l[Math.floor(Math.random() * l.length)]
const esperar = ms => new Promise(r => setTimeout(r, ms))

async function mesasDelBloque() {
  const { data, error } = await supabase.rpc('mesas_publicas', { p_bloque: bloque })
  if (error) throw error
  return data ?? []
}

async function marcar(numero, estado) {
  const t0 = Date.now()
  const { error } = await supabase.rpc('set_estado_mesa', {
    p_numero: numero, p_bloque: bloque, p_estado: estado,
  })
  return { numero, estado, ms: Date.now() - t0, error: error?.message ?? null }
}

/** Una foto del salón a media jornada, con mesas frescas, pasadas y vacías. */
async function poblar(mesas) {
  console.log(`Poblando ${mesas.length} mesas de ${bloque}…`)
  let ocupadas = 0, breaks = 0, noLlego = 0, disponibles = 0

  for (const m of mesas) {
    const dado = Math.random()
    if (dado < 0.55)      { await marcar(m.numero, 'ocupado');    ocupadas++ }
    else if (dado < 0.68) { await marcar(m.numero, 'break');      breaks++ }
    else if (dado < 0.78) { await marcar(m.numero, 'no_llego');   noLlego++ }
    else                  { await marcar(m.numero, 'disponible'); disponibles++ }
  }

  console.log(`  ${ocupadas} ocupadas · ${breaks} break · ${noLlego} no llegaron · ${disponibles} disponibles`)
  console.log('  Las ocupadas arrancaron todas ahora. Para ver ámbares y rojos,')
  console.log('  hay que atrasar `ocupado_desde` desde SQL.')
}

/** Dos minutos de salón en movimiento: sesiones que empiezan y terminan. */
async function correr(mesas) {
  const hasta = Date.now() + 2 * 60 * 1000
  let cambios = 0, fallos = 0
  const latencias = []

  console.log(`Corriendo 2 minutos sobre ${mesas.length} mesas de ${bloque}…`)

  while (Date.now() < hasta) {
    // Entre 3 y 8 reclutadores se mueven cada segundo, como en un salón real.
    const cuantos = azar(3, 8)
    const tanda = Array.from({ length: cuantos }, () => {
      const m = deLista(mesas)
      const estado = deLista(['ocupado', 'ocupado', 'ocupado', 'disponible', 'disponible', 'break'])
      return marcar(m.numero, estado)
    })

    for (const r of await Promise.all(tanda)) {
      cambios++
      latencias.push(r.ms)
      if (r.error) { fallos++; console.log(`  falla en la mesa ${r.numero}: ${r.error}`) }
    }
    await esperar(1000)
  }

  latencias.sort((a, b) => a - b)
  console.log(`  ${cambios} cambios · ${fallos} fallas`)
  console.log(`  latencia mediana ${latencias[Math.floor(latencias.length / 2)]} ms · ` +
              `peor ${latencias[latencias.length - 1]} ms`)
}

/** Todos los reclutadores del bloque tocando su botón en el mismo segundo. */
async function rafaga(mesas) {
  console.log(`Ráfaga: las ${mesas.length} mesas de ${bloque} al mismo tiempo…`)
  const t0 = Date.now()
  const res = await Promise.all(mesas.map(m => marcar(m.numero, 'ocupado')))
  const total = Date.now() - t0

  const fallos = res.filter(r => r.error)
  const ms = res.map(r => r.ms).sort((a, b) => a - b)
  console.log(`  ${res.length} llamadas en ${total} ms · ${fallos.length} fallas`)
  console.log(`  latencia mediana ${ms[Math.floor(ms.length / 2)]} ms · peor ${ms[ms.length - 1]} ms`)
  for (const f of fallos.slice(0, 5)) console.log(`  falla en la mesa ${f.numero}: ${f.error}`)
}

async function limpiar(mesas) {
  console.log(`Dejando disponibles las ${mesas.length} mesas de ${bloque}…`)
  await Promise.all(mesas.map(m => marcar(m.numero, 'disponible')))
  console.log('  listo. Para borrar las filas por completo: delete from mesas_estado;')
}

const mesas = await mesasDelBloque()
if (mesas.length === 0) {
  console.error(`No hay mesas asignadas en ${bloque}.`)
  process.exit(1)
}

const acciones = { poblar, correr, rafaga, limpiar }
if (!acciones[accion]) {
  console.error(`Acción desconocida: ${accion}. Usa poblar, correr, rafaga o limpiar.`)
  process.exit(1)
}
await acciones[accion](mesas)
process.exit(0)
