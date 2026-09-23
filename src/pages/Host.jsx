import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase, edicionCompleta } from '../lib/supabase'
import { mesasDelBloque, cambiarEstado } from '../lib/mesaPublica'
import { bloquePorReloj, comoReloj } from '../lib/reloj'
import { BLOQUES, etiquetaBloque, GIRO_PORTAFOLIO } from '../lib/cifras'
import { ESTADOS, textoEstado, pintar, ordenarParaLista, contarPorEstado } from '../lib/estadoVivo'
import { MESAS_EN_PLANO, nombreCorto, letraDelNombre } from '../lib/plano'
import { catalogoDeCarreras } from '../lib/carreras'
import { mesasFijas, carrerasFijas, fechaDelMapa } from '../lib/mapaFijo'
import { plano, contiene } from '../lib/texto'
import RejillaMesas from '../components/RejillaMesas'
import PlanoSalon from '../components/PlanoSalon'
import Cargando from '../components/Cargando'
import Enlace from '../components/Enlace'
import EditarMesa from '../components/EditarMesa'
import { datosDelSalon } from '../lib/mesaEquipo'

// La librería de arrastre solo viaja cuando alguien entra a «Editar acomodo».
const AcomodoEnMapa = lazy(() => import('../components/AcomodoEnMapa'))

/**
 * La vista del equipo el día del evento. Para los tres hosts y los becarios,
 * en celular. Tres formas de ver lo mismo:
 *
 *   Empresas y Expertos — la rejilla por número, para ubicar la mesa 43 de un vistazo.
 *   Mapa    — las mesas donde están en el piso.
 *   Lista   — ordenada por estado, disponibles arriba, para cuando traes a un
 *             estudiante al lado y necesitas a dónde mandarlo ya.
 *
 * Aquí las mesas pasadas de 20 minutos NO parpadean: en la simulación, con medio
 * salón pasado de tiempo, la pantalla entera latía y dejaba de resaltar nada. El
 * rojo fijo y la pastilla de «pasadas de 20» dicen lo mismo sin estrobo. El
 * parpadeo se queda donde hay un solo reloj: la pantalla del reclutador y la
 * hoja de detalle de una mesa.
 */

function Pastilla({ valor, texto, tono }) {
  const color = {
    teal:  'border-teal/60 text-teal',
    tec:   'border-tec-claro/70 text-lavanda',
    ambar: 'border-ambar/60 text-ambar',
    rojo:  'border-rojo/70 text-rojo',
    gris:  'border-lavanda/20 text-lavanda/50',
  }[tono]
  return (
    <span className={`shrink-0 rounded-full border ${color} px-2.5 py-1 text-xs font-semibold`}>
      <span className="cifra">{valor}</span> {texto}
    </span>
  )
}

/* ── La mesa dentro del plano ─────────────────────────────────────────────── */

function MesaEnPlano({ mesa, apagada, angosta, ahora, tocable, onAbrir, onHueco }) {
  const apagado = apagada ? 'opacity-25' : ''

  if (mesa.libre) {
    return (
      <button
        disabled={!tocable} onClick={() => onHueco(mesa.numero)}
        aria-label={`Mesa ${mesa.numero}, libre`}
        className={`w-full h-full min-h-[58px] rounded-md border border-dashed border-lavanda/25 px-1 py-1
                    text-lavanda/35 text-[11px] font-bold cifra flex items-start justify-start
                    transition-transform active:scale-95 disabled:active:scale-100 ${apagado}`}
      >
        {mesa.numero}
      </button>
    )
  }

  const p = pintar(mesa, ahora)
  const nombre = nombreCorto(mesa.empresa)
  const portafolio = mesa.giro === GIRO_PORTAFOLIO
    ? 'outline-2 outline-dashed outline-offset-1 outline-lavanda' : ''
  return (
    <button
      onClick={() => onAbrir(mesa.numero)}
      aria-label={`Mesa ${mesa.numero}, ${mesa.empresa}, ${textoEstado(mesa.estado)}`}
      title={`${mesa.numero} · ${mesa.empresa}`}
      className={`w-full h-full min-h-[58px] rounded-md border ${angosta ? 'px-0.5' : 'px-1'} py-1
                  text-left flex flex-col justify-between min-w-0 transition-transform active:scale-95
                  ${p.celda} ${portafolio} ${apagado}`}
    >
      <span className="flex items-baseline justify-between gap-0.5 min-w-0">
        <span className="text-[11px] font-extrabold cifra">{mesa.numero}</span>
        {mesa.estado === 'ocupado' && (
          <span className="text-[10px] font-bold cifra">{comoReloj(p.segundos)}</span>
        )}
      </span>
      <span className={`${letraDelNombre(nombre, angosta)} leading-tight line-clamp-3 break-words font-medium`}>
        {nombre}
      </span>
    </button>
  )
}

/* ── Hoja de detalle ──────────────────────────────────────────────────────── */

function Detalle({ mesa, bloque, ahora, onCerrar, onMarcar, marcando, onEditar }) {
  const p = pintar(mesa, ahora)
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-0 sm:px-4"
      onClick={e => e.target === e.currentTarget && onCerrar()}
    >
      <div className="bg-marino-alto rounded-t-2xl sm:rounded-2xl border border-lavanda/20
                      w-full sm:max-w-sm max-h-[88dvh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-lavanda/15 shrink-0">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-lg bg-marino border border-lavanda/20 grid place-items-center
                             text-sm font-extrabold cifra shrink-0">
              {mesa.numero}
            </span>
            <div className="min-w-0">
              <p className="font-bold truncate">{mesa.empresa}</p>
              <p className="text-xs text-lavanda/55">
                {etiquetaBloque(bloque)}{mesa.giro ? ` · ${mesa.giro}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onCerrar} className="text-lavanda/50 hover:text-white text-lg leading-none shrink-0">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div className="text-center py-2">
            <p className="text-[11px] uppercase tracking-widest text-lavanda/45">
              {textoEstado(mesa.estado)}
            </p>
            {/* No llegó no es definitivo: si la empresa aparece tarde, se deshace aquí
                o desde su propio teléfono. Sin esto el host no sabía cómo regresarla. */}
            {mesa.estado === 'no_llego' && (
              <p className="text-xs text-lavanda/60 mt-1.5">Si llega, toca Disponible.</p>
            )}
            {mesa.estado === 'ocupado' && (
              <>
                <p className={`text-5xl font-extrabold cifra mt-1 ${p.alerta ? 'text-rojo' : 'text-white'}
                               ${p.parpadea ? 'late' : ''}`}>
                  {comoReloj(p.segundos)}
                </p>
                <p className="text-xs text-lavanda/45 mt-1">
                  Desde las {new Date(mesa.ocupado_desde).toLocaleTimeString('es-MX',
                    { hour: '2-digit', minute: '2-digit' })}
                </p>
              </>
            )}
          </div>

          {mesa.carreras?.length > 0 && (
            <div>
              <p className="text-xs text-lavanda/55 mb-1.5">Carreras que busca</p>
              <div className="flex flex-wrap gap-1.5">
                {mesa.carreras.map(c => (
                  <span key={c} className="text-[11px] px-2 py-1 rounded-full bg-tec/30 border border-tec
                                           text-lavanda font-semibold">{c}</span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-lavanda/55 mb-2">Cambiar el estado</p>
            <div className="grid grid-cols-2 gap-2">
              {ESTADOS.map(e => (
                <button
                  key={e.clave} onClick={() => onMarcar(mesa.numero, e.clave)}
                  disabled={marcando !== null}
                  className={`py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
                    mesa.estado === e.clave
                      ? 'bg-tec text-white ring-2 ring-cian/50'
                      : 'bg-marino border border-lavanda/20 text-lavanda/70 hover:text-white'
                  }`}
                >
                  {marcando === e.clave ? '…' : e.texto}
                </button>
              ))}
            </div>
          </div>

          {/* Solo con la base viva: sin ella no se puede escribir, y ofrecerlo
              sería mentir. */}
          {onEditar && (
            <button
              onClick={onEditar}
              className="w-full rounded-xl border border-lavanda/25 text-lavanda/75 hover:text-white
                         hover:border-lavanda/50 py-3 text-sm font-bold transition-colors"
            >
              Editar esta mesa
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── La pantalla ──────────────────────────────────────────────────────────── */

export default function Host() {
  // La lista de espera siempre está a un toque. Si se llegó desde ahí, la liga
  // se lee como regreso; si se entró directo, como ir a verla.
  const [params] = useSearchParams()
  const desdeFila = params.get('desde') === 'fila'
  const [bloque, setBloque]   = useState(bloquePorReloj)
  const [vista, setVista]     = useState('rejilla')
  const [mesas, setMesas]     = useState(() => mesasFijas(bloquePorReloj()))
  const [fuente, setFuente]   = useState('fija')   // fija · viva · vieja
  const [error, setError]     = useState(null)
  const [ahora, setAhora]     = useState(Date.now())
  const [busca, setBusca]     = useState('')
  const [carrera, setCarrera] = useState('')
  const [giro, setGiro]       = useState('')
  const [abierta, setAbierta] = useState(null)
  const [marcando, setMarcando] = useState(null)
  const [catalogo, setCatalogo] = useState([])
  const [editando, setEditando] = useState(null)   // número de mesa que se está editando
  const [huecoTocado, setHuecoTocado] = useState(null)   // la mesa libre que se tocó en la rejilla
  const [totalMesas, setTotalMesas] = useState(null)
  const [salon, setSalon]       = useState(null)   // empresas y filas; solo para el equipo
  const [trayendoSalon, setTrayendoSalon] = useState(false)
  const [enlace, setEnlace] = useState('conectando')
  const [intento, setIntento] = useState(0)   // súbelo para re-montar el canal
  const [aviso, setAviso]   = useState(null)  // «otro host movió una mesa»
  const [acomodando, setAcomodando] = useState(false)   // «Editar acomodo» sobre el Mapa
  const [guardadoAcomodo, setGuardadoAcomodo] = useState(null)
  const desmontado = useRef(false)
  const canalSalon = useRef(null)
  const salonPedido = useRef(false)

  /**
   * Nunca deja la pantalla en blanco. Si la base contesta, sus estados pisan al
   * mapa horneado; si no contesta, el salón se sigue viendo —números, empresas y
   * buscador— y la banda de arriba dice de cuándo son esos datos.
   */
  const traer = useCallback(async () => {
    setError(null)
    try {
      const d = await mesasDelBloque(bloque)
      if (!desmontado.current) { setMesas(d); setFuente('viva') }
    } catch {
      // Si ya había datos vivos se quedan, aunque estén viejos: son más ciertos
      // que el mapa fijo. Si nunca los hubo, lo que hay es el mapa fijo.
      if (!desmontado.current) setFuente(f => (f === 'viva' || f === 'vieja') ? 'vieja' : 'fija')
    }
  }, [bloque])

  /**
   * Las empresas y las filas de reclutadores no se piden al abrir `/host`: son
   * dos consultas que solo hacen falta si alguien va a editar. Se traen la
   * primera vez y se quedan.
   */
  const traerSalon = useCallback(async () => {
    salonPedido.current = true
    setTrayendoSalon(true)
    try { setSalon(await datosDelSalon()) }
    catch (e) { setError(e.message ?? String(e)); setSalon(null) }
    setTrayendoSalon(false)
  }, [])

  // Al cambiar de bloque, el salón del bloque nuevo aparece completo de inmediato.
  // No va en el efecto del canal a propósito: reconectar no debe tirar lo vivo.
  useEffect(() => { setMesas(mesasFijas(bloque)); setFuente('fija') }, [bloque])

  useEffect(() => {
    desmontado.current = false
    traer()
    // Cuando un reclutador toca su botón, esta pantalla cambia sola.
    const canal = supabase.channel(`host-${bloque}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas_estado' }, carga => {
        const fila = carga.new
        if (!fila || fila.bloque !== bloque) return
        setMesas(prev => prev?.map(m => m.numero === fila.numero
          ? { ...m, estado: fila.estado, ocupado_desde: fila.ocupado_desde }
          : m))
      })
      // Sin esto, una caída del websocket deja la pantalla vieja y muda.
      .subscribe(estado => {
        if (estado === 'SUBSCRIBED') setEnlace('vivo')
        else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT' || estado === 'CLOSED') {
          setEnlace('caido')
        }
      })
    return () => { desmontado.current = true; supabase.removeChannel(canal) }
  }, [traer, bloque, intento])

  /**
   * El salón cambia de forma durante el evento: llega una empresa sin avisar, se
   * libera una mesa, se recorre un tramo. Con tres hosts en el piso, el que no
   * hizo el cambio seguía viendo el salón viejo hasta que tocara Recargar, y
   * mandaba estudiantes a una mesa que ya no era de esa empresa.
   *
   * Es un canal de difusión y no `postgres_changes` sobre `reclutadores` a
   * propósito: esa tabla trae nombres de personas de fuera del Tec y agregarla a
   * la publicación de tiempo real los mandaría por el cable. El aviso no lleva
   * datos: solo dice que el salón cambió y cada pantalla vuelve a preguntar.
   */
  useEffect(() => {
    const canal = supabase.channel(`salon-${bloque}`)
      // El texto no viene del mensaje: la clave pública está a la vista y
      // cualquiera podría mandar un aviso con lo que quisiera escrito. El
      // mensaje solo sirve de campana; lo que se lee está aquí.
      .on('broadcast', { event: 'cambio' }, () => {
        if (desmontado.current) return
        setAviso('El salón cambió: alguien del equipo movió una mesa.')
        traer()
        // Si esta pantalla ya trajo las empresas y las filas, se refrescan: si
        // alguien tiene el editor abierto, tiene que ver los números de ahora.
        if (salonPedido.current) traerSalon()
      })
      .subscribe()
    canalSalon.current = canal
    return () => { canalSalon.current = null; supabase.removeChannel(canal) }
  }, [traer, traerSalon, bloque])

  // El aviso se va solo: es una noticia, no un error que haya que atender.
  useEffect(() => {
    if (!aviso) return
    const id = setTimeout(() => setAviso(null), 12000)
    return () => clearTimeout(id)
  }, [aviso])

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // El catálogo sirve para que el buscador entienda «mecatrónica» y no solo «IMT».
  useEffect(() => { catalogoDeCarreras().then(setCatalogo).catch(() => setCatalogo(carrerasFijas())) }, [])

  // Cuántas mesas tiene el salón, para pintar también las libres. Si no
  // contesta, la rejilla llega hasta la mesa asignada más alta.
  useEffect(() => {
    edicionCompleta().then(e => setTotalMesas(e?.total_mesas ?? null)).catch(() => {})
  }, [])

  const carreras = useMemo(
    () => [...new Set((mesas ?? []).flatMap(m => m.carreras ?? []))].sort(),
    [mesas])
  const giros = useMemo(
    () => [...new Set((mesas ?? []).map(m => m.giro).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    [mesas])

  const q = plano(busca)

  /**
   * Se busca por palabras, y una mesa sale si coincide con todas: «IMT
   * manufactura» trae las de mecatrónica que además son de manufactura.
   *
   * Por cada palabra, las siglas que coinciden. La sigla se busca por principio
   * —«IRS» encuentra IRS, «IM» encuentra IM, IMA, IMD e IMT— y el nombre por
   * cualquier parte, para que «robotica» también llegue a IRS.
   */
  const palabras = useMemo(() => {
    if (!q) return []
    return q.split(/\s+/).map(p => ({
      p,
      siglas: catalogo
        .filter(c => plano(c.siglas).startsWith(p) || contiene(c.nombre, p))
        .map(c => c.siglas),
    }))
  }, [q, catalogo])

  const filtradas = (mesas ?? []).filter(m => {
    const porTexto = palabras.every(({ p, siglas }) =>
      contiene(m.empresa, p)
      || contiene(m.giro, p)
      || String(m.numero).includes(p)
      || (m.carreras ?? []).some(c => siglas.includes(c)))
    return porTexto
      && (!carrera || (m.carreras ?? []).includes(carrera))
      && (!giro || m.giro === giro)
  })

  // Qué carreras se reconocieron, para que quede claro por qué salió esa lista.
  const carrerasReconocidas = useMemo(() => {
    const enUso = new Set((mesas ?? []).flatMap(m => m.carreras ?? []))
    const todas = new Set(palabras.flatMap(w => w.siglas))
    return catalogo
      .filter(c => todas.has(c.siglas) && enUso.has(c.siglas))
      .slice(0, 3)
  }, [palabras, catalogo, mesas])

  const cuenta = contarPorEstado(mesas ?? [])
  const hayFiltro = Boolean(q || carrera || giro)

  /**
   * Sin filtro, la rejilla es el salón completo: cada número en su lugar, y la
   * mesa libre como hueco punteado. Antes solo salían las asignadas, así que al
   * liberar una todas las de después se recorrían un lugar y el hueco no se
   * veía. Con filtro se quedan solo las que coinciden: ahí los huecos estorban.
   */
  const salonCompleto = useMemo(() => {
    const lista = mesas ?? []
    const porNumero = new Map(lista.map(m => [m.numero, m]))
    const alto = Math.max(totalMesas ?? 0, ...lista.map(m => m.numero), 0)
    return Array.from({ length: alto }, (_, i) => porNumero.get(i + 1) ?? { numero: i + 1, libre: true })
  }, [mesas, totalMesas])
  const celdas = hayFiltro ? (mesas ?? []) : salonCompleto

  // El plano no quita mesas al filtrar: apaga las que no coinciden.
  const coinciden = hayFiltro ? new Set(filtradas.map(m => m.numero)) : null

  // Cambiar `intento` vuelve a correr el efecto: cierra el canal muerto y abre uno nuevo.
  function reconectar() {
    setEnlace('conectando')
    setIntento(n => n + 1)
  }

  function abrirEdicion(numero, hueco = null) {
    setEditando(numero)
    setHuecoTocado(hueco)
    if (!salon) traerSalon()
  }

  async function marcar(numero, estado) {
    setMarcando(estado)
    try {
      const fila = await cambiarEstado(numero, bloque, estado)
      setMesas(prev => prev?.map(m => m.numero === numero
        ? { ...m, estado: fila.estado, ocupado_desde: fila.ocupado_desde } : m))
    } catch (e) {
      setError(e.message ?? String(e))
    }
    setMarcando(null)
  }

  /**
   * Para «Editar acomodo»: las filas del bloque con su empresa y giro. No se pide
   * el nombre del reclutador; el color sale del estado en vivo, no del nombre.
   */
  const filasParaAcomodo = useMemo(() => {
    if (!salon) return []
    const porId = new Map(salon.empresas.map(e => [e.id, e]))
    return salon.filas
      .filter(f => f.bloque === bloque)
      .map(f => ({
        ...f,
        empresa: porId.get(f.empresa_id)?.nombre ?? '—',
        giro: porId.get(f.empresa_id)?.giro ?? null,
        nombre: '—',
        estatus: 'confirmado',
      }))
  }, [salon, bloque])
  const vivoPorNumero = new Map((mesas ?? []).map(m => [m.numero, m]))

  const mesaAbierta = filtradas.find(m => m.numero === abierta)
    ?? (mesas ?? []).find(m => m.numero === abierta)
  const enAlta = editando === 'nueva'
  const mesaEnEdicion = enAlta ? null : (mesas ?? []).find(m => m.numero === editando)

  const campoFiltro = 'min-w-0 rounded-lg bg-marino-alto border border-lavanda/20 px-2.5 py-2 ' +
                      'text-[13px] outline-none focus:border-cian text-lavanda'

  return (
    <div className="min-h-dvh flex flex-col">
      {mesaAbierta && (
        <Detalle
          mesa={mesaAbierta} bloque={bloque} ahora={ahora} marcando={marcando}
          onCerrar={() => setAbierta(null)} onMarcar={marcar}
          onEditar={fuente === 'viva' ? () => abrirEdicion(mesaAbierta.numero) : null}
        />
      )}

      {(enAlta || mesaEnEdicion) && (
        <EditarMesa
          mesa={mesaEnEdicion ?? null} bloque={bloque} salon={salon} carreras={catalogo}
          cargando={trayendoSalon} numeroInicial={enAlta ? huecoTocado : null}
          onCerrar={() => { setEditando(null); setHuecoTocado(null) }}
          onGuardado={async () => {
            await Promise.all([traer(), traerSalon()])
            setAbierta(null)
            // Los otros hosts se enteran sin recargar.
            canalSalon.current?.send({ type: 'broadcast', event: 'cambio', payload: {} })
          }}
        />
      )}

      {/* Con el celular acostado quedan 390 px de alto: un encabezado fijo se
          come la pantalla y el salón no se alcanza a ver. Ahí se va con el scroll. */}
      <header className="px-4 pt-5 pb-3 border-b border-lavanda/15 sticky [@media(max-height:560px)]:static top-0 z-20
                         bg-marino/85 backdrop-blur space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link to="/fila"
              className="inline-block text-xs font-semibold text-cian hover:text-white mb-1.5">
              {desdeFila ? '← Regresar a la lista de espera' : 'Lista de espera →'}
            </Link>
            <p className="text-[10px] uppercase tracking-[0.18em] text-cian font-semibold">CVDP · Host</p>
            <h1 className="text-lg font-extrabold leading-tight">Warm Up AD2026</h1>
          </div>
          <div className="flex items-center gap-3 pt-1 shrink-0">
            {/* Red por si el tiempo real se retrasa: el plan gratuito de Supabase
                topa en 100 mensajes por segundo y una ráfaga puede pasarse. Las
                escrituras nunca se pierden —van por REST—, así que recargar
                siempre trae la verdad. */}
            <Enlace estado={fuente === 'fija' ? 'frio' : enlace}
                    alReconectar={fuente === 'fija' ? undefined : reconectar} />
            <button
              onClick={traer}
              className="text-xs text-lavanda/55 hover:text-white transition-colors"
            >
              Recargar
            </button>
            <Link to="/admin" className="text-xs text-lavanda/55 hover:text-white">Admin</Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-lavanda/20 overflow-hidden">
            {BLOQUES.map(b => (
              <button
                key={b.clave} onClick={() => setBloque(b.clave)} disabled={acomodando && bloque !== b.clave}
                className={`px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-35 ${
                  bloque === b.clave ? 'bg-tec text-white' : 'text-lavanda/55 hover:text-white'
                }`}
              >
                {b.nombre}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-lavanda/20 overflow-hidden">
            {[['rejilla', 'Empresas y Expertos'], ['plano', 'Mapa'], ['lista', 'Lista']].map(([v, t]) => (
              <button
                key={v} onClick={() => setVista(v)} disabled={acomodando && vista !== v}
                className={`px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-35 ${
                  vista === v ? 'bg-tec text-white' : 'text-lavanda/55 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {fuente === 'viva' && !acomodando && (
            <div className="ml-auto flex items-center gap-3">
              {vista === 'plano' && (
                <button
                  onClick={() => { setGuardadoAcomodo(null); setAcomodando(true); if (!salon) traerSalon() }}
                  className="text-xs font-semibold text-cian hover:text-white transition-colors"
                >
                  Editar acomodo
                </button>
              )}
              <button
                onClick={() => abrirEdicion('nueva')}
                className="text-xs font-semibold text-cian hover:text-white transition-colors"
              >
                + Agregar mesa
              </button>
            </div>
          )}
        </div>

        {fuente !== 'fija' && (
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] -mx-4 px-4">
          <Pastilla valor={cuenta.disponible} texto="disponibles" tono="teal" />
          <Pastilla valor={cuenta.ocupado}    texto="ocupadas"    tono="tec" />
          {cuenta.pasadas > 0 && <Pastilla valor={cuenta.pasadas} texto="pasadas de 20" tono="rojo" />}
          <Pastilla valor={cuenta.break}      texto="en break"    tono="ambar" />
          <Pastilla valor={cuenta.no_llego}   texto="no llegaron" tono="gris" />
        </div>
        )}

        {fuente !== 'viva' && (
          <p className="text-[11px] leading-snug rounded-lg border border-ambar/50 bg-ambar/10
                        text-ambar px-2.5 py-2">
            {fuente === 'fija'
              ? `La base no está contestando. Ves el salón del ${fechaDelMapa()}: las mesas, las
                 empresas y el buscador sirven, pero nadie sabe cuáles están ocupadas.`
              : 'La base dejó de contestar. Estos estados son los últimos que llegaron.'}
            {' '}
            <button onClick={traer} className="underline underline-offset-2 font-semibold">
              Reintentar
            </button>
          </p>
        )}

        {aviso && (
          <p className="text-[11px] leading-snug rounded-lg border border-cian/50 bg-cian/10
                        text-cian px-2.5 py-2">
            {aviso}{' '}
            <button onClick={() => setAviso(null)} className="underline underline-offset-2 font-semibold">
              Entendido
            </button>
          </p>
        )}

        {guardadoAcomodo && (
          <p className="text-[11px] leading-snug rounded-lg border border-teal/50 bg-teal/15 px-2.5 py-2">
            {guardadoAcomodo}{' '}
            <button onClick={() => setGuardadoAcomodo(null)} className="underline underline-offset-2 font-semibold">
              Entendido
            </button>
          </p>
        )}

        {/* En celular no caben los tres en un renglón: el buscador manda y los
            filtros van debajo, a la mitad cada uno. Al acomodar se esconden: un
            filtro apaga mesas y estorba al arrastrar. */}
        {!acomodando && (<>
        <div className="space-y-2">
          <input
            value={busca} onChange={e => setBusca(e.target.value)}
            inputMode="search" placeholder="Empresa, carrera, giro o mesa…"
            className="w-full rounded-lg bg-marino-alto border border-lavanda/20 px-3 py-2 text-[13px]
                       placeholder-lavanda/30 outline-none focus:border-cian"
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={carrera} onChange={e => setCarrera(e.target.value)} className={campoFiltro}>
              <option value="">Toda carrera</option>
              {carreras.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={giro} onChange={e => setGiro(e.target.value)} className={campoFiltro}>
              <option value="">Todo giro</option>
              {giros.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        {carrerasReconocidas.length > 0 && (
          <p className="text-[11px] text-cian leading-snug">
            {carrerasReconocidas.map(c => `${c.siglas} · ${c.nombre}`).join(' / ')}
            {' — '}{filtradas.length} {filtradas.length === 1 ? 'mesa' : 'mesas'}
          </p>
        )}

        {carreras.length === 0 && mesas?.length > 0 && (
          <p className="text-[11px] text-ambar/90 leading-snug">
            Ninguna empresa tiene carreras etiquetadas todavía. Se hace en{' '}
            <Link to="/admin/empresas" className="underline">Empresas</Link>.
          </p>
        )}
        </>)}
      </header>

      <main className="flex-1 px-4 py-4">
        {/* Solo errores de escritura: los de lectura los cuenta la banda de arriba. */}
        {error && <Cargando error={error} />}

        {mesas && filtradas.length === 0 && (
          <p className="text-sm text-lavanda/50 py-10 text-center">
            {hayFiltro ? 'Ninguna mesa coincide con eso.' : 'Sin mesas en este bloque.'}
          </p>
        )}

        {mesas && filtradas.length > 0 && vista === 'rejilla' && (
          <RejillaMesas total={hayFiltro ? filtradas.length : celdas.length}>
            {(hayFiltro ? filtradas : celdas).map(m => {
              if (m.libre) {
                // Con la base viva se puede asignar ahí mismo; sin ella, solo se ve.
                const tocable = fuente === 'viva'
                return (
                  <button
                    key={m.numero} disabled={!tocable}
                    onClick={() => abrirEdicion('nueva', m.numero)}
                    className="rounded-lg border border-dashed border-lavanda/25 bg-transparent px-2 py-2
                               text-left min-h-[62px] flex flex-col justify-between text-lavanda/40
                               transition-transform active:scale-95 disabled:active:scale-100"
                  >
                    <span className="text-[11px] font-bold cifra">{m.numero}</span>
                    <span className="text-[11px] leading-tight">Libre</span>
                  </button>
                )
              }
              const p = pintar(m, ahora)
              return (
                <button
                  key={m.numero} onClick={() => setAbierta(m.numero)}
                  className={`rounded-lg border px-2 py-2 text-left min-h-[62px] flex flex-col justify-between
                              transition-transform active:scale-95 ${p.celda}`}
                >
                  <span className="flex items-baseline justify-between gap-1">
                    <span className="text-[11px] font-bold cifra opacity-75">{m.numero}</span>
                    {m.estado === 'ocupado' && (
                      <span className="text-[11px] font-bold cifra">{comoReloj(p.segundos)}</span>
                    )}
                  </span>
                  <span className="text-[11px] leading-tight line-clamp-2 break-words font-medium">
                    {m.empresa}
                  </span>
                </button>
              )
            })}
          </RejillaMesas>
        )}

        {acomodando && (!salon
          ? <Cargando texto="Trayendo el salón…" />
          : (
            <Suspense fallback={<Cargando />}>
              <AcomodoEnMapa
                edicion={{ total_mesas: salon.totalMesas }}
                bloque={bloque}
                filas={filasParaAcomodo}
                // El estado en vivo es del número donde estaba la mesa.
                pintar={(f, n) => pintar(vivoPorNumero.get(n) ?? { numero: n, estado: 'disponible' }, ahora).celda}
                fija={(f, n) => vivoPorNumero.get(n)?.estado === 'ocupado'}
                avisar={() => canalSalon.current?.send({ type: 'broadcast', event: 'cambio', payload: {} })}
                onSalir={() => setAcomodando(false)}
                onGuardado={async n => {
                  await Promise.all([traer(), traerSalon()])
                  setAcomodando(false)
                  setGuardadoAcomodo(`Acomodo guardado: ${n === 1 ? 'una mesa cambió' : `${n} mesas cambiaron`} de lugar.`)
                }}
              />
            </Suspense>
          ))}

        {!acomodando && mesas && filtradas.length > 0 && vista === 'plano' && (
          <PlanoSalon
            excedentes={salonCompleto.filter(m => !m.libre && m.numero > MESAS_EN_PLANO).map(m => m.numero)}
            celda={(numero, { angosta }) => (
              <MesaEnPlano
                mesa={salonCompleto.find(m => m.numero === numero) ?? { numero, libre: true }}
                apagada={coinciden ? !coinciden.has(numero) : false}
                angosta={angosta} ahora={ahora} tocable={fuente === 'viva'}
                onAbrir={setAbierta} onHueco={n => abrirEdicion('nueva', n)}
              />
            )}
          />
        )}

        {mesas && filtradas.length > 0 && vista === 'lista' && (
          <ul className="space-y-1">
            {ordenarParaLista(filtradas, ahora).map(m => {
              const p = pintar(m, ahora)
              return (
                <li key={m.numero}>
                  <button
                    onClick={() => setAbierta(m.numero)}
                    className="w-full flex items-center gap-3 text-left rounded-xl border border-lavanda/15
                               bg-marino-alto/40 hover:border-lavanda/35 px-3 py-2.5 transition-colors"
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.celda.split(' ')[0]}`} />
                    <span className="cifra text-sm font-bold text-lavanda/50 w-8 shrink-0 text-right">
                      {m.numero}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold truncate">{m.empresa}</span>
                      <span className="block text-[11px] text-lavanda/50 truncate">
                        {textoEstado(m.estado)}{m.giro ? ` · ${m.giro}` : ''}
                      </span>
                    </span>
                    {m.estado === 'ocupado' && (
                      <span className={`cifra text-sm font-bold shrink-0
                                        ${p.alerta ? 'text-rojo' : 'text-lavanda/70'}`}>
                        {comoReloj(p.segundos)}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
