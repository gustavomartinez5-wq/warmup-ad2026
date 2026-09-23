import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext, DragOverlay, pointerWithin, closestCenter,
  MouseSensor, TouchSensor, useSensor, useSensors, useDraggable, useDroppable,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { supabase } from '../lib/supabase'
import { ESTADO_MESA, GIRO_PORTAFOLIO, esPorDefinir } from '../lib/cifras'
import { nombreCorto, letraDelNombre } from '../lib/plano'
import { reordenarSalon } from '../lib/mesaEquipo'
import { fichasDelBloque, numerar, cambia, alfabetico, rango } from '../lib/acomodo'
import RejillaMesas from './RejillaMesas'

/**
 * El modo «Editar acomodo» de la rejilla de `/admin/mesas`. Es la misma rejilla,
 * con las mismas celdas y el mismo orden por columna, pero las mesas se arrastran.
 *
 * Se arrastra una mesa y se mueve su empresa completa: sus mesas van siempre
 * seguidas. Mientras el dedo o el mouse pasa sobre otras mesas, el salón se
 * reacomoda en vivo y los números se recorren. Nada se guarda hasta «Guardar
 * acomodo», que manda el orden completo a `reordenar_salon` (migración 12) en
 * una transacción y avisa por `salon-<bloque>`.
 *
 * Portafolio y las mesas libres no se arrastran. Soltar una empresa sobre una
 * libre la manda al final.
 *
 * Se carga aparte, al entrar al modo edición: la librería de arrastre no tiene
 * por qué viajar en el paquete de las pantallas del evento.
 */

const claseCelda = 'w-full h-full rounded-lg border px-2 py-2 text-left min-h-[58px] flex flex-col justify-between min-w-0'

function Celda({ celda, arrastrando }) {
  const { numero, ficha, fila } = celda
  const movible = ficha && ficha.giro !== GIRO_PORTAFOLIO
  const drag = useDraggable({ id: `m${numero}`, data: { empresa: ficha?.id }, disabled: !movible })
  const drop = useDroppable({ id: `m${numero}`, data: { numero } })
  const ref = el => { drag.setNodeRef(el); drop.setNodeRef(el) }

  if (!ficha) {
    return (
      <div ref={ref} className={`${claseCelda} ${ESTADO_MESA.libre.clase}`}>
        <span className="text-[11px] font-bold cifra opacity-70">{numero}</span>
      </div>
    )
  }

  const estado = fila && esPorDefinir(fila.nombre) ? 'sin_nombre' : 'completa'
  const nombre = nombreCorto(ficha.nombre)
  const levantada = arrastrando === ficha.id
  const movida = movible && cambia(ficha)

  return (
    <div
      ref={ref}
      {...(movible ? drag.listeners : {})}
      {...(movible ? drag.attributes : {})}
      title={`${numero} · ${nombre}`}
      className={`${claseCelda} ${ESTADO_MESA[estado].clase} select-none
        ${movible ? 'cursor-grab touch-manipulation' : ''}
        ${!movible ? 'outline-2 outline-dashed outline-offset-1 outline-lavanda opacity-80' : ''}
        ${movida && !levantada ? 'ring-2 ring-cian/80' : ''}
        ${levantada ? 'opacity-35 border-dashed border-cian' : ''}`}
    >
      <span className="text-[11px] font-bold cifra opacity-70">{numero}</span>
      <span className={`${letraDelNombre(nombre, false)} leading-tight line-clamp-3 break-words`}>
        {nombre}
      </span>
    </div>
  )
}

export default function AcomodoEnRejilla({ filas, empresas, bloque, totalCeldas, onGuardado, onSalir }) {
  const inicial = useMemo(
    () => fichasDelBloque({ filas, empresas, bloque }),
    [filas, empresas, bloque],
  )
  const [orden, setOrden]           = useState(inicial.movibles)
  const [arrastrando, setArrastrando] = useState(null)
  const [confirmar, setConfirmar]   = useState(false)
  const [guardando, setGuardando]   = useState(false)
  const [error, setError]           = useState(null)
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

  const numeradas = numerar(orden)
  const cambian = numeradas.filter(cambia).length
  const ultima = numeradas.at(-1)?.nuevos.at(-1) ?? 0

  // Qué hay en cada número con este orden: las empresas desde la 1, portafolio en
  // su lugar y lo demás libre.
  const celdas = Array.from({ length: totalCeldas }, (_, i) => ({ numero: i + 1, ficha: null, fila: null }))
  const poner = (numero, ficha, fila) => {
    if (numero >= 1 && numero <= totalCeldas) celdas[numero - 1] = { numero, ficha, fila }
  }
  for (const f of numeradas) f.nuevos.forEach((n, i) => poner(n, f, f.filas[i]))
  for (const f of inicial.portafolio) f.numeros.forEach((n, i) => poner(n, { ...f, nuevos: f.numeros }, f.filas[i]))

  const fichaLevantada = arrastrando && numeradas.find(f => f.id === arrastrando)

  function alPasar({ over }) {
    if (!over || !arrastrando) return
    const destino = celdas[over.data.current.numero - 1]
    const de = orden.findIndex(f => f.id === arrastrando)
    if (de < 0) return
    if (!destino?.ficha) {
      // Una mesa libre después de la última: la empresa se va al final.
      if (destino && destino.numero > ultima && de !== orden.length - 1) {
        setOrden(arrayMove(orden, de, orden.length - 1))
      }
      return
    }
    if (destino.ficha.id === arrastrando || destino.ficha.giro === GIRO_PORTAFOLIO) return
    const a = orden.findIndex(f => f.id === destino.ficha.id)
    if (a >= 0) setOrden(arrayMove(orden, de, a))
  }

  async function guardar() {
    setGuardando(true); setError(null)
    try {
      const n = await reordenarSalon(bloque, orden.map(f => f.id))
      canal.current?.send({ type: 'broadcast', event: 'cambio', payload: {} })
      await onGuardado(n)
    } catch (e) {
      setError(e.message ?? String(e))
      setGuardando(false); setConfirmar(false)
    }
  }

  function salir() {
    if (cambian > 0 && !window.confirm('Hay cambios sin guardar. ¿Los descarto?')) return
    onSalir()
  }

  const boton = 'px-3 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-40'
  const suave = `${boton} border border-lavanda/25 text-lavanda hover:text-white`

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-cian/40 bg-tec/15 px-4 py-3 space-y-2.5">
        <p className="text-sm">
          Arrastra una mesa para cambiarla de lugar. Se mueve su empresa completa y los números se
          recorren solos. En el celular, deja el dedo un momento sobre la mesa.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button className={suave} onClick={() => setOrden(alfabetico(orden))} disabled={guardando}>
            Orden alfabético
          </button>
          <button className={suave} onClick={() => setOrden(inicial.movibles)} disabled={guardando || cambian === 0}>
            Deshacer cambios
          </button>
          <button className={`${boton} bg-tec text-white hover:bg-tec-claro`}
                  onClick={() => setConfirmar(true)} disabled={guardando || cambian === 0}>
            Guardar acomodo
          </button>
          <button className={suave} onClick={salir} disabled={guardando}>
            Salir sin guardar
          </button>
          <span className="text-xs text-lavanda/65 cifra">
            {cambian === 0 ? 'Sin cambios'
              : cambian === 1 ? '1 empresa cambia de número' : `${cambian} empresas cambian de número`}
          </span>
        </div>

        {confirmar && (
          <div className="rounded-lg border border-ambar/50 bg-ambar/10 px-3.5 py-3 space-y-2.5">
            <p className="text-sm">
              {cambian === 1 ? 'Una empresa cambia' : `${cambian} empresas cambian`} de número.
              Sus reclutadores verán «Tu mesa cambió» en el celular con la mesa nueva.
            </p>
            <div className="flex gap-2">
              <button className={`${boton} bg-tec text-white hover:bg-tec-claro`} onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Sí, guardar'}
              </button>
              <button className={suave} onClick={() => setConfirmar(false)} disabled={guardando}>
                Cancelar
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-xs text-rojo">{error}</p>}
      </div>

      <DndContext
        sensors={guardando ? [] : sensores}
        collisionDetection={args => {
          const bajoElPuntero = pointerWithin(args)
          return bajoElPuntero.length ? bajoElPuntero : closestCenter(args)
        }}
        onDragStart={({ active }) => setArrastrando(active.data.current?.empresa ?? null)}
        onDragOver={alPasar}
        onDragEnd={() => setArrastrando(null)}
        onDragCancel={() => setArrastrando(null)}
      >
        <RejillaMesas total={celdas.length}>
          {celdas.map(c => <Celda key={c.numero} celda={c} arrastrando={arrastrando} />)}
        </RejillaMesas>
        <DragOverlay dropAnimation={null}>
          {fichaLevantada ? (
            <div className="rounded-lg border border-cian bg-tec/90 px-3 py-2 shadow-2xl shadow-black/60
                            scale-105 rotate-1 cursor-grabbing min-w-[140px]">
              <p className="text-[11px] font-bold cifra text-cian">
                {fichaLevantada.mesas === 1 ? `Mesa ${rango(fichaLevantada.nuevos)}` : `Mesas ${rango(fichaLevantada.nuevos)}`}
              </p>
              <p className="text-[13px] font-semibold leading-tight">{fichaLevantada.nombre}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
