import { useState } from 'react'
import {
  DndContext, DragOverlay, closestCenter,
  KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, arrayMove, rectSortingStrategy,
  sortableKeyboardCoordinates, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { numerar, rango, cambia } from '../lib/acomodo'

/**
 * La cuadrícula de fichas que se arrastran, como los íconos de la pantalla de
 * inicio de un celular. No guarda nada: avisa el orden nuevo con `onCambio` y la
 * pantalla decide cuándo mandarlo a la base.
 *
 * En el celular hay que dejar el dedo un momento sobre la ficha para levantarla;
 * así el dedo sigue sirviendo para hacer scroll. Con teclado: Espacio levanta,
 * flechas mueven, Espacio suelta.
 */

function Ficha({ ficha, levantada = false, fantasma = false }) {
  const movida = cambia(ficha)
  return (
    <div
      className={`h-full rounded-xl border px-3 py-2.5 flex flex-col gap-1 min-w-0 select-none
                  ${movida ? 'border-cian/70 bg-tec/35' : 'border-lavanda/20 bg-marino-alto'}
                  ${levantada ? 'shadow-2xl shadow-black/60 scale-105 rotate-1 cursor-grabbing' : 'cursor-grab'}
                  ${fantasma ? 'opacity-30' : ''}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-lg font-extrabold cifra leading-none">{rango(ficha.nuevos)}</span>
        <span className="text-[11px] text-lavanda/55 cifra shrink-0">
          {ficha.mesas === 1 ? '1 mesa' : `${ficha.mesas} mesas`}
        </span>
      </div>
      <span className="text-[13px] font-semibold leading-tight line-clamp-2 break-words">
        {ficha.nombre}
      </span>
      {movida && (
        <span className="text-[11px] text-cian/85 cifra mt-auto">antes {rango(ficha.numeros)}</span>
      )}
    </div>
  )
}

function FichaMovible({ ficha }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ficha.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-cian rounded-xl"
      aria-label={`${ficha.nombre}, mesas ${rango(ficha.nuevos)}`}
      {...attributes}
      {...listeners}
    >
      <Ficha ficha={ficha} fantasma={isDragging} />
    </div>
  )
}

export default function CuadriculaAcomodo({ fichas, portafolio = [], onCambio, bloqueada = false }) {
  const [activa, setActiva] = useState(null)
  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const numeradas = numerar(fichas)
  const ultima = numeradas.at(-1)?.nuevos.at(-1) ?? 0
  const levantada = activa && numeradas.find(f => f.id === activa)

  function alSoltar({ active, over }) {
    setActiva(null)
    if (!over || active.id === over.id) return
    const de = fichas.findIndex(f => f.id === active.id)
    const a  = fichas.findIndex(f => f.id === over.id)
    onCambio(arrayMove(fichas, de, a))
  }

  const rejilla = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2'

  return (
    <div className="space-y-4">
      <DndContext
        sensors={bloqueada ? [] : sensores}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => setActiva(active.id)}
        onDragCancel={() => setActiva(null)}
        onDragEnd={alSoltar}
      >
        <SortableContext items={fichas.map(f => f.id)} strategy={rectSortingStrategy}>
          <div className={rejilla}>
            {numeradas.map(f => <FichaMovible key={f.id} ficha={f} />)}
          </div>
        </SortableContext>
        <DragOverlay>
          {levantada ? <Ficha ficha={levantada} levantada /> : null}
        </DragOverlay>
      </DndContext>

      {portafolio.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-lavanda/55">
            Portafolio se queda en su zona. Las mesas {ultima + 1 < portafolio[0].desde
              ? `${ultima + 1} a ${portafolio[0].desde - 1} quedan libres.`
              : 'de acomodo llegan hasta la zona de portafolio.'}
          </p>
          <div className={rejilla}>
            {portafolio.map(f => (
              <div key={f.id} className="rounded-xl border border-dashed border-lavanda/35 px-3 py-2.5 min-w-0">
                <span className="text-lg font-extrabold cifra leading-none">{rango(f.numeros)}</span>
                <p className="text-[13px] font-semibold leading-tight line-clamp-2 break-words mt-1 text-lavanda/80">
                  {f.nombre}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
