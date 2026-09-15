import { useRef, useState } from 'react'
import { leerLibro } from '../../lib/excel'
import { compararImportacion, aplicarImportacion } from '../../lib/importar'
import { useDatos } from '../../lib/datos'

function Bloque({ titulo, tono = 'lavanda', children }) {
  const borde = {
    lavanda: 'border-lavanda/20',
    teal:    'border-teal/50',
    ambar:   'border-ambar/50',
    rojo:    'border-rojo/50',
  }[tono]
  return (
    <div className={`rounded-2xl border ${borde} bg-marino-alto/40 px-4 py-3.5`}>
      <p className="text-[13px] font-bold mb-2">{titulo}</p>
      {children}
    </div>
  )
}

export default function Importar() {
  const { edicion, empresas, reclutadores, recargar } = useDatos()
  const input = useRef(null)
  const [libro, setLibro]       = useState(null)
  const [comparado, setComparado] = useState(null)
  const [error, setError]       = useState(null)
  const [aplicando, setAplicando] = useState(false)
  const [listo, setListo]       = useState(null)

  async function elegirArchivo(archivo) {
    setError(null); setListo(null); setLibro(null); setComparado(null)
    if (!archivo) return
    try {
      const buffer = await archivo.arrayBuffer()
      const leido = leerLibro(new Uint8Array(buffer))
      setLibro(leido)
      setComparado(compararImportacion({
        empresasActuales: empresas,
        reclutadoresActuales: reclutadores,
        libro: leido,
      }))
    } catch (e) {
      setError(e.message ?? String(e))
    }
  }

  async function aplicar() {
    setAplicando(true); setError(null)
    try {
      const pasos = await aplicarImportacion({ edicionId: edicion.id, libro })
      await recargar()
      setListo(pasos)
      setLibro(null); setComparado(null)
      if (input.current) input.current.value = ''
    } catch (e) {
      setError(e.message ?? String(e))
    }
    setAplicando(false)
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold">Importar Excel</h2>
        <p className="text-sm text-lavanda/60 mt-0.5 max-w-prose">
          Sube <span className="text-lavanda">WarmUp AD26 - Control de Mesas y Cupos.xlsx</span>.
          Lee las hojas Reclutadores, Empresas y Catálogo de Empresas. El libro no se toca.
        </p>
      </div>

      <label className="block rounded-2xl border-2 border-dashed border-lavanda/30 bg-marino-alto/30
                        px-5 py-8 text-center cursor-pointer hover:border-cian/60 transition-colors">
        <input
          ref={input} type="file" accept=".xlsx,.xlsm" className="sr-only"
          onChange={e => elegirArchivo(e.target.files?.[0])}
        />
        <p className="text-sm font-semibold">Elegir el archivo</p>
        <p className="text-xs text-lavanda/50 mt-1">o arrástralo aquí</p>
      </label>

      {error && (
        <div className="rounded-xl border border-rojo/40 bg-rojo/10 px-4 py-3">
          <p className="text-sm text-rojo font-semibold">No se pudo leer</p>
          <p className="text-xs text-lavanda/70 mt-1 break-words">{error}</p>
        </div>
      )}

      {listo && (
        <div className="rounded-xl border border-teal/50 bg-teal/10 px-4 py-3">
          <p className="text-sm font-semibold">Importado</p>
          <p className="text-xs text-lavanda/75 mt-1">{listo.join(' · ')}</p>
        </div>
      )}

      {comparado && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Bloque titulo="Empresas nuevas" tono={comparado.altas.length ? 'teal' : 'lavanda'}>
              <p className="text-2xl font-extrabold cifra">{comparado.altas.length}</p>
            </Bloque>
            <Bloque titulo="Con cambios" tono={comparado.cambios.length ? 'ambar' : 'lavanda'}>
              <p className="text-2xl font-extrabold cifra">{comparado.cambios.length}</p>
            </Bloque>
            <Bloque titulo="Sin cambio">
              <p className="text-2xl font-extrabold cifra">{comparado.sinTocar.length}</p>
            </Bloque>
            <Bloque titulo="Ya no vienen" tono={comparado.bajas.length ? 'rojo' : 'lavanda'}>
              <p className="text-2xl font-extrabold cifra">{comparado.bajas.length}</p>
            </Bloque>
          </div>

          <Bloque titulo="Reclutadores">
            <p className="text-sm text-lavanda/80">
              Pasan de <span className="cifra font-bold">{comparado.reclutadores.antes.total}</span> a{' '}
              <span className="cifra font-bold text-white">{comparado.reclutadores.despues.total}</span>
              {' · '}Bloque 1: <span className="cifra">{comparado.reclutadores.despues.b1}</span>
              {' · '}Bloque 2: <span className="cifra">{comparado.reclutadores.despues.b2}</span>
            </p>
            <p className="text-xs text-lavanda/45 mt-1">
              Se reemplazan completos. En esa tabla no vive nada capturado desde la app.
            </p>
          </Bloque>

          {comparado.altas.length > 0 && (
            <Bloque titulo={`Empresas nuevas (${comparado.altas.length})`} tono="teal">
              <p className="text-xs text-lavanda/75 leading-relaxed">
                {comparado.altas.map(e => e.nombre).join(' · ')}
              </p>
            </Bloque>
          )}

          {comparado.cambios.length > 0 && (
            <Bloque titulo={`Cambios (${comparado.cambios.length})`} tono="ambar">
              <ul className="space-y-1.5">
                {comparado.cambios.map(c => (
                  <li key={c.nombre} className="text-xs text-lavanda/75">
                    <span className="text-white font-semibold">{c.nombre}</span>
                    {' — '}{c.campos.join(', ')}
                  </li>
                ))}
              </ul>
            </Bloque>
          )}

          {comparado.bajas.length > 0 && (
            <Bloque titulo={`Están en la app y ya no en el Excel (${comparado.bajas.length})`} tono="rojo">
              <p className="text-xs text-lavanda/75 leading-relaxed">
                {comparado.bajas.map(e => e.nombre).join(' · ')}
              </p>
              <p className="text-xs text-lavanda/45 mt-1.5">
                No se borran solas. Si de verdad ya no vienen, se quitan desde Empresas.
              </p>
            </Bloque>
          )}

          {comparado.avisos.length > 0 && (
            <Bloque titulo={`Revisa esto (${comparado.avisos.length})`} tono="ambar">
              <ul className="space-y-1">
                {comparado.avisos.map((a, i) => (
                  <li key={i} className="text-xs text-lavanda/75">{a}</li>
                ))}
              </ul>
            </Bloque>
          )}

          <button
            onClick={aplicar} disabled={aplicando}
            className="w-full sm:w-auto rounded-xl bg-tec hover:bg-tec-claro disabled:opacity-50
                       px-6 py-3 font-bold text-sm transition-colors"
          >
            {aplicando ? 'Guardando…' : 'Aplicar la importación'}
          </button>
        </div>
      )}
    </section>
  )
}
