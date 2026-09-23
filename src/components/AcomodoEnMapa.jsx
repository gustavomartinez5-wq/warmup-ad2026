import { useEffect, useRef, useState } from 'react'
import {
  DndContext, DragOverlay, pointerWithin, closestCenter,
  MouseSensor, TouchSensor, useSensor, useSensors, useDraggable, useDroppable,
} from '@dnd-kit/core'
import { supabase } from '../lib/supabase'
import { mapaDeMesas, ESTADO_MESA, GIRO_PORTAFOLIO } from '../lib/cifras'
import { MESAS_EN_PLANO, nombreCorto, letraDelNombre } from '../lib/plano'
import { acomodarMesas } from '../lib/mesaEquipo'
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
 */

/** El borrador: qué número tiene cada fila del bloque. */
const numerosDe = filas => new Map(filas.map(f => [f.id, f.mesa_numero]))

function Celda({ mesa, antes, angosta, arrastrando }) {
  const { numero, reclutador: r, estado } = mesa
  const drag = useDraggable({ id: `m${numero}`, data: { numero }, disabled: !r })
  const drop = useDroppable({ id: `m${numero}`, data: { numero } })
  const ref = el => { drag.setNodeRef(el); drop.setNodeRef(el) }

  const nombre = nombreCorto(r?.empresa ?? '')
  const levantada = arrastrando === numero
  const portafolio = r?.giro === GIRO_PORTAFOLIO
    ? 'outline-2 outline-dashed outline-offset-1 outline-lavanda' : ''
  const movida = antes != null

  return (
    <div
      ref={ref}
      {...(r ? drag.listeners : {})}
      {...(r ? drag.attributes : {})}
      title={nombre ? `${numero} · ${nombre}` : `Mesa ${numero}`}
      className={`w-full h-full rounded-lg border ${angosta ? 'px-0.5' : 'px-2'} py-2 text-left
                  min-h-[58px] flex flex-col justify-between min-w-0 select-none
                  ${ESTADO_MESA[estado].clase} ${portafolio}
                  ${r ? 'cursor-grab touch-manipulation' : ''}
                  ${movida && !levantada ? 'ring-2 ring-cian' : ''}
                  ${drop.isOver && !levantada ? 'ring-2 ring-white scale-[1.04]' : ''}
                  ${levantada ? 'opacity-30 border-dashed' : ''}`}
    >
      <span className="text-[11px] font-bold cifra opacity-70">{numero}</span>
      <span className={`${letraDelNombre(nombre, angosta)} leading-tight line-clamp-3 break-words`}>
        {nombre}
      </span>
      {movida && !angosta && (
        <span className="text-[10px] cifra text-cian leading-none mt-0.5">antes {antes}</span>
      )}
    </div>
  )
}

export default function AcomodoEnMapa({ edicion, filas, bloque, onGuardado, onSalir }) {
  // Las filas del bloque tal como están en la base; el borrador parte de aquí.
  const delBloque = filas.filter(f => f.bloque === bloque)
  const [original] = useState(() => numerosDe(delBloque))
  const [borrador, setBorrador]   = useState(() => numerosDe(delBloque))
  const [historial, setHistorial] = useState([])
  const [arrastrando, setArrastrando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState(null)
  const canal = useRef(null)

  // Suscrito para que el aviso salga por el socket, igual que en /host.
  useEffect(() => {
    const c = supabase.channel(`salon-${bloque}`).subscribe()
    canal.current = c
    return () => { canal.current = null; supabase.removeChannel(c) }
  }, [bloque])

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
    if (!quien) return
    const otra = filaEn.get(a)

    const nuevo = new Map(borrador)
    nuevo.set(quien.id, a)
    if (otra) nuevo.set(otra.id, de)   // se intercambian
    setHistorial(h => [...h, borrador])
    setBorrador(nuevo)
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
      canal.current?.send({ type: 'broadcast', event: 'cambio', payload: {} })
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
      </div>

      <DndContext
        sensors={guardando ? [] : sensores}
        collisionDetection={args => {
          const bajoElPuntero = pointerWithin(args)
          return bajoElPuntero.length ? bajoElPuntero : closestCenter(args)
        }}
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
            return <Celda mesa={mesa} antes={antes} angosta={angosta} arrastrando={arrastrando} />
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
