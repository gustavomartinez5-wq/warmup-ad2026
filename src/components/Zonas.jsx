import { ZONAS } from '../lib/zonas'

/** «Estado · Zonas» sobre el Mapa. Abre en Estado: es lo que se lee el día del evento. */
export function SelectorColores({ valor, onCambio, disabled = false }) {
  return (
    <div className="flex rounded-lg border border-lavanda/20 overflow-hidden" role="group" aria-label="Colores del mapa">
      {[['estado', 'Estado'], ['zonas', 'Zonas']].map(([v, t]) => (
        <button
          key={v} onClick={() => onCambio(v)} disabled={disabled} aria-pressed={valor === v}
          className={`px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-35 ${
            valor === v ? 'bg-tec text-white' : 'text-lavanda/55 hover:text-white'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

/** La leyenda de las zonas, con el mismo cuadrito que pinta la mesa. */
export function LeyendaZonas() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {ZONAS.map(z => (
        <span key={z.clave} className="inline-flex items-center gap-1.5 text-xs text-lavanda/70">
          <span className={`w-3 h-3 rounded border shrink-0 ${z.clase}`} />
          {z.nombre}
        </span>
      ))}
    </div>
  )
}
