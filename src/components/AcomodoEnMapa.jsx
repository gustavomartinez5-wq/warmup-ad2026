import { useEffect, useRef, useState } from 'react'
import {
  DndContext, DragOverlay, pointerWithin,
  MouseSensor, TouchSensor, useSensor, useSensors, useDraggable, useDroppable,
} from '@dnd-kit/core'
import { supabase } from '../lib/supabase'
import { mapaDeMesas, ESTADO_MESA, GIRO_PORTAFOLIO } from '../lib/cifras'
import { MESAS_EN_PLANO, nombreCorto, letraDelNombre } from '../lib/plano'
import { acomodarMesas } from '../lib/mesaEquipo'
import { RANURAS, listarGuardados, guardarAcomodo, planDesdeGuardado, cuandoSeGuardo } from '../lib/acomodosGuardados'
import PlanoSalon from './PlanoSalon'

/**
 * «Editar acomodo» sobre el Mapa de `/admin/mesas`: se mueven mesas sueltas, como
 * los íconos de un celular.
 *
 * Soltar una mesa sobre otra las intercambia: si la 56 cae en la 54, la 54 pasa a
 * la 56. Soltar sobre una libre la mueve ahí y la de origen queda libre. Una empresa
 * puede quedar partida; es decisión del equipo. Portafolio se mueve igual.
 *
 * Todo vive en un borrador hasta «Guardar acomodo», que guarda directo —sin
 * recuadro de confirmar— las mesas que cambiaron, en una transacción
 * (`acomodar_mesas`, migración 13), y avisa por `salon-<bloque>`.
 *
 * Se carga aparte, al entrar a editar: la librería de arrastre no tiene por qué
 * viajar en el paquete de las pantallas del evento.
 *
 * Lo usan dos pantallas. `/admin/mesas` lo usa tal cual. `/host` le pasa tres cosas:
 *   pintar(fila, numeroOriginal) — el color del estado en vivo, que es del número
 *                                  donde estaba la mesa, no de la empresa;
 *   fija(fila, numeroOriginal)   — true si esa mesa está en sesión: no se arrastra ni
 *                                  se le suelta otra encima (la base también lo exige);
 *   avisar()                     — el aviso por `salon-<bloque>` sale por el canal
 *                                  que `/host` ya tiene abierto, no por uno nuevo.
 *
 * Los mapas guardados (Mapa 1, 2 y 3) viven aquí, en las dos pantallas. Cargar uno solo
 * llena el borrador, igual que «Orden alfabético»; guardar uno no mueve mesas.
 */

/** El borrador: qué número tiene cada fila del bloque. */
const numerosDe = filas => new Map(filas.map(f => [f.id, f.mesa_numero]))

const porNombre = (a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })

/**
 * El salón como quedó el 22-sep: las empresas en orden A–Z, cada una en mesas
 * seguidas desde la 1, y portafolio en las últimas mesas del salón (73–75), en el
 * orden que ya traían. Es el mismo orden que usa la base (comprobado contra B2).
 * Dentro de una empresa, sus mesas van en el orden en que estaban.
 *
 * Devuelve null si no cabe: más mesas que el salón antes de la zona de portafolio.
 */
function ordenAlfabetico(filas, original, totalMesas) {
  const numeroOriginal = f => original.get(f.id) ?? Infinity
  const esPortafolio = f => f.giro === GIRO_PORTAFOLIO

  const porEmpresa = new Map()
  for (const f of filas.filter(f => !esPortafolio(f))) {
    if (!porEmpresa.has(f.empresa)) porEmpresa.set(f.empresa, [])
    porEmpresa.get(f.empresa).push(f)
  }
  const portafolio = filas.filter(esPortafolio).sort((a, b) => numeroOriginal(a) - numeroOriginal(b))
  const inicioPortafolio = totalMesas - portafolio.length + 1

  const nuevo = new Map()
  let siguiente = 1
  for (const empresa of [...porEmpresa.keys()].sort(porNombre)) {
    for (const f of porEmpresa.get(empresa).sort((a, b) => numeroOriginal(a) - numeroOriginal(b))) {
      nuevo.set(f.id, siguiente++)
    }
  }
  if (siguiente > inicioPortafolio) return null
  portafolio.forEach((f, i) => nuevo.set(f.id, inicioPortafolio + i))
  return nuevo
}

function Celda({ mesa, antes, angosta, arrastrando, color, fija }) {
  const { numero, reclutador: r, estado } = mesa
  const drag = useDraggable({ id: `m${numero}`, data: { numero }, disabled: !r || fija })
  const drop = useDroppable({ id: `m${numero}`, data: { numero }, disabled: fija })
  const ref = el => { drag.setNodeRef(el); drop.setNodeRef(el) }

  const nombre = nombreCorto(r?.empresa ?? '')
  const levantada = arrastrando === numero
  const portafolio = r?.giro === GIRO_PORTAFOLIO
    ? 'outline-2 outline-dashed outline-offset-1 outline-lavanda' : ''
  const movida = antes != null

  return (
    <div
      ref={ref}
      {...(r && !fija ? drag.listeners : {})}
      {...(r && !fija ? drag.attributes : {})}
      title={nombre ? `${numero} · ${nombre}${fija ? ' · en sesión' : ''}` : `Mesa ${numero}`}
      className={`w-full h-full rounded-lg border ${angosta ? 'px-0.5' : 'px-2'} py-2 text-left
                  min-h-[58px] flex flex-col justify-between min-w-0 select-none
                  ${color ?? ESTADO_MESA[estado].clase} ${portafolio}
                  ${r && !fija ? 'cursor-grab touch-manipulation' : ''}
                  ${movida && !levantada ? 'ring-2 ring-cian' : ''}
                  ${drop.isOver && !levantada ? 'ring-2 ring-white scale-[1.04]' : ''}
                  ${levantada ? 'opacity-30 border-dashed' : ''}`}
    >
      <span className="text-[11px] font-bold cifra opacity-70">
        {numero}{fija && <span aria-label="en sesión, no se mueve"> 🔒</span>}
      </span>
      <span className={`${letraDelNombre(nombre, angosta)} leading-tight line-clamp-3 break-words`}>
        {nombre}
      </span>
      {movida && !angosta && (
        <span className="text-[10px] cifra text-cian leading-none mt-0.5">antes {antes}</span>
      )}
    </div>
  )
}

export default function AcomodoEnMapa({ edicion, filas, bloque, onGuardado, onSalir, pintar, fija, avisar }) {
  // Las filas del bloque tal como están en la base; el borrador parte de aquí.
  const delBloque = filas.filter(f => f.bloque === bloque)
  const [original] = useState(() => numerosDe(delBloque))
  const [borrador, setBorrador]   = useState(() => numerosDe(delBloque))
  const [historial, setHistorial] = useState([])
  const [arrastrando, setArrastrando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState(null)
  const canal = useRef(null)
  // Mapas guardados: null mientras llegan.
  const [guardados, setGuardados] = useState(null)
  const [avisos, setAvisos]       = useState([])
  const [forma, setForma]         = useState(null)   // { ranura, nombre } mientras se guarda uno
  const [guardandoMapa, setGuardandoMapa] = useState(false)

  useEffect(() => {
    let vigente = true
    listarGuardados()
      .then(l => { if (vigente) setGuardados(l) })
      .catch(e => { if (vigente) { setGuardados([]); setError(`No se pudieron leer los mapas guardados: ${e.message ?? e}`) } })
    return () => { vigente = false }
  }, [])
  const enRanura = r => guardados?.find(g => g.ranura === r) ?? null

  // Suscrito para que el aviso salga por el socket, igual que en /host. Si la pantalla
  // ya tiene el canal abierto (/host), avisa por ahí y aquí no se abre otro.
  useEffect(() => {
    if (avisar) return
    const c = supabase.channel(`salon-${bloque}`).subscribe()
    canal.current = c
    return () => { canal.current = null; supabase.removeChannel(c) }
  }, [bloque, avisar])

  const esFija = f => Boolean(fija?.(f, original.get(f.id)))

  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // En el celular se deja el dedo un momento: así el dedo sigue sirviendo para el scroll.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  )

  // El salón como quedaría: las mismas filas con el número del borrador. Se pinta
  // con `mapaDeMesas`, igual que el Mapa sin editar.
  const comoQuedaria = delBloque.map(f => ({ ...f, mesa_numero: borrador.get(f.id) }))
  const mapa = mapaDeMesas({ edicion, reclutadores: comoQuedaria, bloque })
  const porNumero = new Map(mapa.map(m => [m.numero, m]))
  const filaEn = new Map(comoQuedaria.map(f => [f.mesa_numero, f]))

  const cambios = delBloque
    .filter(f => borrador.get(f.id) !== original.get(f.id))
    .map(f => ({ fila: f.id, numero: borrador.get(f.id) }))

  const levantada = arrastrando != null ? porNumero.get(arrastrando) : null

  function alSoltar({ active, over }) {
    setArrastrando(null)
    if (!over) return
    const de = active.data.current.numero
    const a  = over.data.current.numero
    if (de === a) return
    const quien = filaEn.get(de)
    if (!quien || esFija(quien)) return
    const otra = filaEn.get(a)
    if (otra && esFija(otra)) return

    const nuevo = new Map(borrador)
    nuevo.set(quien.id, a)
    if (otra) nuevo.set(otra.id, de)   // se intercambian
    setHistorial(h => [...h, borrador])
    setBorrador(nuevo)
  }

  function alfabetico() {
    const nuevo = ordenAlfabetico(delBloque, original, edicion.total_mesas)
    if (!nuevo) {
      setError('No cabe en orden alfabético: hay más mesas que el salón antes de la zona de portafolio.')
      return
    }
    // Una mesa en sesión no cambia de número: si el orden la movería, no se aplica.
    const enSesion = delBloque
      .filter(f => esFija(f) && nuevo.get(f.id) !== borrador.get(f.id))
      .map(f => original.get(f.id)).sort((a, b) => a - b)
    if (enSesion.length) {
      setError(`Hay mesas en sesión que cambiarían de número. Espera a que terminen: ${enSesion.join(', ')}.`)
      return
    }
    setError(null)
    setHistorial(h => [...h, borrador])
    setBorrador(nuevo)
  }

  function cargar(ranura) {
    const g = enRanura(ranura)
    if (!g) return
    const plan = planDesdeGuardado(g, delBloque, bloque, edicion.total_mesas)
    if (plan.error) { setError(plan.error); return }
    // Igual que «Orden alfabético»: una mesa en sesión no cambia de número.
    const enSesion = delBloque
      .filter(f => esFija(f) && plan.nuevo.get(f.id) !== borrador.get(f.id))
      .map(f => original.get(f.id)).sort((a, b) => a - b)
    if (enSesion.length) {
      setError(`Hay mesas en sesión que cambiarían de número. Espera a que terminen: ${enSesion.join(', ')}.`)
      return
    }
    setError(null)
    setAvisos([`Mapa ${ranura} · «${g.nombre}» está en el borrador. Revísalo y dale «Guardar acomodo».`, ...plan.avisos])
    setHistorial(h => [...h, borrador])
    setBorrador(plan.nuevo)
  }

  async function guardarMapa() {
    const { ranura, nombre } = forma
    const ocupada = enRanura(ranura)
    if (ocupada && !window.confirm(`Mapa ${ranura} ya tiene «${ocupada.nombre}». ¿Lo reemplazo?`)) return
    setGuardandoMapa(true); setError(null)
    try {
      await guardarAcomodo({ ranura, nombre, bloque, borrador })
      setGuardados(await listarGuardados())
      setForma(null)
      setAvisos([`Guardado en Mapa ${ranura} · «${nombre.trim()}». Este bloque va como lo ves; el otro, como está en la base.`])
    } catch (e) {
      setError(e.message ?? String(e))
    }
    setGuardandoMapa(false)
  }

  function deshacerUltimo() {
    if (!historial.length) return
    setBorrador(historial.at(-1))
    setHistorial(h => h.slice(0, -1))
  }

  async function guardar() {
    setGuardando(true); setError(null)
    try {
      const n = await acomodarMesas(bloque, cambios)
      if (avisar) avisar()
      else canal.current?.send({ type: 'broadcast', event: 'cambio', payload: {} })
      await onGuardado(n)
    } catch (e) {
      setError(e.message ?? String(e))
      setGuardando(false)
    }
  }

  function salir() {
    if (cambios.length > 0 && !window.confirm('Hay cambios sin guardar. ¿Los descarto?')) return
    onSalir()
  }

  const boton = 'px-3 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-40'
  const suave = `${boton} border border-lavanda/25 text-lavanda hover:text-white`
  const n = cambios.length

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-cian/40 bg-tec/15 px-4 py-3 space-y-2.5">
        <p className="text-sm">
          Arrastra una mesa a otra para intercambiarlas, o a una libre para moverla ahí. En el
          celular, deja el dedo un momento sobre la mesa. Nada se guarda hasta «Guardar acomodo».
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button className={`${boton} bg-tec text-white hover:bg-tec-claro`}
                  onClick={guardar} disabled={guardando || n === 0}>
            {guardando ? 'Guardando…'
              : n === 0 ? 'Guardar acomodo'
                : `Guardar acomodo · ${n === 1 ? '1 mesa' : `${n} mesas`}`}
          </button>
          <button className={suave} onClick={alfabetico} disabled={guardando}>
            Orden alfabético
          </button>
          <button className={suave} onClick={deshacerUltimo} disabled={guardando || !historial.length}>
            Deshacer último
          </button>
          <button className={suave}
                  onClick={() => { setHistorial([]); setBorrador(new Map(original)) }}
                  disabled={guardando || n === 0}>
            Deshacer todo
          </button>
          <button className={suave} onClick={salir} disabled={guardando}>
            Salir sin guardar
          </button>
        </div>
        {error && <p className="text-xs text-rojo">{error}</p>}

        <div className="border-t border-lavanda/15 pt-2.5 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-lavanda/60">Mapas guardados</span>
            {RANURAS.map(r => {
              const g = enRanura(r)
              return (
                <button key={r} className={suave} onClick={() => cargar(r)}
                        disabled={guardando || !g}
                        title={g ? `Guardado el ${cuandoSeGuardo(g.guardado_en)}` : 'Vacío'}>
                  Mapa {r}{g ? ` · ${g.nombre}` : ' · vacío'}
                </button>
              )
            })}
            {!forma && (
              <button className="text-xs font-semibold text-cian hover:text-white transition-colors"
                      disabled={guardando || guardados === null}
                      onClick={() => setForma({ ranura: 1, nombre: enRanura(1)?.nombre ?? '' })}>
                Guardar como…
              </button>
            )}
          </div>

          {forma && (
            <div className="rounded-lg border border-lavanda/20 bg-marino-alto/50 px-3 py-2.5 space-y-2">
              <div className="flex flex-wrap items-center gap-3" role="radiogroup" aria-label="Dónde se guarda">
                {RANURAS.map(r => (
                  <label key={r} className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="radio" name="ranura" checked={forma.ranura === r}
                           onChange={() => setForma({ ranura: r, nombre: enRanura(r)?.nombre ?? forma.nombre })} />
                    Mapa {r}{enRanura(r) ? ` · ${enRanura(r).nombre}` : ' · vacío'}
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input value={forma.nombre} maxLength={40} placeholder="Nombre, por ejemplo «Por columnas»"
                       onChange={e => setForma({ ...forma, nombre: e.target.value })}
                       className="flex-1 min-w-0 basis-48 rounded-lg bg-marino border border-lavanda/25 px-3 py-2
                                  text-[13px] placeholder-lavanda/30 outline-none focus:border-cian" />
                <button className={`${boton} bg-tec text-white hover:bg-tec-claro`}
                        onClick={guardarMapa} disabled={guardandoMapa || !forma.nombre.trim()}>
                  {guardandoMapa ? 'Guardando…' : `Guardar en Mapa ${forma.ranura}`}
                </button>
                <button className={suave} onClick={() => setForma(null)} disabled={guardandoMapa}>
                  Cancelar
                </button>
              </div>
              <p className="text-[11px] text-lavanda/60">
                Se guardan los dos bloques: este, como lo ves; el otro, como está en la base. No mueve mesas.
              </p>
            </div>
          )}

          {avisos.length > 0 && (
            <ul className="text-[11px] text-cian space-y-0.5">
              {avisos.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          )}
        </div>
      </div>

      <DndContext
        sensors={guardando ? [] : sensores}
        // Solo cuenta la mesa que está bajo el dedo. Sin respaldo de «la más cercana»:
        // al soltar sobre una mesa en sesión (que no recibe) se intercambiaba con la vecina.
        collisionDetection={pointerWithin}
        onDragStart={({ active }) => setArrastrando(active.data.current.numero)}
        onDragEnd={alSoltar}
        onDragCancel={() => setArrastrando(null)}
      >
        <PlanoSalon
          excedentes={mapa.filter(m => m.numero > MESAS_EN_PLANO).map(m => m.numero)}
          celda={(numero, { angosta }) => {
            const mesa = porNumero.get(numero) ?? { numero, estado: 'libre', reclutador: null }
            const f = mesa.reclutador
            const antes = f && original.get(f.id) !== numero ? original.get(f.id) : null
            return (
              <Celda mesa={mesa} antes={antes} angosta={angosta} arrastrando={arrastrando}
                     color={f && pintar ? pintar(f, original.get(f.id)) : undefined}
                     fija={Boolean(f && esFija(f))} />
            )
          }}
        />
        <DragOverlay dropAnimation={null}>
          {levantada?.reclutador ? (
            <div className="rounded-lg border border-cian bg-tec/90 px-3 py-2 shadow-2xl shadow-black/60
                            rotate-2 cursor-grabbing min-w-[120px] max-w-[200px]">
              <p className="text-[11px] font-bold cifra text-cian">Mesa {levantada.numero}</p>
              <p className="text-[13px] font-semibold leading-tight">{levantada.reclutador.empresa}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
