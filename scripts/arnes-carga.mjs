/**
 * Arnés de carga: 71 teléfonos y 2 pantallas de host, de verdad.
 *
 * Cada reclutador simulado abre su propio cliente de Supabase, con el mismo canal
 * y el mismo filtro que `src/pages/Mesa.jsx`. Cada host abre el canal sin filtro de
 * `src/pages/Host.jsx`. Para Supabase son 73 websockets indistinguibles de 73
 * celulares, así que lo que se mide aquí es lo que va a pasar el 28.
 *
 * Las escrituras van por `set_estado_mesa`, el mismo camino del botón del teléfono.
 * No hay SQL directo: un arnés que no pasa por donde pasa la app no prueba la app.
 *
 *   node scripts/arnes-carga.mjs apertura [b1|b2]   todos se conectan y marcan a la vez
 *   node scripts/arnes-carga.mjs regimen  [b1|b2]   tres horas comprimidas, ritmo natural
 *   node scripts/arnes-carga.mjs bloque             los de b1 se van y entran los de b2
 *   node scripts/arnes-carga.mjs rafaga   [b1|b2]   empuja por encima del tope a propósito
 *
 * Solo toca `mesas_estado`. Al terminar: delete from mesas_estado;
 */
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_KEY } from '../src/lib/config.js'

const HOSTS = 2
const TOPE_MENSAJES = 100   // plan gratuito de Supabase, por segundo

const escenario = process.argv[2] ?? 'apertura'
const bloqueArg  = process.argv[3] ?? 'b1'

const esperar = ms => new Promise(r => setTimeout(r, ms))
const azar    = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
const deLista = l => l[Math.floor(Math.random() * l.length)]

/** Un cliente por teléfono: cada uno abre su propio websocket, como en la vida real. */
function telefono() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// ─── Lo que se va midiendo ───────────────────────────────────────────────────

const medidas = {
  escrituras: 0,
  fallas: [],
  latenciasEscritura: [],
  latenciasReparto: [],
  recibidos: 0,
  conexiones: { ok: 0, error: 0 },
  latenciasConexion: [],
  porSegundo: new Map(),   // segundo -> mensajes repartidos en ese segundo
}

// Escrituras esperando confirmación por el canal, para detectar pérdidas.
const pendientes = new Map()   // numero -> { t0, estado }

function anotarReparto(numero, estado) {
  const p = pendientes.get(numero)
  if (!p || p.estado !== estado) return      // llegó otra cosa, o ya se contó
  medidas.latenciasReparto.push(Date.now() - p.t0)
  pendientes.delete(numero)
}

function contarMensaje() {
  medidas.recibidos++
  const s = Math.floor(Date.now() / 1000)
  medidas.porSegundo.set(s, (medidas.porSegundo.get(s) ?? 0) + 1)
}

// ─── Conexiones ──────────────────────────────────────────────────────────────

async function conectar(cliente, nombre, config, alRecibir) {
  const t0 = Date.now()
  return new Promise(resolve => {
    let resuelto = false
    const terminar = (bien, canal) => {
      if (resuelto) return                       // SUBSCRIBED puede llegar después del plazo
      resuelto = true
      medidas.conexiones[bien ? 'ok' : 'error']++
      medidas.latenciasConexion.push(Date.now() - t0)
      resolve(canal)
    }
    const canal = cliente.channel(nombre)
      .on('postgres_changes', config, alRecibir)
      .subscribe(estado => {
        if (estado === 'SUBSCRIBED') terminar(true, canal)
        else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') {
          console.log(`  conexión ${nombre}: ${estado}`)
          terminar(false, canal)
        }
      })
    setTimeout(() => terminar(false, canal), 20000)
  })
}

/** Las dos pantallas de host: canal sin filtro, igual que src/pages/Host.jsx. */
async function abrirHosts(bloque) {
  const abiertos = []
  for (let i = 0; i < HOSTS; i++) {
    const c = telefono()
    const canal = await conectar(c, `host-${bloque}-${i}`,
      { event: '*', schema: 'public', table: 'mesas_estado' },
      carga => {
        if (carga.new?.bloque !== bloque) return
        contarMensaje()
        if (i === 0) anotarReparto(carga.new.numero, carga.new.estado)
      })
    abiertos.push({ cliente: c, canal })
  }
  return abiertos
}

/** Un teléfono por mesa: canal filtrado, igual que src/pages/Mesa.jsx. */
async function abrirReclutadores(bloque, mesas) {
  // En paralelo a propósito: el 28, 71 personas escanean el QR cada quien por su
  // lado. Conectarlos en fila mediría este bucle, no a Supabase.
  return Promise.all(mesas.map(async m => {
    const c = telefono()
    const canal = await conectar(c, `mesa-${bloque}-${m.numero}`,
      { event: '*', schema: 'public', table: 'mesas_estado', filter: `numero=eq.${m.numero}` },
      carga => { if (carga.new?.bloque === bloque) contarMensaje() })
    return { cliente: c, canal, numero: m.numero, empresa: m.empresa }
  }))
}

function cerrar(lista) {
  for (const x of lista) { x.cliente.removeChannel(x.canal); x.cliente.realtime.disconnect() }
}

// ─── Escribir, por el mismo camino que el botón ──────────────────────────────

async function marcar(cliente, numero, bloque, estado) {
  const t0 = Date.now()
  pendientes.set(numero, { t0, estado })
  const { error } = await cliente.rpc('set_estado_mesa', {
    p_numero: numero, p_bloque: bloque, p_estado: estado,
  })
  medidas.escrituras++
  medidas.latenciasEscritura.push(Date.now() - t0)
  if (error) { medidas.fallas.push({ numero, estado, error: error.message }); pendientes.delete(numero) }
}

// ─── Los escenarios ──────────────────────────────────────────────────────────

async function apertura(bloque, mesas) {
  console.log(`Apertura: ${mesas.length} teléfonos y ${HOSTS} hosts conectándose…`)
  const t0 = Date.now()
  const hosts = await abrirHosts(bloque)
  const recs  = await abrirReclutadores(bloque, mesas)
  console.log(`  ${medidas.conexiones.ok} conexiones en ${Date.now() - t0} ms`)

  console.log('  Todos marcan Ocupado a la vez…')
  await Promise.all(recs.map(r => marcar(r.cliente, r.numero, bloque, 'ocupado')))
  await esperar(6000)
  cerrar([...hosts, ...recs])
}

async function regimen(bloque, mesas) {
  const minutos = 3
  console.log(`Régimen: ${mesas.length} teléfonos, ${minutos} minutos de ritmo natural…`)
  const hosts = await abrirHosts(bloque)
  const recs  = await abrirReclutadores(bloque, mesas)
  console.log(`  ${medidas.conexiones.ok} conexiones abiertas`)

  const hasta = Date.now() + minutos * 60 * 1000
  while (Date.now() < hasta) {
    // Un salón real mueve pocas mesas por segundo, no todas.
    const cuantos = azar(1, 4)
    await Promise.all(Array.from({ length: cuantos }, () => {
      const r = deLista(recs)
      return marcar(r.cliente, r.numero, bloque,
        deLista(['ocupado', 'ocupado', 'ocupado', 'disponible', 'disponible', 'break']))
    }))
    await esperar(1000)
  }
  await esperar(4000)
  cerrar([...hosts, ...recs])
}

async function rafaga(bloque, mesas) {
  console.log(`Ráfaga: empujando por encima de ${TOPE_MENSAJES} mensajes por segundo…`)
  const hosts = await abrirHosts(bloque)
  const recs  = await abrirReclutadores(bloque, mesas)
  console.log(`  ${medidas.conexiones.ok} conexiones abiertas`)

  // Cinco vueltas seguidas sin pausa: cada vuelta son ~3 mensajes por mesa.
  for (let v = 1; v <= 5; v++) {
    const estado = v % 2 ? 'ocupado' : 'disponible'
    const t0 = Date.now()
    await Promise.all(recs.map(r => marcar(r.cliente, r.numero, bloque, estado)))
    console.log(`  vuelta ${v}: ${recs.length} escrituras en ${Date.now() - t0} ms`)
  }
  await esperar(8000)
  cerrar([...hosts, ...recs])
}

async function cambioDeBloque(_b, _m) {
  console.log('Cambio de bloque: se van los de Bloque 1 y entran los de Bloque 2…')
  const b1 = await mesasDe('b1')
  const hosts1 = await abrirHosts('b1')
  const recs1  = await abrirReclutadores('b1', b1)
  console.log(`  Bloque 1 arriba con ${medidas.conexiones.ok} conexiones`)
  await Promise.all(recs1.map(r => marcar(r.cliente, r.numero, 'b1', 'disponible')))
  await esperar(3000)

  cerrar([...hosts1, ...recs1])
  console.log('  Bloque 1 desconectado. Entrando Bloque 2…')
  await esperar(2000)

  const b2 = await mesasDe('b2')
  const t0 = Date.now()
  const hosts2 = await abrirHosts('b2')
  const recs2  = await abrirReclutadores('b2', b2)
  console.log(`  Bloque 2 arriba en ${Date.now() - t0} ms`)
  await Promise.all(recs2.map(r => marcar(r.cliente, r.numero, 'b2', 'ocupado')))
  await esperar(5000)
  cerrar([...hosts2, ...recs2])
}

// ─── Reporte ─────────────────────────────────────────────────────────────────

const percentil = (l, p) => l.length ? [...l].sort((a, b) => a - b)[Math.floor(l.length * p)] : 0

function reportar() {
  const picos = [...medidas.porSegundo.values()].sort((a, b) => b - a)
  const pico = picos[0] ?? 0

  console.log('\n─── Resultado ───')
  console.log(`Conexiones          ${medidas.conexiones.ok} ok · ${medidas.conexiones.error} con error`)
  console.log(`Tiempo de conexión  mediana ${percentil(medidas.latenciasConexion, 0.5)} ms · ` +
              `p95 ${percentil(medidas.latenciasConexion, 0.95)} ms`)
  console.log(`Escrituras          ${medidas.escrituras} · ${medidas.fallas.length} fallas`)
  console.log(`Latencia escritura  mediana ${percentil(medidas.latenciasEscritura, 0.5)} ms · ` +
              `p95 ${percentil(medidas.latenciasEscritura, 0.95)} ms`)
  console.log(`Latencia reparto    mediana ${percentil(medidas.latenciasReparto, 0.5)} ms · ` +
              `p95 ${percentil(medidas.latenciasReparto, 0.95)} ms`)
  console.log(`Mensajes repartidos ${medidas.recibidos}`)
  console.log(`Pico por segundo    ${pico}  ${pico > TOPE_MENSAJES ? `— PASA el tope de ${TOPE_MENSAJES}` : `— bajo el tope de ${TOPE_MENSAJES}`}`)
  console.log(`Sin confirmar       ${pendientes.size} de ${medidas.escrituras} escrituras`)

  for (const f of medidas.fallas.slice(0, 5)) console.log(`  falla mesa ${f.numero}: ${f.error}`)
  if (pendientes.size) {
    console.log(`  (una escritura «sin confirmar» es una que nunca volvió por el canal:`)
    console.log(`   o se perdió el mensaje, o la mesa cambió otra vez antes de que llegara)`)
  }
}

// ─── Arranque ────────────────────────────────────────────────────────────────

async function mesasDe(bloque) {
  const { data, error } = await telefono().rpc('mesas_publicas', { p_bloque: bloque })
  if (error) throw error
  return data ?? []
}

const escenarios = { apertura, regimen, rafaga, bloque: cambioDeBloque }
if (!escenarios[escenario]) {
  console.error(`Escenario desconocido: ${escenario}. Usa apertura, regimen, bloque o rafaga.`)
  process.exit(1)
}

const mesas = await mesasDe(bloqueArg)
if (!mesas.length && escenario !== 'bloque') {
  console.error(`No hay mesas asignadas en ${bloqueArg}.`)
  process.exit(1)
}

await escenarios[escenario](bloqueArg, mesas)
reportar()
process.exit(0)
