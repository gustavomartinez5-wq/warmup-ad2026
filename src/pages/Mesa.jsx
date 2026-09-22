import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { mesasDelBloque, cambiarEstado, recordarMesa, mesaRecordada, olvidarMesa }
  from '../lib/mesaPublica'
import { bloquePorReloj, segundosDesde, comoReloj, tonoDelTiempo, deMas } from '../lib/reloj'
import { textoEstado } from '../lib/estadoVivo'
import { mantenerPantallaEncendida } from '../lib/alerta'
import { etiquetaBloque } from '../lib/cifras'
import { mesasFijas, fechaDelMapa } from '../lib/mapaFijo'
import Cargando from '../components/Cargando'
import Enlace from '../components/Enlace'

/**
 * La pantalla del reclutador. Se entra por el QR, sin contraseña.
 * Primero elige su número de mesa; después se queda en su mesa aunque recargue.
 */

// El reclutador no marca «No llegó»: si está tocando el teléfono, llegó.
// Ese estado lo pone el equipo desde /host cuando ve una mesa vacía.
const BOTONES = [
  { clave: 'disponible', texto: 'Disponible', fondo: 'bg-teal  hover:bg-teal-hondo' },
  { clave: 'ocupado',    texto: 'Ocupado',    fondo: 'bg-tec   hover:bg-tec-claro' },
  { clave: 'break',      texto: 'Break',      fondo: 'bg-ambar hover:bg-ambar/80' },
]

function Encabezado({ children }) {
  return (
    <div className="px-5 pt-6 pb-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-cian font-semibold">CVDP</p>
      <h1 className="text-xl font-extrabold leading-tight mt-0.5">Warm Up AD2026</h1>
      {children}
    </div>
  )
}

/* ── Elegir mesa ──────────────────────────────────────────────────────────── */

function Elegir({ bloque, onBloque, onElegir, buscaInicial = '' }) {
  // Arranca con el mapa horneado: la lista se ve completa desde el primer
  // instante, y si la base no contesta al menos se puede encontrar la mesa.
  const [mesas, setMesas] = useState(() => mesasFijas(bloque))
  const [fria, setFria]   = useState(true)
  const [busca, setBusca] = useState(buscaInicial)

  useEffect(() => {
    let vivo = true
    setMesas(mesasFijas(bloque)); setFria(true)
    mesasDelBloque(bloque)
      .then(d => { if (vivo) { setMesas(d); setFria(false) } })
      .catch(() => { /* se queda el mapa fijo, que ya está en pantalla */ })
    return () => { vivo = false }
  }, [bloque])

  const q = busca.trim().toLowerCase()
  const lista = (mesas ?? []).filter(m =>
    !q || String(m.numero).includes(q) || (m.empresa ?? '').toLowerCase().includes(q))

  return (
    <div className="min-h-dvh max-w-md mx-auto flex flex-col">
      <Encabezado>
        <p className="text-sm text-lavanda/70 mt-1.5">
          Busca el número que trae el acrílico de tu mesa y tócalo.
        </p>
      </Encabezado>

      <div className="px-5 pb-3">
        <input
          value={busca} onChange={e => setBusca(e.target.value)}
          inputMode="search" placeholder="Número de mesa o empresa…"
          className="w-full rounded-xl bg-marino-alto/70 border border-lavanda/20 px-3.5 py-3 text-[15px]
                     placeholder-lavanda/30 outline-none focus:border-cian focus:ring-2 focus:ring-cian/30"
        />
        <button
          onClick={() => onBloque(bloque === 'b1' ? 'b2' : 'b1')}
          className="text-xs text-lavanda/50 hover:text-cian mt-2.5 underline underline-offset-2"
        >
          Estás viendo {etiquetaBloque(bloque)}. Ver {etiquetaBloque(bloque === 'b1' ? 'b2' : 'b1')}
        </button>
      </div>

      {fria && (
        <p className="mx-5 mb-3 text-xs leading-snug rounded-lg border border-ambar/50
                      bg-ambar/10 text-ambar px-3 py-2">
          La base no está contestando. Las mesas son las del {fechaDelMapa()}: puedes encontrar
          la tuya, pero los botones no van a guardar hasta que vuelva.
        </p>
      )}

      {mesas && (
        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {lista.length === 0 ? (
            <p className="text-sm text-lavanda/50 py-8 text-center">
              {mesas.length === 0
                ? `Todavía no hay mesas asignadas en ${etiquetaBloque(bloque)}.`
                : 'Ninguna mesa coincide.'}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {lista.map(m => (
                <li key={m.numero}>
                  <button
                    onClick={() => onElegir(m.numero, m.empresa)}
                    className="w-full flex items-center gap-3 text-left rounded-xl border border-lavanda/20
                               bg-marino-alto/50 hover:border-cian/60 active:scale-[0.99]
                               px-4 py-3.5 transition-all"
                  >
                    <span className="cifra text-lg font-extrabold text-lavanda/60 w-10 shrink-0 text-right">
                      {m.numero}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold truncate">{m.empresa}</span>
                      {m.giro && <span className="block text-xs text-lavanda/50 truncate">{m.giro}</span>}
                    </span>
                    {/* El estado distingue dos mesas de la misma empresa, y avisa antes de
                        entrar a una donde alguien ya está trabajando. */}
                    <span className={`text-[11px] font-semibold shrink-0 ${
                      m.estado === 'ocupado' ? 'text-tec-claro'
                      : m.estado === 'break' ? 'text-ambar'
                      : m.estado === 'no_llego' ? 'text-lavanda/40'
                      : m.estado === 'sin_dato' ? 'text-lavanda/45'
                      : 'text-teal'}`}>
                      {textoEstado(m.estado)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Mi mesa ──────────────────────────────────────────────────────────────── */

function MiMesa({ numero, bloque, empresa, onEmpresa, onCambiarMesa, onIrA, onVerEmpresa }) {
  // Sembrada del mapa horneado: aunque la base no conteste, el reclutador
  // confirma que está parado en la mesa correcta. Si el mapa ya dice otra
  // empresa en ese número, no se siembra: sería enseñarle una mesa ajena.
  // Memorizada: sin esto cambia de identidad en cada render, `traer` con ella,
  // y el efecto del canal la seguiría remontando sin parar.
  const sembrada = useMemo(
    () => mesasFijas(bloque).find(m => m.numero === numero && (!empresa || m.empresa === empresa)) ?? null,
    [numero, bloque, empresa])
  const [mesa, setMesa]       = useState(sembrada)
  const [fria, setFria]       = useState(true)
  const [error, setError]     = useState(null)
  const [mandando, setMandando] = useState(null)
  const [ahora, setAhora]     = useState(Date.now())
  const [enlace, setEnlace]   = useState('conectando')
  const [intento, setIntento] = useState(0)   // súbelo para re-montar el canal
  const [cambio, setCambio]   = useState(null)   // el equipo movió la mesa
  const desmontado = useRef(false)

  const traer = useCallback(async () => {
    try {
      const todas = await mesasDelBloque(bloque)
      const mia = todas.find(m => m.numero === numero)
      if (desmontado.current) return
      // El equipo pudo mover la mesa, intercambiarla o liberarla. El QR es uno
      // solo, así que el teléfono no se entera por el acrílico: se entera
      // porque en su número ya no está su empresa.
      if (empresa && (!mia || mia.empresa !== empresa)) {
        setCambio({
          ahora: mia?.empresa ?? null,
          suyas: todas.filter(m => m.empresa === empresa).map(m => m.numero),
        })
        setFria(false); setError(null)
        return
      }
      if (!mia) { setError(`La mesa ${numero} no está asignada en ${etiquetaBloque(bloque)}.`); return }
      // Un teléfono que eligió su mesa antes de que se guardara la empresa la
      // aprende aquí, de la base, para poder notar un cambio después.
      if (!empresa) onEmpresa(mia.empresa)
      setCambio(null); setMesa(mia); setFria(false); setError(null)
    } catch (e) {
      // Si hay mesa sembrada, la banda de arriba ya explica que la base no
      // contesta. Abajo solo se quedan los errores de guardado, que sí son
      // de algo que el reclutador acaba de intentar.
      if (!desmontado.current && !sembrada) setError(e.message ?? String(e))
    }
  }, [numero, bloque, sembrada, empresa, onEmpresa])

  useEffect(() => {
    desmontado.current = false
    traer()
    // Si el equipo cambia el estado desde /host, esta pantalla se entera sola.
    const canal = supabase.channel(`mesa-${bloque}-${numero}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'mesas_estado', filter: `numero=eq.${numero}` },
        carga => {
          if (carga.new?.bloque !== bloque) return
          setMesa(prev => prev && { ...prev, estado: carga.new.estado, ocupado_desde: carga.new.ocupado_desde })
        })
      .subscribe(estado => {
        if (estado === 'SUBSCRIBED') setEnlace('vivo')
        else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT' || estado === 'CLOSED') {
          setEnlace('caido')
        }
      })
    return () => { desmontado.current = true; supabase.removeChannel(canal) }
  }, [traer, numero, bloque, intento])

  /**
   * Cuando el equipo reacomoda el salón, la empresa de esta mesa puede cambiar.
   * Sin esto, el teléfono se quedaba con el nombre de la empresa anterior toda
   * la jornada, porque el canal de arriba solo escucha estados.
   *
   * Es el mismo canal de difusión que usa `/host`. El aviso no lleva datos.
   */
  useEffect(() => {
    const canal = supabase.channel(`salon-${bloque}`)
      .on('broadcast', { event: 'cambio' }, () => { if (!desmontado.current) traer() })
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [traer, bloque])

  // Un solo reloj para toda la pantalla.
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // A media entrevista la pantalla no se apaga: el reclutador no tiene que
  // desbloquear el teléfono frente al estudiante para ver el tiempo. Fuera de
  // una sesión se deja apagar, para que la batería aguante el bloque.
  const ocupada = mesa?.estado === 'ocupado'
  useEffect(() => {
    if (!ocupada) return
    return mantenerPantallaEncendida()
  }, [ocupada])

  async function marcar(estado) {
    setMandando(estado)
    try {
      const fila = await cambiarEstado(numero, bloque, estado)
      setMesa(prev => prev && { ...prev, estado: fila.estado, ocupado_desde: fila.ocupado_desde })
      setError(null)
    } catch (e) {
      setError(e.message ?? String(e))
    }
    setMandando(null)
  }

  if (cambio) {
    const [unica] = cambio.suyas
    const enBloque = etiquetaBloque(bloque).toLowerCase()
    return (
      <div className="min-h-dvh max-w-md mx-auto flex flex-col">
        <Encabezado />
        <div className="px-5 space-y-4">
          <div className="rounded-2xl border border-cian/50 bg-cian/10 px-4 py-4">
            <p className="text-lg font-extrabold">Tu mesa cambió</p>
            <p className="text-sm text-lavanda/80 mt-1.5 leading-relaxed">
              {cambio.ahora
                ? <>La mesa <span className="cifra">{numero}</span> ahora es de {cambio.ahora}.</>
                : <>La mesa <span className="cifra">{numero}</span> ya no está asignada en {enBloque}.</>}
              {' '}
              {cambio.suyas.length === 1
                ? <>{empresa} está en la mesa <span className="cifra">{unica}</span>.</>
                : cambio.suyas.length > 1
                  ? <>{empresa} tiene <span className="cifra">{cambio.suyas.length}</span> mesas en
                      este bloque.</>
                  : <>{empresa} no aparece en {enBloque}. Pregunta a un host.</>}
            </p>
          </div>
          {cambio.suyas.length === 1 && (
            <button onClick={() => onIrA(unica)}
              className="w-full rounded-2xl bg-teal hover:bg-teal-hondo py-4 font-extrabold text-base
                         transition-colors">
              Ir a la mesa <span className="cifra">{unica}</span>
            </button>
          )}
          {cambio.suyas.length > 1 && (
            <button onClick={() => onVerEmpresa(empresa)}
              className="w-full rounded-2xl bg-teal hover:bg-teal-hondo py-4 font-extrabold text-base
                         transition-colors">
              Ver las mesas de {empresa}
            </button>
          )}
          <button onClick={onCambiarMesa}
            className="w-full rounded-xl border border-lavanda/25 text-lavanda/75 hover:text-white
                       py-3 font-bold text-sm transition-colors">
            Elegir otra mesa
          </button>
        </div>
      </div>
    )
  }

  if (error && !mesa) {
    return (
      <div className="min-h-dvh max-w-md mx-auto flex flex-col">
        <Encabezado />
        <div className="px-5">
          <Cargando error={error} />
          <button onClick={onCambiarMesa}
            className="w-full rounded-xl bg-tec hover:bg-tec-claro py-3 font-bold text-sm transition-colors">
            Elegir otra mesa
          </button>
        </div>
      </div>
    )
  }
  if (!mesa) return <Cargando />

  // El cronómetro se calcula desde ocupado_desde, no desde un contador en memoria:
  // si el teléfono se recarga o se bloquea, el tiempo sigue siendo el correcto.
  const corriendo = mesa.estado === 'ocupado' && mesa.ocupado_desde
  const segundos  = corriendo ? segundosDesde(mesa.ocupado_desde, ahora) : 0
  const tono      = tonoDelTiempo(segundos)
  const exceso    = deMas(segundos)

  return (
    <div className="min-h-dvh max-w-md mx-auto flex flex-col">
      <div className="px-5 pt-6 pb-4 border-b border-lavanda/15">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-cian font-semibold">
            CVDP · {etiquetaBloque(bloque)}
          </p>
          <Enlace estado={fria ? 'frio' : enlace}
            alReconectar={() => { setEnlace('conectando'); setIntento(n => n + 1) }} />
        </div>
        <div className="flex items-start gap-3 mt-1.5">
          <span className="w-11 h-11 rounded-xl bg-marino-alto border border-lavanda/20
                           grid place-items-center text-base font-extrabold cifra shrink-0">
            {numero}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-extrabold leading-tight">{mesa.empresa}</h1>
            {mesa.giro && <p className="text-xs text-lavanda/55 mt-0.5">{mesa.giro}</p>}
          </div>
          {/* Junto al número, que es donde se nota que se eligió mal. */}
          <button onClick={onCambiarMesa}
            className="shrink-0 mt-0.5 rounded-lg border border-cian/50 text-cian hover:bg-cian/10
                       px-2.5 py-1 text-xs font-semibold transition-colors">
            Cambiar
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-5 py-6 gap-7">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-widest text-lavanda/40">
            {corriendo ? 'Sesión en curso' : 'Sin sesión'}
          </p>
          {/* Sin parpadeo: frente al estudiante se leía como regaño. El rojo y
              «de más» ya dicen que se pasó. */}
          <p className={`text-[64px] leading-none font-extrabold cifra mt-1.5 transition-colors
                         ${corriendo ? tono.clase : 'text-lavanda/20'}`}>
            {comoReloj(segundos)}
          </p>
          {exceso && corriendo && (
            <p className="text-sm font-bold text-rojo mt-1.5">{exceso}</p>
          )}
        </div>

        <div className="space-y-2.5">
          {BOTONES.map(b => {
            const puesto = mesa.estado === b.clave
            return (
              <button
                key={b.clave} onClick={() => marcar(b.clave)} disabled={mandando !== null}
                className={`w-full py-4 rounded-2xl font-extrabold text-base transition-all
                            disabled:opacity-50 ${
                  puesto
                    ? `${b.fondo} text-white ring-4 ring-cian shadow-lg`
                    : 'bg-marino-alto text-lavanda/60 hover:text-white border border-lavanda/20'
                }`}
              >
                {mandando === b.clave ? 'Guardando…' : b.texto}
              </button>
            )
          })}
        </div>

        {fria && (
          <p className="text-xs leading-snug rounded-lg border border-ambar/50 bg-ambar/10
                        text-ambar px-3 py-2">
            La base no está contestando. Tu mesa y tu empresa son las correctas, pero lo que
            marques no se va a guardar hasta que vuelva. Avisa a un host.
          </p>
        )}

        <div className="rounded-xl border border-lavanda/15 bg-marino-alto/40 px-4 py-3">
          <ul className="text-xs text-lavanda/70 space-y-1 leading-relaxed">
            <li>Empieza en Disponible, para que te manden al primer estudiante.</li>
            <li>Toca Ocupado cuando se siente. El tiempo arranca solo.</li>
            <li>Cada sesión dura 20 minutos. El reloj se pone ámbar a los 18.</li>
            <li>Al terminar, Disponible otra vez. Break si te levantas un momento.</li>
          </ul>
        </div>

        {error && (
          <p className="text-xs text-rojo bg-rojo/10 border border-rojo/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

/* ── La ruta ──────────────────────────────────────────────────────────────── */

export default function Mesa() {
  const [guardada] = useState(mesaRecordada)
  const [bloque, setBloque]   = useState(guardada?.bloque ?? bloquePorReloj())
  const [numero, setNumero]   = useState(guardada?.numero ?? null)
  const [empresa, setEmpresa] = useState(guardada?.empresa ?? null)
  const [buscaInicial, setBuscaInicial] = useState('')

  function elegir(n, emp) {
    setNumero(n); setEmpresa(emp ?? null)
    recordarMesa(n, bloque, emp ?? null)
  }

  // Estable: `traer` la tiene de dependencia y remontaría el canal en cada render.
  const aprenderEmpresa = useCallback(emp => {
    setEmpresa(emp)
    if (numero !== null) recordarMesa(numero, bloque, emp)
  }, [numero, bloque])

  function cambiarMesa() {
    setNumero(null); setEmpresa(null); setBuscaInicial('')
    olvidarMesa()
    setBloque(bloquePorReloj())
  }

  // La mesa nueva de su empresa. El bloque no cambia: el equipo la movió dentro de él.
  function irA(n) {
    setNumero(n)
    recordarMesa(n, bloque, empresa)
  }

  function verEmpresa(emp) {
    setNumero(null); setEmpresa(null); setBuscaInicial(emp)
    olvidarMesa()
  }

  return numero === null
    ? <Elegir bloque={bloque} onBloque={setBloque} onElegir={elegir} buscaInicial={buscaInicial} />
    : <MiMesa key={`${bloque}-${numero}`} numero={numero} bloque={bloque} empresa={empresa}
        onEmpresa={aprenderEmpresa} onCambiarMesa={cambiarMesa} onIrA={irA} onVerEmpresa={verEmpresa} />
}
