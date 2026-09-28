import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, edicionActiva } from '../lib/supabase'
import { mantenerPantallaEncendida } from '../lib/alerta'
import { INDICACION_MODULO, TOLERANCIA_MIN } from '../lib/fila'
import Cargando from '../components/Cargando'
import Enlace from '../components/Enlace'

/**
 * La pantalla de turnos, para proyectar junto al módulo de lista de espera.
 *
 * Se abre desde `/fila` en una pestaña nueva y se lleva a la pantalla extendida:
 * en una pantalla se controla, en la otra se ven los números. Muestra solo los
 * turnos llamados: el último, enorme; los demás que siguen llamados, abajo.
 * Solo el número, sin servicio ni mesa, y sin sonido (Gustavo, 27-sep): Cecilia
 * canta los números en voz alta.
 *
 * «Llamar otra vez» reescribe `llamado_en`, así que ese número vuelve al lugar
 * grande. Un número sale cuando Cecilia marca «Pasó» o «No llegó», o lo borra.
 */

/** Cuánto dura el contorno de «recién llamado». */
const DESTACAR_MS = 8000

export function VistaPantalla({ llamados, ahora, enlace, alReconectar }) {
  const [principal, ...demas] = llamados
  const reciente = t => t.llamado_en && ahora - new Date(t.llamado_en).getTime() < DESTACAR_MS

  return (
    <div className="h-dvh overflow-hidden flex flex-col px-[4vw] py-[3vh] select-none">
      <div className="flex items-center justify-between gap-4 shrink-0">
        <p className="uppercase tracking-[0.18em] text-cian font-semibold text-[clamp(11px,1.6vw,26px)]">
          CVDP · Lista de espera · Warm Up AD2026
        </p>
        <Enlace estado={enlace} alReconectar={alReconectar} />
      </div>

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center">
        {principal ? (
          <div key={`${principal.id}-${principal.llamado_en}`}
            className={`aparece rounded-[3vh] border-[0.6vh] px-[6vw] py-[2vh] transition-colors duration-1000 ${
              reciente(principal) ? 'border-cian bg-cian/10' : 'border-transparent'}`}>
            <p className="uppercase tracking-[0.2em] text-lavanda/70 font-semibold text-[clamp(14px,3.2vh,40px)]">
              Turno
            </p>
            <p className="cifra font-extrabold leading-none text-white text-[clamp(96px,min(40vh,30vw),520px)]">
              {principal.folio}
            </p>
          </div>
        ) : (
          <p className="text-lavanda/70 font-semibold text-[clamp(20px,4.5vh,56px)] max-w-[80vw]">
            En un momento llamamos el siguiente número
          </p>
        )}

        {principal && (
          <div className="mt-[3vh]">
            <p className="font-extrabold text-white text-[clamp(20px,5vh,64px)] leading-tight">{INDICACION_MODULO}</p>
            <p className="text-lavanda/70 text-[clamp(14px,3vh,36px)] mt-[1vh]">
              Tienes {TOLERANCIA_MIN} minutos para llegar
            </p>
          </div>
        )}
      </div>

      {demas.length > 0 && (
        <div className="shrink-0 border-t border-lavanda/20 pt-[2vh] flex flex-wrap items-baseline justify-center gap-x-[2.5vw] gap-y-[1vh]">
          <span className="uppercase tracking-[0.14em] text-lavanda/60 font-semibold text-[clamp(12px,2.4vh,30px)]">
            También llamados:
          </span>
          {demas.map(t => (
            <span key={`${t.id}-${t.llamado_en}`}
              className={`aparece cifra font-extrabold text-[clamp(28px,7vh,96px)] leading-none ${
                reciente(t) ? 'text-cian' : 'text-white'}`}>
              {t.folio}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/** Botón de pantalla completa y cursor que se esconde si no se mueve. */
function usePantallaCompleta() {
  const [completa, setCompleta] = useState(false)
  const [quieto, setQuieto] = useState(false)
  useEffect(() => {
    const cambio = () => setCompleta(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', cambio)
    let reloj = null
    const mueve = () => { setQuieto(false); clearTimeout(reloj); reloj = setTimeout(() => setQuieto(true), 3000) }
    window.addEventListener('mousemove', mueve)
    mueve()
    return () => {
      document.removeEventListener('fullscreenchange', cambio)
      window.removeEventListener('mousemove', mueve)
      clearTimeout(reloj)
    }
  }, [])
  const entrar = () => document.documentElement.requestFullscreen?.().catch(() => {})
  return { completa, quieto, entrar }
}

export default function PantallaFila() {
  const [turnos, setTurnos] = useState(null)
  const [error, setError] = useState(null)
  const [enlace, setEnlace] = useState('conectando')
  const [intento, setIntento] = useState(0)
  const [ahora, setAhora] = useState(Date.now())
  const desmontado = useRef(false)
  const { completa, quieto, entrar } = usePantallaCompleta()

  // La misma lectura que /fila: la tabla pide cuenta del equipo.
  const traer = useCallback(async () => {
    try {
      const ed = await edicionActiva()
      if (desmontado.current) return
      if (!ed) { setTurnos([]); return }
      const { data, error: err } = await supabase
        .from('turnos').select('id, folio, estado, llamado_en')
        .eq('edicion_id', ed.id).eq('estado', 'llamado')
      if (err) throw err
      if (desmontado.current) return
      setTurnos(data ?? [])
      setError(null)
    } catch (e) {
      if (!desmontado.current) setError(e.message ?? String(e))
    }
  }, [])

  useEffect(() => {
    desmontado.current = false
    traer()
    const canal = supabase.channel('fila-pantalla')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turnos' },
        () => { if (!desmontado.current) traer() })
      .subscribe(estado => {
        if (estado === 'SUBSCRIBED') setEnlace('vivo')
        else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(estado)) setEnlace('caido')
      })
    return () => { desmontado.current = true; supabase.removeChannel(canal) }
  }, [traer, intento])

  // El reloj solo apaga el contorno de «recién llamado».
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => mantenerPantallaEncendida(), [])

  if (turnos === null) return <Cargando error={error} texto="Cargando la pantalla de turnos…" />

  const llamados = [...turnos].sort((a, b) =>
    new Date(b.llamado_en ?? 0).getTime() - new Date(a.llamado_en ?? 0).getTime() || b.folio - a.folio)

  return (
    <div className={quieto && completa ? 'cursor-none' : ''}>
      <VistaPantalla llamados={llamados} ahora={ahora} enlace={enlace}
        alReconectar={() => { setEnlace('conectando'); setIntento(n => n + 1) }} />
      {!completa && (
        <button onClick={entrar}
          className={`fixed bottom-4 right-4 rounded-xl bg-tec hover:bg-tec-claro px-4 py-2.5 text-sm font-bold
                      transition-opacity ${quieto ? 'opacity-0' : 'opacity-100'}`}>
          Pantalla completa
        </button>
      )}
    </div>
  )
}
