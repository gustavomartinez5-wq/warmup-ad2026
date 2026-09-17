import { useMemo, useState } from 'react'
import {
  filaDeLaMesa, mesaOcupada, primerHueco, alcanceDelRecorrido,
  cambiarEmpresaDeMesa, moverMesa, intercambiarMesas, recorrerMesas,
  agregarMesa, liberarMesa, crearEmpresa, guardarCarreras,
} from '../lib/mesaEquipo'
import { BLOQUES, etiquetaBloque } from '../lib/cifras'
import { plano } from '../lib/texto'
import CarrerasPicker from './CarrerasPicker'
import Cargando from './Cargando'

/**
 * Arreglar el salón sin salir de la pantalla del día del evento. Es el único
 * editor del salón: lo usan `/host` desde el celular y `/admin/reclutadores`
 * desde el escritorio.
 *
 * El caso que la pidió: Unitivida tiene las mesas 32 y 33 y no llegó. Se toca la
 * 33, se le pone CHUBB, y listo. Pasa seguido —llegan reclutadores sin avisar y
 * las mesas se mueven— y hasta ahora solo se podía desde una tabla pensada para
 * el escritorio, no para estar parado en el salón.
 *
 * La empresa de una mesa no está guardada en ningún lado: se deriva de la fila
 * de `reclutadores` que tiene ese número y ese bloque. Por eso cambiarla es
 * actualizar una fila, y agregar una mesa es insertar otra.
 *
 * `mesa` en null es el modo alta: la mesa todavía no existe. Hace falta porque
 * una mesa libre no sale en la rejilla —`mesas_publicas` solo devuelve las
 * asignadas—, así que no hay dónde tocarla.
 *
 * Cuando el número que se pide ya está tomado, la hoja no se queda en «no
 * puedes»: ofrece las dos salidas que se usan en el salón, intercambiar las dos
 * mesas o recorrer el tramo. Y lo que ya se cambió arriba —la empresa, las
 * carreras— se guarda primero, para que elegir una salida no lo tire.
 */
const NUEVA = '__nueva'

export default function EditarMesa({
  mesa, bloque, salon, carreras, cargando, onCerrar, onGuardado,
}) {
  const esAlta = mesa === null
  const fila = salon && !esAlta ? filaDeLaMesa(salon.filas, bloque, mesa.numero) : null

  const hueco = salon ? primerHueco(salon.filas, bloque, salon.totalMesas) : null

  const [empresaId, setEmpresaId]     = useState(esAlta ? NUEVA : null)
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [giroNuevo, setGiroNuevo]     = useState('')
  const [numero, setNumero]           = useState(esAlta ? '' : String(mesa.numero))
  const [tocoNumero, setTocoNumero]   = useState(false)
  const [bloqueElegido, setBloque]    = useState(bloque)
  const [elegidas, setElegidas]       = useState(esAlta ? new Set() : null)
  const [guardando, setGuardando]     = useState(null)   // qué se está haciendo
  const [confirmaLiberar, setConfirmaLiberar] = useState(false)
  const [error, setError]             = useState(null)

  // En alta no hay fila de dónde sacar el valor de arranque; en edición sí.
  const empresaPuesta = empresaId ?? fila?.empresa_id ?? null
  const esNueva = empresaPuesta === NUEVA
  const empresa = salon?.empresas.find(e => e.id === empresaPuesta) ?? null
  const carrerasPuestas = elegidas ?? new Set(empresa?.carreras ?? [])

  // En alta, el número que se ofrece es el primer hueco: teclear a ciegas es
  // como se acaba con dos empresas en la misma mesa.
  const numeroTexto = esAlta && !tocoNumero && hueco !== null ? String(hueco) : numero
  const numeroInt = /^\d+$/.test(numeroTexto.trim()) ? parseInt(numeroTexto.trim(), 10) : null

  function elegirEmpresa(id) {
    setEmpresaId(id)
    // Las carreras son de la empresa: al cambiarla, se traen las suyas.
    setElegidas(new Set(salon?.empresas.find(e => e.id === id)?.carreras ?? []))
  }

  // La fila que está en el lugar que se está pidiendo, si hay alguna.
  const otraFila = salon && numeroInt !== null
    ? (filaDeLaMesa(salon.filas, bloqueElegido, numeroInt) ?? null)
    : null
  const choca = Boolean(
    salon && numeroInt !== null &&
    mesaOcupada(salon.filas, bloqueElegido, numeroInt, fila?.id))

  const empresaDe = id => salon?.empresas.find(e => e.id === id)?.nombre ?? 'esa empresa'

  const recorrido = useMemo(
    () => salon && numeroInt !== null
      ? alcanceDelRecorrido(salon.filas, bloqueElegido, numeroInt, salon.totalMesas)
      : { hueco: null, mesas: 0 },
    [salon, bloqueElegido, numeroInt])

  // Una empresa con nombre repetido se elige de la lista, no se duplica: la base
  // tiene unique (edicion, nombre) y el insert tronaría.
  const yaRegistrada = esNueva && nombreNuevo.trim() && salon
    ? salon.empresas.find(e => plano(e.nombre) === plano(nombreNuevo)) ?? null
    : null

  const susMesas = useMemo(
    () => salon && !esNueva ? salon.filas.filter(f => f.empresa_id === empresaPuesta).length : 0,
    [salon, empresaPuesta, esNueva])

  const cambioDeEmpresa = Boolean(!esAlta && fila && empresaPuesta && empresaPuesta !== fila.empresa_id)
  const cambioDeNumero  = !esAlta && numeroInt !== null && numeroInt !== mesa.numero
  const cambioDeBloque  = !esAlta && bloqueElegido !== bloque
  const cambioCarreras  = !esAlta && elegidas !== null && empresa &&
    [...carrerasPuestas].sort().join() !== [...empresa.carreras].sort().join()
  const hayCambio = esAlta || cambioDeEmpresa || cambioDeNumero || cambioDeBloque || cambioCarreras

  const empresaLista = esNueva ? Boolean(nombreNuevo.trim()) && !yaRegistrada : Boolean(empresaPuesta)
  const listo = Boolean(
    salon && (esAlta || fila) && empresaLista && numeroInt !== null && !choca &&
    hayCambio && !guardando)

  /**
   * Un solo camino de guardado, en el orden en que importa: primero la empresa
   * —si es nueva, se crea—, luego la mesa, luego las carreras. `resolucion` es
   * la salida que se eligió cuando el lugar estaba tomado.
   */
  async function guardar(resolucion = null) {
    setGuardando(resolucion ?? 'guardar'); setError(null)
    try {
      let id = empresaPuesta
      if (esNueva) {
        const creada = await crearEmpresa({
          edicionId: salon.edicionId, nombre: nombreNuevo, giro: giroNuevo,
        })
        id = creada.id
      }

      if (!esAlta && (cambioDeEmpresa || esNueva)) {
        await cambiarEmpresaDeMesa(fila.id, id)
      }

      if (resolucion === 'intercambiar') {
        await intercambiarMesas(fila.id, otraFila.id)
      } else if (resolucion === 'recorrer') {
        await recorrerMesas(bloqueElegido, numeroInt)
        if (esAlta) await agregarMesa(bloqueElegido, numeroInt, id)
        else        await moverMesa(fila.id, bloqueElegido, numeroInt)
      } else if (esAlta) {
        await agregarMesa(bloqueElegido, numeroInt, id)
      } else if (cambioDeNumero || cambioDeBloque) {
        await moverMesa(fila.id, bloqueElegido, numeroInt)
      }

      if (esNueva || cambioCarreras) {
        await guardarCarreras(id, [...carrerasPuestas], {
          edicionId: salon.edicionId, empresa: esNueva ? nombreNuevo.trim() : empresa?.nombre,
        })
      }
      await onGuardado()
      onCerrar()
    } catch (e) {
      setError(e.message ?? String(e))
      setGuardando(null)
    }
  }

  async function liberar() {
    setGuardando('liberar'); setError(null)
    try {
      await liberarMesa(fila.id)
      await onGuardado()
      onCerrar()
    } catch (e) {
      setError(e.message ?? String(e))
      setGuardando(null)
    }
  }

  const campo = 'w-full rounded-lg bg-marino border border-lavanda/20 px-3 py-2.5 ' +
                'text-sm outline-none focus:border-cian placeholder-lavanda/30'
  const salida = 'w-full rounded-lg bg-marino border border-cian/50 text-cian hover:bg-cian/10 ' +
                 'px-3 py-2.5 text-[13px] font-bold transition-colors disabled:opacity-40'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 px-0 sm:px-4"
      onClick={e => e.target === e.currentTarget && onCerrar()}
    >
      <div className="bg-marino-alto rounded-t-2xl sm:rounded-2xl border border-lavanda/20
                      w-full sm:max-w-lg max-h-[88dvh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-lavanda/15 shrink-0">
          <div className="min-w-0">
            <p className="font-bold">
              {esAlta ? 'Agregar una mesa' : <>Editar la mesa <span className="cifra">{mesa.numero}</span></>}
            </p>
            <p className="text-xs text-lavanda/55 mt-0.5">{etiquetaBloque(bloque)}</p>
          </div>
          <button onClick={onCerrar} className="text-lavanda/50 hover:text-white text-lg leading-none shrink-0">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {cargando && <Cargando texto="Trayendo las empresas…" />}

          {!cargando && !salon && (
            <p className="text-sm text-rojo">No se pudieron traer las empresas. Cierra y vuelve a intentar.</p>
          )}

          {!cargando && salon && !esAlta && !fila && (
            <p className="text-sm text-ambar">
              Esta mesa ya no aparece asignada. Toca Recargar en la pantalla y vuelve a abrirla.
            </p>
          )}

          {!cargando && salon && (esAlta || fila) && (
            <>
              <div>
                <p className="text-xs text-lavanda/55 mb-1.5">
                  {esAlta ? 'Quién se sienta aquí' : 'Quién está en esta mesa'}
                </p>
                <select
                  value={empresaPuesta ?? ''} onChange={e => elegirEmpresa(e.target.value)}
                  className={campo}
                >
                  {salon.empresas.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                  <option value={NUEVA}>Otra empresa…</option>
                </select>
              </div>

              {esNueva && (
                <div className="space-y-2">
                  <input
                    value={nombreNuevo} onChange={e => setNombreNuevo(e.target.value)}
                    placeholder="Nombre de la empresa" className={campo}
                  />
                  <input
                    value={giroNuevo} onChange={e => setGiroNuevo(e.target.value)}
                    placeholder="Giro (opcional)" className={campo}
                  />
                  {yaRegistrada && (
                    <p className="text-xs text-ambar bg-ambar/10 border border-ambar/40 rounded-lg px-3 py-2">
                      «{yaRegistrada.nombre}» ya está registrada.{' '}
                      <button
                        onClick={() => { elegirEmpresa(yaRegistrada.id); setNombreNuevo('') }}
                        className="underline underline-offset-2 font-semibold"
                      >
                        Elegir esa
                      </button>
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-lavanda/55 mb-1.5">Número de mesa</p>
                  <input
                    value={numeroTexto}
                    onChange={e => { setTocoNumero(true); setNumero(e.target.value) }}
                    inputMode="numeric" placeholder="El número del acrílico"
                    className={`${campo} cifra`}
                  />
                </div>
                <div>
                  <p className="text-xs text-lavanda/55 mb-1.5">Bloque</p>
                  <select
                    value={bloqueElegido} onChange={e => setBloque(e.target.value)}
                    className={campo}
                  >
                    {BLOQUES.map(b => <option key={b.clave} value={b.clave}>{b.nombre}</option>)}
                  </select>
                </div>
              </div>

              {esAlta && !tocoNumero && hueco !== null && (
                <p className="text-[11px] text-lavanda/45 -mt-2">
                  La <span className="cifra">{hueco}</span> es la primera libre de{' '}
                  {etiquetaBloque(bloqueElegido).toLowerCase()}. Cámbiala si el acrílico dice otra.
                </p>
              )}
              {esAlta && hueco === null && !choca && (
                <p className="text-[11px] text-ambar -mt-2">
                  No queda ninguna mesa libre en {etiquetaBloque(bloqueElegido).toLowerCase()}.
                  Hay que conseguir otra mesa o recorrer el tramo.
                </p>
              )}

              {/* Las dos salidas de siempre cuando el lugar está tomado. Guardan
                  antes lo que ya se cambió arriba, así que elegir una no lo tira. */}
              {choca && otraFila && (
                <div className="rounded-lg border border-ambar/40 bg-ambar/10 px-3 py-3 space-y-2">
                  <p className="text-xs text-ambar leading-relaxed">
                    La mesa <span className="cifra">{numeroInt}</span> de{' '}
                    {etiquetaBloque(bloqueElegido).toLowerCase()} la tiene{' '}
                    <span className="font-bold">{empresaDe(otraFila.empresa_id)}</span>.
                  </p>
                  {!esAlta && (
                    <button
                      onClick={() => guardar('intercambiar')} disabled={Boolean(guardando)}
                      className={salida}
                    >
                      {guardando === 'intercambiar' ? 'Intercambiando…'
                        : `Intercambiar: se va a la ${mesa.numero}`}
                    </button>
                  )}
                  {recorrido.hueco !== null ? (
                    <button
                      onClick={() => guardar('recorrer')} disabled={Boolean(guardando)}
                      className={salida}
                    >
                      {guardando === 'recorrer' ? 'Recorriendo…'
                        : `Recorrer: ${recorrido.mesas} ${recorrido.mesas === 1 ? 'mesa' : 'mesas'} suben una, de la ${numeroInt} a la ${recorrido.hueco}`}
                    </button>
                  ) : (
                    <p className="text-[11px] text-ambar/80">
                      De la {numeroInt} a la {salon.totalMesas} no hay ninguna libre, así que no se
                      puede recorrer. Hay que conseguir otra mesa.
                    </p>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs text-lavanda/55 mb-1.5">
                  Carreras que busca
                  <span className="cifra text-lavanda/40 ml-1.5">{carrerasPuestas.size}</span>
                </p>
                <p className="text-[11px] text-lavanda/40 mb-2 leading-relaxed">
                  Son las que filtran a quién mandar a esta mesa. Van con la empresa, no con la mesa
                  {susMesas > 1 && <> — {empresa?.nombre} tiene <span className="cifra">{susMesas}</span> mesas
                    y esto vale para todas</>}.
                </p>
                <CarrerasPicker
                  carreras={carreras} elegidas={carrerasPuestas} onCambio={setElegidas}
                />
              </div>

              {/* Liberar va al final y con confirmación: es el único botón de aquí
                  que borra algo. */}
              {!esAlta && fila && (
                <div className="border-t border-lavanda/15 pt-3">
                  {!confirmaLiberar ? (
                    <button
                      onClick={() => setConfirmaLiberar(true)}
                      className="text-[13px] text-lavanda/55 hover:text-rojo font-semibold transition-colors"
                    >
                      Liberar esta mesa
                    </button>
                  ) : (
                    <div className="rounded-lg border border-rojo/40 bg-rojo/10 px-3 py-3 space-y-2">
                      <p className="text-xs text-rojo leading-relaxed">
                        La mesa <span className="cifra">{mesa.numero}</span> queda libre y{' '}
                        {empresaDe(fila.empresa_id)} deja de aparecer en{' '}
                        {etiquetaBloque(bloque).toLowerCase()}. Se puede volver a asignar después.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={liberar} disabled={Boolean(guardando)}
                          className="flex-1 rounded-lg bg-rojo hover:bg-rojo/80 disabled:opacity-40
                                     py-2.5 text-[13px] font-bold transition-colors"
                        >
                          {guardando === 'liberar' ? 'Liberando…' : 'Sí, liberarla'}
                        </button>
                        <button
                          onClick={() => setConfirmaLiberar(false)}
                          className="flex-1 rounded-lg border border-lavanda/25 text-lavanda/70
                                     py-2.5 text-[13px] font-bold"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <p className="text-xs text-rojo bg-rojo/10 border border-rojo/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        {!cargando && salon && (esAlta || fila) && (
          <div className="px-5 py-3 border-t border-lavanda/15 shrink-0">
            <button
              onClick={() => guardar()} disabled={!listo}
              className="w-full rounded-xl bg-tec hover:bg-tec-claro disabled:opacity-40
                         py-3 font-bold text-sm transition-colors"
            >
              {guardando === 'guardar' ? 'Guardando…'
                : esAlta ? 'Agregar la mesa'
                : choca ? 'La mesa está tomada'
                : hayCambio ? 'Guardar' : 'Sin cambios'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
