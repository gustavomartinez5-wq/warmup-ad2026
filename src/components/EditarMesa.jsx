import { useMemo, useState } from 'react'
import {
  filaDeLaMesa, mesaOcupada, cambiarLaMesa, agregarMesa, crearEmpresa, guardarCarreras,
} from '../lib/mesaEquipo'
import { etiquetaBloque } from '../lib/cifras'
import { plano } from '../lib/texto'
import CarrerasPicker from './CarrerasPicker'
import Cargando from './Cargando'

/**
 * Arreglar el salón sin salir de la pantalla del día del evento.
 *
 * El caso que la pidió: Unitivida tiene las mesas 32 y 33 y no llegó. Se toca la
 * 33, se le pone CHUBB, y listo. Pasa seguido —llegan reclutadores sin avisar y
 * las mesas se mueven— y hasta ahora solo se podía desde `/admin/reclutadores`,
 * en una tabla pensada para el escritorio, no para estar parado en el salón.
 *
 * La empresa de una mesa no está guardada en ningún lado: se deriva de la fila
 * de `reclutadores` que tiene ese número y ese bloque. Por eso cambiarla es
 * actualizar una fila, y agregar una mesa es insertar otra.
 *
 * `mesa` en null es el modo alta: la mesa todavía no existe. Hace falta porque
 * una mesa libre no sale en la rejilla —`mesas_publicas` solo devuelve las
 * asignadas—, así que no hay dónde tocarla.
 */
const NUEVA = '__nueva'

export default function EditarMesa({ mesa, bloque, salon, carreras, cargando, onCerrar, onGuardado }) {
  const esAlta = mesa === null
  const fila = salon && !esAlta ? filaDeLaMesa(salon.filas, bloque, mesa.numero) : null

  const [empresaId, setEmpresaId]     = useState(esAlta ? NUEVA : null)
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [giroNuevo, setGiroNuevo]     = useState('')
  const [numero, setNumero]           = useState(esAlta ? '' : String(mesa.numero))
  const [elegidas, setElegidas]       = useState(esAlta ? new Set() : null)
  const [guardando, setGuardando]     = useState(false)
  const [error, setError]             = useState(null)

  // En alta no hay fila de dónde sacar el valor de arranque; en edición sí.
  const empresaPuesta = empresaId ?? fila?.empresa_id ?? null
  const esNueva = empresaPuesta === NUEVA
  const empresa = salon?.empresas.find(e => e.id === empresaPuesta) ?? null
  const carrerasPuestas = elegidas ?? new Set(empresa?.carreras ?? [])

  function elegirEmpresa(id) {
    setEmpresaId(id)
    // Las carreras son de la empresa: al cambiarla, se traen las suyas.
    setElegidas(new Set(salon?.empresas.find(e => e.id === id)?.carreras ?? []))
  }

  const numeroInt = /^\d+$/.test(numero.trim()) ? parseInt(numero.trim(), 10) : null
  const choca = salon && numeroInt !== null && mesaOcupada(salon.filas, bloque, numeroInt, fila?.id)

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
  const cambioCarreras  = !esAlta && elegidas !== null && empresa &&
    [...carrerasPuestas].sort().join() !== [...empresa.carreras].sort().join()
  const hayCambio = esAlta || cambioDeEmpresa || cambioDeNumero || cambioCarreras

  const empresaLista = esNueva ? Boolean(nombreNuevo.trim()) && !yaRegistrada : Boolean(empresaPuesta)
  const listo = Boolean(
    salon && (esAlta || fila) && empresaLista && numeroInt !== null && !choca && hayCambio && !guardando)

  async function guardar() {
    setGuardando(true); setError(null)
    try {
      let id = empresaPuesta
      if (esNueva) {
        const creada = await crearEmpresa({
          edicionId: salon.edicionId, nombre: nombreNuevo, giro: giroNuevo,
        })
        id = creada.id
      }

      if (esAlta) {
        await agregarMesa({ edicionId: salon.edicionId, bloque, numero: numeroInt, empresaId: id })
      } else if (cambioDeEmpresa || cambioDeNumero || esNueva) {
        await cambiarLaMesa({
          filaId: fila.id, empresaId: id, numero: numeroInt,
          cambioDeEmpresa: cambioDeEmpresa || esNueva,
        })
      }

      if (esNueva || cambioCarreras) await guardarCarreras(id, [...carrerasPuestas])
      await onGuardado()
      onCerrar()
    } catch (e) {
      setError(e.message ?? String(e))
    }
    setGuardando(false)
  }

  const campo = 'w-full rounded-lg bg-marino border border-lavanda/20 px-3 py-2.5 ' +
                'text-sm outline-none focus:border-cian placeholder-lavanda/30'

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

              <div>
                <p className="text-xs text-lavanda/55 mb-1.5">Número de mesa</p>
                <input
                  value={numero} onChange={e => setNumero(e.target.value)}
                  inputMode="numeric" placeholder={esAlta ? 'El número del acrílico' : undefined}
                  className={`${campo} cifra`}
                />
                {choca && (
                  <p className="text-xs text-rojo bg-rojo/10 border border-rojo/30 rounded-lg px-3 py-2 mt-2">
                    La mesa {numeroInt} ya está tomada en {etiquetaBloque(bloque)}. Si ahí va otra
                    empresa, cámbiala desde esa mesa.
                  </p>
                )}
              </div>

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
              onClick={guardar} disabled={!listo}
              className="w-full rounded-xl bg-tec hover:bg-tec-claro disabled:opacity-40
                         py-3 font-bold text-sm transition-colors"
            >
              {guardando ? 'Guardando…' : esAlta ? 'Agregar la mesa' : hayCambio ? 'Guardar' : 'Sin cambios'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
