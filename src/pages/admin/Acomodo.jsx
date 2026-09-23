import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useDatos } from '../../lib/datos'
import { BLOQUES } from '../../lib/cifras'
import { datosDelSalon, reordenarSalon } from '../../lib/mesaEquipo'
import { fichasDelBloque, numerar, cambia, alfabetico } from '../../lib/acomodo'
import Cargando from '../../components/Cargando'
import CuadriculaAcomodo from '../../components/CuadriculaAcomodo'

/**
 * Acomodar el salón arrastrando empresas. Desde el 22-sep las mesas viven aquí y
 * no en el Excel.
 *
 * Nada se guarda al soltar: el orden nuevo se ve con sus números y se manda
 * completo con «Guardar acomodo», en una sola transacción (`reordenar_salon`,
 * migración 12). Al guardar se avisa por `salon-<bloque>`: `/host`, `/mesa` y
 * `/fila` vuelven a preguntar, y el reclutador cuya empresa cambió de número ve
 * «Tu mesa cambió» con la nueva.
 */
export default function Acomodo() {
  const { recargar } = useDatos()
  const [bloque, setBloque]   = useState('b1')
  const [salon, setSalon]     = useState(null)
  const [error, setError]     = useState(null)
  const [orden, setOrden]     = useState(null)
  const [confirmar, setConfirmar] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso]     = useState(null)
  const canal = useRef(null)

  async function traer() {
    try { setSalon(await datosDelSalon()); setError(null) }
    catch (e) { setError(e.message ?? String(e)) }
  }
  useEffect(() => { traer() }, [])

  // Canal suscrito para que el aviso salga por el socket, igual que en /host.
  useEffect(() => {
    const c = supabase.channel(`salon-${bloque}`).subscribe()
    canal.current = c
    return () => { canal.current = null; supabase.removeChannel(c) }
  }, [bloque])

  if (error || !salon) return <Cargando error={error} />

  const { movibles, portafolio } = fichasDelBloque({ ...salon, bloque })
  const actual = orden ?? movibles
  const cambian = numerar(actual).filter(cambia).length

  function cambiarBloque(b) {
    if (b === bloque) return
    if (orden && cambian > 0 && !window.confirm('Hay cambios sin guardar en este bloque. ¿Los descarto?')) return
    setBloque(b); setOrden(null); setConfirmar(false); setAviso(null)
  }

  async function guardar() {
    setGuardando(true); setAviso(null)
    try {
      const n = await reordenarSalon(bloque, actual.map(f => f.id))
      canal.current?.send({ type: 'broadcast', event: 'cambio', payload: {} })
      await Promise.all([traer(), recargar()])
      setOrden(null)
      setAviso({ tipo: 'listo', texto: `Guardado: ${n === 1 ? 'una empresa cambió' : `${n} empresas cambiaron`} de número.` })
    } catch (e) {
      setAviso({ tipo: 'error', texto: e.message ?? String(e) })
    }
    setGuardando(false); setConfirmar(false)
  }

  const boton = 'px-3 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-40'

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold">Acomodo de mesas</h2>
        <p className="text-sm text-lavanda/60 mt-0.5">
          Arrastra una empresa para cambiarla de lugar. Sus mesas van juntas y los números se
          recorren solos. En el celular, deja el dedo un momento sobre la empresa para moverla.
        </p>
      </div>

      <div className="flex gap-1 border-b border-lavanda/15">
        {BLOQUES.map(b => (
          <button
            key={b.clave} onClick={() => cambiarBloque(b.clave)}
            className={`px-3.5 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${
              bloque === b.clave ? 'border-cian text-white' : 'border-transparent text-lavanda/55 hover:text-lavanda'
            }`}
          >
            {b.nombre}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button className={`${boton} border border-lavanda/25 text-lavanda hover:text-white`}
                onClick={() => setOrden(alfabetico(actual))} disabled={guardando}>
          Orden alfabético
        </button>
        <button className={`${boton} border border-lavanda/25 text-lavanda hover:text-white`}
                onClick={() => setOrden(null)} disabled={guardando || !orden}>
          Deshacer cambios
        </button>
        <button className={`${boton} bg-tec text-white hover:bg-tec-claro`}
                onClick={() => setConfirmar(true)} disabled={guardando || cambian === 0}>
          Guardar acomodo
        </button>
        <span className="text-xs text-lavanda/60 cifra">
          {cambian === 0 ? 'Sin cambios' : cambian === 1 ? '1 empresa cambia de número' : `${cambian} empresas cambian de número`}
        </span>
      </div>

      {confirmar && (
        <div className="rounded-xl border border-ambar/50 bg-ambar/10 px-4 py-3 space-y-2.5">
          <p className="text-sm">
            {cambian === 1 ? 'Una empresa cambia' : `${cambian} empresas cambian`} de número.
            Sus reclutadores verán «Tu mesa cambió» en el celular, y la hoja impresa
            sale con los números nuevos.
          </p>
          <div className="flex gap-2">
            <button className={`${boton} bg-tec text-white hover:bg-tec-claro`} onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Sí, guardar'}
            </button>
            <button className={`${boton} border border-lavanda/25 text-lavanda`} onClick={() => setConfirmar(false)} disabled={guardando}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {aviso && (
        <div className={`rounded-xl px-4 py-3 text-sm border ${
          aviso.tipo === 'error' ? 'border-rojo/40 bg-rojo/10' : 'border-teal/50 bg-teal/15'
        }`}>
          <p>{aviso.texto}</p>
          {aviso.tipo === 'listo' && (
            <p className="text-xs text-lavanda/70 mt-1">
              El mapa de respaldo quedó atrás: hay que hornearlo antes del evento
              (<code className="text-[11px]">node scripts/hornear-mapa.mjs</code>).
            </p>
          )}
        </div>
      )}

      <CuadriculaAcomodo
        fichas={actual} portafolio={portafolio}
        onCambio={setOrden} bloqueada={guardando}
      />
    </section>
  )
}
