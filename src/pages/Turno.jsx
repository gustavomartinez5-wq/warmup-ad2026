import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  SERVICIOS, textoServicio, CANAL_FILA, INDICACION_MODULO, TOLERANCIA_MIN, consejosPara,
  sacarTurno, miTurno, cederTurno, recordarTurno, turnoRecordado, olvidarTurno,
} from '../lib/fila'
import { prepararAlerta, sonarAlerta, mantenerPantallaEncendida } from '../lib/alerta'
import Cargando from '../components/Cargando'

/**
 * La pantalla de quien espera. Se entra por el QR de la entrada, sin contraseña
 * y sin escribir nada: toca lo que busca y recibe un número.
 *
 * Muestra a propósito muy poco: su número, que puede tomar asiento, y que se
 * le avisa aquí. No dice cuántos van delante; ver fila.js.
 */

// Cada cuánto vuelve a preguntar por su cuenta. El aviso real llega por el canal
// de difusión; esto es el respaldo para cuando el canal se cae y nadie se entera.
const RESPALDO_MS = 15000

// Cada cuánto cambia el consejo de la pantalla de espera.
const CONSEJO_MS = 12000

const hora = iso => new Date(iso).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })

/**
 * La señal de que la pantalla sigue viva. En la simulación del 21-sep los tres
 * estudiantes, tras 25 a 45 minutos sin cambios, dudaron si la app se había
 * congelado. El punto late mientras la conexión está arriba.
 */
function Latido({ estado }) {
  if (estado === 'vivo') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-teal">
        <span className="relative flex w-2 h-2">
          <span className="absolute inline-flex w-full h-full rounded-full bg-teal opacity-75 animate-ping" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-teal" />
        </span>
        En vivo
      </span>
    )
  }
  // Si el canal se cae, el respaldo de 15 segundos sigue preguntando: no es para asustarse.
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-lavanda/50">
      <span className="w-2 h-2 rounded-full bg-lavanda/50" />
      {estado === 'caido' ? 'Reconectando…' : 'Conectando…'}
    </span>
  )
}

/** Un consejo de búsqueda de empleo a la vez, como pantalla de carga. */
function Consejos({ servicio, folio }) {
  const lista = consejosPara(servicio)
  // Arranca en un lugar distinto según el folio, para que no todos vean el mismo.
  const [i, setI] = useState(() => (folio ?? 0) % lista.length)
  useEffect(() => {
    const id = setInterval(() => setI(n => (n + 1) % lista.length), CONSEJO_MS)
    return () => clearInterval(id)
  }, [lista.length])

  return (
    <div className="rounded-2xl border border-lavanda/15 bg-marino-alto/40 px-5 py-4 text-center min-h-[96px]">
      <p className="text-[11px] uppercase tracking-widest text-lavanda/40">Mientras esperas</p>
      <p key={i} className="aparece text-sm text-lavanda/85 leading-snug mt-1.5 text-balance">{lista[i]}</p>
    </div>
  )
}

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

/* ── Ceder el turno ───────────────────────────────────────────────────────── */

/**
 * El botón para quien se tiene que ir. Pide confirmar en la misma pantalla y no
 * con el confirm() del navegador, que en celular se ve como un error.
 * `sobreTeal` es para la pantalla de llamado, que tiene otro fondo.
 */
function CederTurno({ id, sobreTeal = false, onCedido }) {
  const [paso, setPaso]   = useState('boton')   // 'boton' · 'pregunta' · 'mandando'
  const [error, setError] = useState(null)

  async function ceder() {
    setPaso('mandando')
    setError(null)
    try {
      await cederTurno(id)
      // Si ya estaba cerrado, igual lo damos por cedido: para la persona el
      // resultado es el mismo, ya no tiene turno.
      onCedido()
    } catch (e) {
      setError(e.message ?? String(e))
      setPaso('pregunta')
    }
  }

  // Botón con borde y no liga: en la simulación casi no se veía al fondo de la
  // pantalla. Sigue sin relleno para no competir con el número.
  const borde = sobreTeal
    ? 'border border-white/60 text-white hover:bg-white/10'
    : 'border border-lavanda/30 text-lavanda/80 hover:border-cian/60 hover:text-white'

  if (paso === 'boton') {
    return (
      <button onClick={() => setPaso('pregunta')}
        className={`w-full rounded-xl text-sm font-semibold py-3 px-4 text-balance transition-colors ${borde}`}>
        ¿Tienes que irte? No te preocupes, cede tu turno
      </button>
    )
  }

  return (
    <div className={`rounded-2xl px-5 py-4 text-center ${
      sobreTeal ? 'bg-white text-marino' : 'border border-lavanda/25 bg-marino-alto/70'}`}>
      <p className="font-extrabold">¿Ceder tu turno?</p>
      <p className={`text-sm mt-1 ${sobreTeal ? 'text-marino/70' : 'text-lavanda/65'}`}>
        Tu número se libera y no se puede recuperar.
      </p>
      <div className="flex gap-2 mt-3">
        <button onClick={() => setPaso('boton')} disabled={paso === 'mandando'}
          className={`flex-1 rounded-xl py-3 text-sm font-bold transition-colors disabled:opacity-50 ${
            sobreTeal ? 'border border-marino/25' : 'border border-lavanda/25 hover:border-cian/60'}`}>
          Me quedo
        </button>
        <button onClick={ceder} disabled={paso === 'mandando'}
          className="flex-1 rounded-xl py-3 text-sm font-bold bg-tec hover:bg-tec-claro text-white transition-colors disabled:opacity-50">
          {paso === 'mandando' ? 'Cediendo…' : 'Sí, ceder mi turno'}
        </button>
      </div>
      {error && <p className="text-xs text-rojo mt-2">{error}</p>}
    </div>
  )
}

/* ── Mi turno ─────────────────────────────────────────────────────────────── */

function MiTurno({ id, onOtroTurno }) {
  const [turno, setTurno]   = useState(null)
  const [error, setError]   = useState(null)
  const [perdido, setPerdido] = useState(false)
  // La base guarda igual a quien cedió y a quien no llegó. El teléfono sí sabe
  // cuál fue, así que la pantalla de «Cediste tu turno» sale de aquí.
  const [cedido, setCedido] = useState(false)
  const [enlace, setEnlace] = useState('conectando')
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
      .subscribe(estado => {
        if (desmontado.current) return
        if (estado === 'SUBSCRIBED') setEnlace('vivo')
        else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(estado)) setEnlace('caido')
      })

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

  function alCeder() {
    olvidarTurno()
    setCedido(true)
  }

  if (cedido || turno?.estado === 'cedio') {
    return (
      <div className="min-h-dvh max-w-md mx-auto flex flex-col">
        <Encabezado />
        <div className="flex-1 flex flex-col justify-center px-5 pb-10 text-center gap-4">
          <p className="text-2xl font-extrabold">Cediste tu turno</p>
          <p className="text-sm text-lavanda/65 leading-relaxed">
            Gracias por avisar. Si regresas más tarde, saca un turno nuevo. Para volver, escanea el QR de la
            entrada.
          </p>
          <button onClick={onOtroTurno}
            className="w-full rounded-xl bg-tec hover:bg-tec-claro py-3.5 font-bold text-sm transition-colors mt-2">
            Sacar otro turno
          </button>
        </div>
      </div>
    )
  }

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
            <p className="text-base font-bold mt-2">Tienes {TOLERANCIA_MIN} minutos para llegar al módulo.</p>
            <p className="text-sm text-marino/70 mt-1">De ahí te llevamos con la empresa.</p>
          </div>

          <p className="text-sm text-white/75 mt-4">{servicio}</p>

          <div className="mt-8">
            <CederTurno id={id} sobreTeal onCedido={alCeder} />
          </div>
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
            Muchas gracias por participar, puedes sacar un turno nuevo en el módulo de lista de espera.
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
            Te llamamos y no alcanzaste a llegar. Si ya estás en el módulo, avísanos ahí.
          </p>
          {/* Cecilia lo regresa a la fila desde /fila y esta pantalla cambia sola.
              Por eso no hay botón grande para sacar otro turno: duplicaría a la
              persona. Queda uno discreto por si ya se fue y volvió más tarde. */}
          <p className="text-xs text-lavanda/45 leading-relaxed">
            Esta pantalla cambia sola cuando te regresemos a la fila.
          </p>
          <button onClick={onOtroTurno}
            className="text-xs text-lavanda/50 hover:text-cian underline underline-offset-2 mt-2">
            Sacar un turno nuevo
          </button>
        </div>
      </div>
    )
  }

  /* ── Esperando ────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-dvh max-w-md mx-auto flex flex-col">
      <Encabezado>
        <p className="text-sm text-lavanda/70 mt-1.5">{servicio}</p>
      </Encabezado>

      <div className="flex-1 flex flex-col justify-center px-5 pb-10 gap-4">
        <div className="rounded-2xl border border-lavanda/20 bg-marino-alto/50 px-5 py-6 text-center">
          <div className="flex justify-center mb-2"><Latido estado={enlace} /></div>
          <p className="text-[11px] uppercase tracking-widest text-lavanda/40">Tu número</p>
          <p className="text-[84px] leading-none font-extrabold cifra text-cian mt-1">
            {turno.folio}
          </p>
          {turno.creado_en && (
            <p className="text-xs text-lavanda/50 mt-2">Sacaste tu turno a las {hora(turno.creado_en)}</p>
          )}
        </div>

        <div className="rounded-2xl border border-cian/50 bg-cian/10 px-5 py-4 text-center">
          <p className="text-lg font-extrabold leading-snug text-balance">
            Puedes tomar asiento, en un momento más te avisaremos tu turno
          </p>
        </div>

        <Consejos servicio={turno.servicio} folio={turno.folio} />

        <p className="text-xs text-lavanda/45 text-center leading-relaxed">
          Revisa esta página para saber cuándo sigue tu turno.
        </p>

        <div className="mt-2">
          <CederTurno id={id} onCedido={alCeder} />
        </div>

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
