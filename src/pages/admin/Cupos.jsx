import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useDatos } from '../../lib/datos'
import { calcularCupos, BLOQUES } from '../../lib/cifras'
import Cargando from '../../components/Cargando'

/**
 * Los cupos de estudiantes, con las mismas cuentas que la hoja Cupos del Excel.
 *
 * El registro de estudiantes vive fuera de la app: aquí solo se teclea cuántos
 * van. La capacidad se calcula sola de los reclutadores confirmados.
 */

const SEMAFORO = {
  abierto:    { texto: 'Abierto',    clase: 'border-teal/60 text-teal' },
  por_cerrar: { texto: 'Por cerrar', clase: 'border-ambar/60 text-ambar' },
  lleno:      { texto: 'Lleno',      clase: 'border-rojo/70 text-rojo' },
}

function Numero({ etiqueta, valor, tono }) {
  return (
    <div>
      <p className="text-[11px] text-lavanda/50 leading-tight">{etiqueta}</p>
      <p className={`text-lg font-extrabold cifra leading-tight ${tono ?? ''}`}>{valor}</p>
    </div>
  )
}

function Franja({ fila, onGuardar, guardando }) {
  const [cv, setCv] = useState(String(fila.registro_cv ?? 0))
  const [ent, setEnt] = useState(String(fila.registro_entrevista ?? 0))

  // Si otra persona del equipo cambió el número, se refleja aquí.
  useEffect(() => { setCv(String(fila.registro_cv ?? 0)) }, [fila.registro_cv])
  useEffect(() => { setEnt(String(fila.registro_entrevista ?? 0)) }, [fila.registro_entrevista])

  const sem = SEMAFORO[fila.semaforo]
  const sucio = Number(cv) !== fila.registro_cv || Number(ent) !== fila.registro_entrevista

  const campo = 'w-full rounded-lg bg-marino border border-lavanda/25 px-2.5 py-2 text-sm cifra ' +
                'outline-none focus:border-cian focus:ring-2 focus:ring-cian/30'

  return (
    <div className="rounded-2xl border border-lavanda/15 bg-marino-alto/45 px-4 py-3.5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold text-sm cifra">{fila.franja}</p>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${sem.clase}`}>
          {sem.texto}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Numero etiqueta="Reclutadores" valor={fila.reclutadores} />
        <Numero etiqueta="Capacidad"    valor={fila.capacidad} />
        <Numero etiqueta="Cupo CV"      valor={fila.cupoCv} />
        <Numero etiqueta="Cupo entrev." valor={fila.cupoEntrevista} />
      </div>

      <div className="flex items-end gap-2">
        <label className="flex-1 min-w-0">
          <span className="block text-[11px] text-lavanda/50 mb-1">Registro CV</span>
          <input className={campo} type="number" min="0" inputMode="numeric"
                 value={cv} onChange={e => setCv(e.target.value)} />
        </label>
        <label className="flex-1 min-w-0">
          <span className="block text-[11px] text-lavanda/50 mb-1">Registro entrevista</span>
          <input className={campo} type="number" min="0" inputMode="numeric"
                 value={ent} onChange={e => setEnt(e.target.value)} />
        </label>
        <button
          onClick={() => onGuardar(fila, Number(cv) || 0, Number(ent) || 0)}
          disabled={!sucio || guardando}
          className="shrink-0 rounded-lg bg-tec hover:bg-tec-claro disabled:opacity-35
                     px-3 py-2 text-sm font-bold transition-colors"
        >
          {guardando ? '…' : 'Guardar'}
        </button>
      </div>

      <div className="flex items-baseline justify-between border-t border-lavanda/10 pt-2.5">
        <p className="text-xs text-lavanda/55">Cupo disponible</p>
        <p className={`text-xl font-extrabold cifra ${
          fila.disponible === 0 ? 'text-rojo' : 'text-white'}`}>
          {fila.disponible}
        </p>
      </div>
    </div>
  )
}

function Supuestos({ edicion, onGuardar, guardando }) {
  const [porHora, setPorHora] = useState(String(edicion.atenciones_por_hora))
  const [propCv, setPropCv]   = useState(String(Math.round(Number(edicion.prop_cv) * 100)))

  const sucio = Number(porHora) !== edicion.atenciones_por_hora
             || Number(propCv) !== Math.round(Number(edicion.prop_cv) * 100)

  const campo = 'w-full rounded-lg bg-marino border border-lavanda/25 px-2.5 py-2 text-sm cifra ' +
                'outline-none focus:border-cian focus:ring-2 focus:ring-cian/30'

  return (
    <div className="rounded-2xl border border-lavanda/15 bg-marino-alto/45 px-4 py-3.5">
      <p className="text-[13px] font-bold">Supuestos</p>
      <p className="text-[11px] text-lavanda/45 mt-0.5 mb-3 leading-relaxed">
        Cambia estos dos y toda la tabla se recalcula. Son los mismos del Excel.
      </p>
      <div className="flex items-end gap-2">
        <label className="flex-1 min-w-0">
          <span className="block text-[11px] text-lavanda/50 mb-1">Atenciones por hora</span>
          <input className={campo} type="number" min="1" inputMode="numeric"
                 value={porHora} onChange={e => setPorHora(e.target.value)} />
        </label>
        <label className="flex-1 min-w-0">
          <span className="block text-[11px] text-lavanda/50 mb-1">% para CV</span>
          <input className={campo} type="number" min="0" max="100" inputMode="numeric"
                 value={propCv} onChange={e => setPropCv(e.target.value)} />
        </label>
        <button
          onClick={() => onGuardar(Number(porHora) || 1, (Number(propCv) || 0) / 100)}
          disabled={!sucio || guardando}
          className="shrink-0 rounded-lg bg-tec hover:bg-tec-claro disabled:opacity-35
                     px-3 py-2 text-sm font-bold transition-colors"
        >
          {guardando ? '…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

export default function Cupos() {
  const datos = useDatos()
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  if (datos.cargando || datos.error) return <Cargando error={datos.error} />

  const { edicion, reclutadores, cupos, recargar } = datos
  const filas = calcularCupos({ edicion, reclutadores, registros: cupos })

  const total = filas.reduce((a, f) => ({
    capacidad:  a.capacidad + f.capacidad,
    registro:   a.registro + (f.registro_cv ?? 0) + (f.registro_entrevista ?? 0),
    disponible: a.disponible + f.disponible,
  }), { capacidad: 0, registro: 0, disponible: 0 })

  async function guardarFranja(fila, cv, ent) {
    setGuardando(true); setError(null)
    const { error } = await supabase.from('cupos')
      .update({ registro_cv: cv, registro_entrevista: ent })
      .eq('edicion_id', edicion.id).eq('bloque', fila.bloque).eq('franja', fila.franja)
    if (error) setError(error.message)
    else await recargar()
    setGuardando(false)
  }

  async function guardarSupuestos(porHora, propCv) {
    setGuardando(true); setError(null)
    const { error } = await supabase.from('ediciones')
      .update({ atenciones_por_hora: porHora, prop_cv: propCv, prop_entrevista: 1 - propCv })
      .eq('id', edicion.id)
    if (error) setError(error.message)
    else await recargar()
    setGuardando(false)
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold">Cupos</h2>
        <p className="text-sm text-lavanda/60 mt-0.5 max-w-prose">
          La capacidad se calcula de los reclutadores confirmados. El registro de estudiantes
          se lleva por fuera: aquí solo se teclea cuántos van.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-lavanda/15 bg-marino-alto/50 px-4 py-3">
          <p className="text-2xl font-extrabold cifra leading-none">{total.capacidad}</p>
          <p className="text-[12px] text-lavanda/70 mt-1">Capacidad</p>
        </div>
        <div className="rounded-2xl border border-lavanda/15 bg-marino-alto/50 px-4 py-3">
          <p className="text-2xl font-extrabold cifra leading-none">{total.registro}</p>
          <p className="text-[12px] text-lavanda/70 mt-1">Registrados</p>
        </div>
        <div className="rounded-2xl border border-lavanda/15 bg-marino-alto/50 px-4 py-3">
          <p className="text-2xl font-extrabold cifra leading-none">{total.disponible}</p>
          <p className="text-[12px] text-lavanda/70 mt-1">Disponible</p>
        </div>
      </div>

      <Supuestos edicion={edicion} onGuardar={guardarSupuestos} guardando={guardando} />

      {error && (
        <p className="text-xs text-rojo bg-rojo/10 border border-rojo/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {BLOQUES.map(b => (
        <div key={b.clave} className="space-y-2">
          <p className="text-[13px] font-bold text-lavanda/80 pt-1">
            {b.nombre} <span className="text-lavanda/45 font-normal">· {b.horario}</span>
          </p>
          {filas.filter(f => f.bloque === b.clave).map(f => (
            <Franja key={f.franja} fila={f} onGuardar={guardarFranja} guardando={guardando} />
          ))}
        </div>
      ))}
    </section>
  )
}
