import { useMemo, useState } from 'react'

/**
 * El acordeón para elegir carreras: una sección por escuela, las siglas como
 * pastillas. Vivía dentro de la ficha de empresa; se sacó aquí porque el día del
 * evento se edita la misma cosa desde `/host`, y dos copias del mismo acordeón
 * se habrían separado a la primera corrección.
 *
 * `elegidas` es un Set de siglas. `onCambio` recibe el Set nuevo.
 */
export default function CarrerasPicker({ carreras, elegidas, onCambio }) {
  const [abierta, setAbierta] = useState(new Set())

  const porEscuela = useMemo(() => {
    const m = new Map()
    for (const c of carreras) {
      if (!m.has(c.escuela)) m.set(c.escuela, [])
      m.get(c.escuela).push(c)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'))
  }, [carreras])

  function alternar(siglas) {
    const s = new Set(elegidas)
    if (s.has(siglas)) s.delete(siglas)
    else s.add(siglas)
    onCambio(s)
  }

  return (
    <div className="space-y-1.5">
      {porEscuela.map(([escuela, lista]) => {
        const puestas = lista.filter(c => elegidas.has(c.siglas)).length
        const abiertaEsta = abierta.has(escuela)
        return (
          <div key={escuela} className="rounded-lg border border-lavanda/15 overflow-hidden">
            <button
              onClick={() => setAbierta(p => {
                const s = new Set(p)
                if (s.has(escuela)) s.delete(escuela)
                else s.add(escuela)
                return s
              })}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-lavanda/5"
            >
              <span className="text-xs font-semibold">{escuela}</span>
              <span className="text-xs text-lavanda/45 cifra">
                {puestas > 0 ? `${puestas} · ` : ''}{abiertaEsta ? '−' : '+'}
              </span>
            </button>
            {abiertaEsta && (
              <div className="flex flex-wrap gap-1.5 px-3 pb-3 pt-1">
                {lista.map(c => {
                  const puesta = elegidas.has(c.siglas)
                  return (
                    <button
                      key={c.siglas} onClick={() => alternar(c.siglas)} title={c.nombre}
                      className={`text-[11px] px-2 py-1 rounded-full border font-semibold transition-colors ${
                        puesta
                          ? 'bg-tec border-tec text-white'
                          : 'border-lavanda/25 text-lavanda/60 hover:border-lavanda/50'
                      }`}
                    >
                      {c.siglas}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
