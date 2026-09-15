import { useEffect, useState } from 'react'
import { supabase, edicionCompleta } from '../../lib/supabase'
import Cargando from '../../components/Cargando'

function Cifra({ valor, etiqueta, nota }) {
  return (
    <div className="rounded-2xl border border-lavanda/15 bg-marino-alto/50 px-4 py-3.5">
      <p className="text-3xl font-extrabold cifra leading-none">{valor}</p>
      <p className="text-[13px] text-lavanda/80 mt-1.5 leading-tight">{etiqueta}</p>
      {nota && <p className="text-[11px] text-lavanda/45 mt-0.5 leading-tight">{nota}</p>}
    </div>
  )
}

export default function Tablero() {
  const [edicion, setEdicion] = useState(null)
  const [conteos, setConteos] = useState(null)
  const [error, setError]     = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const ed = await edicionCompleta()
        if (!ed) { setError('No hay una edición activa en la base.'); return }
        setEdicion(ed)
        const [empresas, carreras] = await Promise.all([
          supabase.from('empresas').select('id', { count: 'exact', head: true }).eq('edicion_id', ed.id),
          supabase.from('carreras').select('siglas', { count: 'exact', head: true }),
        ])
        setConteos({ empresas: empresas.count ?? 0, carreras: carreras.count ?? 0 })
      } catch (e) {
        setError(e.message ?? e)
      }
    })()
  }, [])

  if (error)   return <Cargando error={error} />
  if (!edicion) return <Cargando />

  const dias = Math.ceil(
    (new Date(edicion.fecha + 'T00:00:00') - new Date(new Date().toDateString())) / 86400000
  )

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold">Tablero</h2>
        <p className="text-sm text-lavanda/60 mt-0.5">
          {edicion.nombre} · {new Date(edicion.fecha + 'T00:00:00').toLocaleDateString('es-MX',
            { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Cifra valor={dias > 0 ? dias : 0} etiqueta="Días para el evento" />
        <Cifra valor={conteos?.empresas ?? '—'} etiqueta="Empresas registradas" />
        <Cifra valor={edicion.total_mesas} etiqueta="Mesas en el salón"
               nota="Sube al conseguir una excedente" />
        <Cifra valor={conteos?.carreras ?? '—'} etiqueta="Carreras del catálogo" />
      </div>

      <div className="rounded-2xl border border-dashed border-lavanda/25 bg-marino-alto/40 px-5 py-6">
        <p className="text-xs uppercase tracking-widest text-ambar font-semibold">Fase 1</p>
        <p className="text-sm text-lavanda/75 mt-2 leading-relaxed max-w-prose">
          Aquí entran los reclutadores por bloque, las mesas apartadas contra el total, las mesas
          faltantes y la capacidad del evento. Salen del Excel en cuanto corras la importación.
        </p>
      </div>
    </section>
  )
}
