import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  SERVICIOS, textoServicio, UMBRAL_ADELANTE, TEXTO_FILA_LARGA, CANAL_FILA, INDICACION_MODULO,
  sacarTurno, miTurno, recordarTurno, turnoRecordado, olvidarTurno,
} from '../lib/fila'
import { prepararAlerta, sonarAlerta, mantenerPantallaEncendida } from '../lib/alerta'
import Cargando from '../components/Cargando'

/**
 * La pantalla de quien espera. Se entra por el QR de la entrada, sin contraseña
 * y sin escribir nada: toca lo que busca y recibe un número.
 *
 * Muestra a propósito muy poco. Con la fila larga no decimos cuántos van
 * delante, porque el número hace que la gente calcule y se vaya. Con pocos
 * delante sí, porque entonces le dice que ya viene su turno.
 */

// Cada cuánto vuelve a preguntar por su cuenta. El aviso real llega por el canal
// de difusión; esto es el respaldo para cuando el canal se cae y nadie se entera.
const RESPALDO_MS = 15000

function Encabezado({ children }) {
  return (
    <div className="px-5 pt-6 pb-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-cian font-semibold">CVDP</p>
      <h1 className="text-xl font-extrabold leading-tight mt-0.5">Warm Up AD2026</h1>
      {children}
    </div>
  )
}

/* ── Sacar turno ──────────────────────────────────────────────────────────── */

function Sacar({ onSacado }) {
  const [mandando, setMandando] = useState(null)
  const [error, setError]       = useState(null)

  async function pedir(servicio) {
    if (mandando) return
    setMandando(servicio)
    setError(null)
    // Tiene que correr dentro del toque: si el audio no se desbloquea aquí,
    // después no suena aunque se le pida.
    prepararAlerta()
    try {
      const { id } = await sacarTurno(servicio)
      recordarTurno(id)
      onSacado(id)
    } catch (e) {
      setError(e.message ?? String(e))
      setMandando(null)
    }
  }

  return (
    <div className="min-h-dvh max-w-md mx-auto flex flex-col">
      <Encabezado>
        <p className="text-sm text-lavanda/70 mt-1.5">
          Toca lo que vienes buscando y te damos tu número.
        </p>
      </Encabezado>

      <div className="flex-1 flex flex-col justify-center px-5 pb-8 gap-3">
        {SERVICIOS.map(s => (
          <button
            key={s.clave} onClick={() => pedir(s.clave)} disabled={mandando !== null}
            className="w-full text-left rounded-2xl border border-lavanda/20 bg-marino-alto/50
                       hover:border-cian/60 active:scale-[0.99] px-5 py-4 transition-all
                       disabled:opacity-50"
          >
            <span className="block text-[17px] font-extrabold">
              {mandando === s.clave ? 'Sacando tu turno…' : s.texto}
            </span>
            <span className="block text-xs text-lavanda/55 mt-1 leading-snug">{s.pie}</span>
          </button>
        ))}

        {error && (
          <p className="text-xs text-rojo bg-rojo/10 border border-rojo/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

      </div>
    </div>
  )
}

/* ── Mi turno ─────────────────────────────────────────────────────────────── */

function MiTurno({ id, onOtroTurno }) {
  const [turno, setTurno]   = useState(null)
  const [error, setError]   = useState(null)
  const [perdido, setPerdido] = useState(false)
  const avisado = useRef(false)
  const desmontado = useRef(false)

  const traer = useCallback(async () => {
    try {
      const fila = await miTurno(id)
      if (desmontado.current) return
      if (!fila) { setPerdido(true); return }
      setTurno(fila)
      setError(null)

      if (fila.estado === 'llamado' && !avisado.current) {
        avisado.current = true
        sonarAlerta()
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('¡Es tu turno! — Warm Up', { body: `Turno ${fila.folio}` })
          } catch { /* el navegador la rechazó: la pantalla ya lo dice */ }
        }
      }
      if (fila.estado !== 'llamado') avisado.current = false
    } catch (e) {
      if (!desmontado.current) setError(e.message ?? String(e))
    }
  }, [id])

  useEffect(() => {
    desmontado.current = false
    traer()

    // El gestor avisa por difusión cada vez que mueve la fila. El aviso no lleva
    // datos: cada teléfono vuelve a preguntar solo por lo suyo.
    const canal = supabase.channel(CANAL_FILA)
      .on('broadcast', { event: 'movio' }, () => { if (!desmontado.current) traer() })
      .subscribe()

    const reloj = setInterval(traer, RESPALDO_MS)

    return () => {
      desmontado.current = true
      supabase.removeChannel(canal)
      clearInterval(reloj)
    }
  }, [traer])

  // Que la pantalla no se apague mientras espera.
  useEffect(() => mantenerPantallaEncendida(), [])

  // Por si instaló la app en su pantalla de inicio: ahí sí llegan las push.
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  if (perdido) {
    return (
      <div className="min-h-dvh max-w-md mx-auto flex flex-col">
        <Encabezado />
        <div className="px-5 flex-1 flex flex-col justify-center gap-4">
          <p className="text-sm text-lavanda/60 text-center">
            Ese turno ya no existe. Pudo haberse cerrado la jornada.
          </p>
          <button onClick={onOtroTurno}
            className="w-full rounded-xl bg-tec hover:bg-tec-claro py-3.5 font-bold text-sm transition-colors">
            Sacar un turno nuevo
          </button>
        </div>
      </div>
    )
  }

  if (!turno) return <Cargando error={error} texto="Buscando tu turno…" />

  const servicio = textoServicio(turno.servicio)

  /* ── Llamado ─────────────────────────────────────────────────────────────
     Siempre al módulo, nunca directo a una mesa: ahí le toman sus datos y el
     host la lleva con la empresa. Aunque el gestor le haya apartado mesa, eso
     es para el equipo, no para la persona.

     Teal, no rojo. En esta app el color es el estado (DEC-019) y el rojo ya
     significa «se pasó de los 20 minutos». Aquí lo que pasa es que se abrió
     un lugar, que es justo lo que dice el teal. */
  if (turno.estado === 'llamado') {
    return (
      <div className="min-h-dvh grid place-items-center px-5 py-8 bg-teal">
        <div className="w-full max-w-sm text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/70 font-semibold">
            Warm Up AD2026
          </p>
          <p className="text-[38px] leading-none font-extrabold mt-3">¡Es tu turno!</p>

          <div className="rounded-2xl bg-white/15 px-5 py-4 mt-6">
            <p className="text-[11px] uppercase tracking-widest text-white/70">Tu número</p>
            <p className="text-[64px] leading-none font-extrabold cifra mt-1">{turno.folio}</p>
          </div>

          <div className="rounded-2xl bg-white text-marino px-5 py-4 mt-3">
            <p className="text-[11px] uppercase tracking-widest text-marino/50">Ahora</p>
            <p className="text-[22px] leading-tight font-extrabold mt-0.5 text-balance">{INDICACION_MODULO}</p>
            <p className="text-sm text-marino/70 mt-1">De ahí el host te lleva con la empresa.</p>
          </div>

          <p className="text-sm text-white/75 mt-4">{servicio}</p>
        </div>
      </div>
    )
  }

  /* ── Atendido ─────────────────────────────────────────────────────────── */
  if (turno.estado === 'atendido') {
    return (
      <div className="min-h-dvh max-w-md mx-auto flex flex-col">
        <Encabezado />
        <div className="flex-1 flex flex-col justify-center px-5 pb-10 text-center gap-4">
          <p className="text-2xl font-extrabold">Listo</p>
          <p className="text-sm text-lavanda/65 leading-relaxed">
            Ya pasaste con la empresa. Si quieres pasar con otra, saca un turno nuevo.
          </p>
          <button onClick={onOtroTurno}
            className="w-full rounded-xl bg-tec hover:bg-tec-claro py-3.5 font-bold text-sm transition-colors mt-2">
            Sacar otro turno
          </button>
        </div>
      </div>
    )
  }

  /* ── No llegó ─────────────────────────────────────────────────────────── */
  if (turno.estado === 'no_llego') {
    return (
      <div className="min-h-dvh max-w-md mx-auto flex flex-col">
        <Encabezado />
        <div className="flex-1 flex flex-col justify-center px-5 pb-10 text-center gap-4">
          <p className="text-2xl font-extrabold">Tu turno ya pasó</p>
          <p className="text-sm text-lavanda/65 leading-relaxed">
            Te llamamos y no alcanzaste a llegar. Puedes formarte otra vez.
          </p>
          <button onClick={onOtroTurno}
            className="w-full rounded-xl bg-tec hover:bg-tec-claro py-3.5 font-bold text-sm transition-colors mt-2">
            Formarme otra vez
          </button>
        </div>
      </div>
    )
  }

  /* ── Esperando ────────────────────────────────────────────────────────── */
  const adelante = turno.adelante ?? 0
  const aviso =
    adelante >= UMBRAL_ADELANTE
      ? { titulo: TEXTO_FILA_LARGA, pie: 'Te avisamos en esta misma pantalla.' }
      : adelante === 0
        ? { titulo: 'Eres el siguiente', pie: 'Te avisamos aquí en cualquier momento.' }
        : { titulo: `${adelante} ${adelante === 1 ? 'persona' : 'personas'} delante de ti`,
            pie: 'Ya casi. Te avisamos aquí.' }

  return (
    <div className="min-h-dvh max-w-md mx-auto flex flex-col">
      <Encabezado>
        <p className="text-sm text-lavanda/70 mt-1.5">{servicio}</p>
      </Encabezado>

      <div className="flex-1 flex flex-col justify-center px-5 pb-10 gap-4">
        <div className="rounded-2xl border border-lavanda/20 bg-marino-alto/50 px-5 py-8 text-center">
          <p className="text-[11px] uppercase tracking-widest text-lavanda/40">Tu número</p>
          <p className="text-[84px] leading-none font-extrabold cifra text-cian mt-1">
            {turno.folio}
          </p>
        </div>

        <div className="rounded-2xl border border-cian/50 bg-cian/10 px-5 py-4 text-center">
          <p className="text-lg font-extrabold leading-snug text-balance">
            Puedes tomar asiento, en un momento más te avisaremos tu turno
          </p>
        </div>

        <div className="rounded-2xl border border-lavanda/20 bg-marino-alto/50 px-5 py-6 text-center">
          <p className="text-xl font-extrabold leading-snug">{aviso.titulo}</p>
          <p className="text-sm text-lavanda/55 mt-1.5">{aviso.pie}</p>
        </div>

        <p className="text-xs text-lavanda/45 text-center leading-relaxed">
          Deja esta pantalla abierta. Aquí te avisamos, con sonido, cuando sea tu turno.
        </p>

        {error && (
          <p className="text-xs text-ambar bg-ambar/10 border border-ambar/40 rounded-lg px-3 py-2">
            Se perdió la conexión un momento. Tu turno sigue guardado.
          </p>
        )}
      </div>
    </div>
  )
}

/* ── La ruta ──────────────────────────────────────────────────────────────── */

export default function Turno() {
  const [id, setId] = useState(() => turnoRecordado())

  function otroTurno() {
    olvidarTurno()
    setId(null)
  }

  return id
    ? <MiTurno id={id} onOtroTurno={otroTurno} />
    : <Sacar onSacado={setId} />
}
