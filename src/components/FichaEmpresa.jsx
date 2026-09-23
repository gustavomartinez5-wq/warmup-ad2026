import { useState } from 'react'
import { etiquetaBloque } from '../lib/cifras'
import { guardarContacto, guardarCarreras } from '../lib/mesaEquipo'
import CarrerasPicker from './CarrerasPicker'

/**
 * La ficha de una empresa, desde el Mapa de `/admin/mesas`: se toca una mesa y se
 * abre la empresa que está sentada ahí. Reemplaza a la pantalla Empresas.
 *
 * Se editan el contacto y las carreras. Los reclutadores se ven pero se editan en
 * Reclutadores; lo que escribió la empresa en el Forms solo se lee.
 *
 * Un solo «Guardar»: primero el contacto, luego las carreras, y solo lo que
 * cambió. Si algo falla se dice aquí y la ficha no se cierra.
 */

const ESTATUS = { confirmado: 'Confirmado', por_confirmar: 'Por confirmar', cancelado: 'Cancelado' }

function Campo({ etiqueta, valor, onCambio, tipo = 'text', ancho = false }) {
  return (
    <label className={`block min-w-0 ${ancho ? 'col-span-2' : ''}`}>
      <span className="text-xs text-lavanda/55">{etiqueta}</span>
      <input
        type={tipo} value={valor} onChange={e => onCambio(e.target.value)}
        className="mt-1 w-full min-w-0 rounded-lg bg-marino border border-lavanda/20 px-3 py-2 text-sm
                   outline-none focus:border-cian"
      />
    </label>
  )
}

export default function FichaEmpresa({ empresa, mesa, reclutadores, carreras, edicionId, onCerrar, onGuardado }) {
  const inicial = {
    representante: empresa.representante ?? '',
    celular:       empresa.celular ?? '',
    correo:        empresa.correo ?? '',
  }
  const [contacto, setContacto] = useState(inicial)
  const [elegidas, setElegidas] = useState(new Set(empresa.carreras ?? []))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const cambioContacto = Object.keys(inicial).some(k => contacto[k].trim() !== inicial[k].trim())
  const cambioCarreras = [...elegidas].sort().join(' ') !== [...(empresa.carreras ?? [])].sort().join(' ')
  const hayCambios = cambioContacto || cambioCarreras

  const suyos = reclutadores
    .filter(r => r.empresa_id === empresa.id)
    .sort((a, b) => a.bloque.localeCompare(b.bloque) || (a.mesa_numero ?? 999) - (b.mesa_numero ?? 999))

  async function guardar() {
    setGuardando(true); setError(null)
    try {
      const donde = { edicionId, empresa: empresa.nombre }
      if (cambioContacto) await guardarContacto(empresa.id, contacto, donde)
      if (cambioCarreras) await guardarCarreras(empresa.id, [...elegidas].sort(), donde)
      await onGuardado()
      onCerrar()
    } catch (e) {
      setError(e.message ?? String(e))
      setGuardando(false)
    }
  }

  const poner = k => v => setContacto(c => ({ ...c, [k]: v }))

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-0 sm:px-4"
      onClick={e => e.target === e.currentTarget && onCerrar()}
    >
      <div className="bg-marino-alto rounded-t-2xl sm:rounded-2xl border border-lavanda/20
                      w-full sm:max-w-lg max-h-[88dvh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-lavanda/15 shrink-0">
          <div className="flex items-start gap-2.5 min-w-0">
            {mesa && (
              <span className="w-9 h-9 rounded-lg bg-marino border border-lavanda/20 grid place-items-center
                               text-sm font-extrabold cifra shrink-0">
                {mesa.numero}
              </span>
            )}
            <div className="min-w-0">
              <p className="font-bold truncate">{empresa.nombre}</p>
              <p className="text-xs text-lavanda/55 mt-0.5">
                {[mesa && etiquetaBloque(mesa.bloque), empresa.giro, mesa && ESTATUS[mesa.estatus]]
                  .filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <button onClick={onCerrar} className="text-lavanda/50 hover:text-white text-lg leading-none shrink-0">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Representante" valor={contacto.representante} onCambio={poner('representante')} ancho />
            <Campo etiqueta="Celular" valor={contacto.celular} onCambio={poner('celular')} tipo="tel" />
            <Campo etiqueta="Correo" valor={contacto.correo} onCambio={poner('correo')} tipo="email" />
          </div>

          <div>
            <p className="text-xs text-lavanda/55 mb-1.5">Reclutadores ({suyos.length})</p>
            {suyos.length === 0 ? (
              <p className="text-sm text-lavanda/45">Sin reclutadores.</p>
            ) : (
              <ul className="space-y-1">
                {suyos.map(r => (
                  <li key={r.id} className="text-sm flex items-baseline gap-2">
                    <span className="cifra text-lavanda/45 w-8 shrink-0">{r.mesa_numero ?? '—'}</span>
                    <span className="text-lavanda/55 text-xs shrink-0">{etiquetaBloque(r.bloque)}</span>
                    <span className="truncate">{r.nombre}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-lavanda/40 mt-1.5">Los nombres se cambian en Reclutadores.</p>
          </div>

          {(empresa.areas_texto || empresa.perfiles_texto) && (
            <div className="rounded-xl border border-lavanda/15 bg-marino/40 px-3.5 py-3 space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-lavanda/45">
                Lo que escribió la empresa
              </p>
              {empresa.areas_texto && (
                <div>
                  <p className="text-xs text-lavanda/55">Áreas que recluta</p>
                  <p className="text-sm text-lavanda/85">{empresa.areas_texto}</p>
                </div>
              )}
              {empresa.perfiles_texto && (
                <div>
                  <p className="text-xs text-lavanda/55">Perfiles o programas</p>
                  <p className="text-sm text-lavanda/85">{empresa.perfiles_texto}</p>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="text-xs text-lavanda/55 mb-1.5">
              Carreras que busca
              <span className="cifra text-lavanda/40 ml-1.5">{elegidas.size}</span>
            </p>
            <p className="text-[11px] text-lavanda/40 mb-2 leading-relaxed">
              Son las que el día del evento filtran a quién mandar a esta mesa.
            </p>
            <CarrerasPicker carreras={carreras} elegidas={elegidas} onCambio={setElegidas} />
          </div>

          {empresa.notas && (
            <div className="rounded-xl border border-ambar/40 bg-ambar/10 px-3.5 py-3">
              <p className="text-xs text-lavanda/55 mb-0.5">Pendiente</p>
              <p className="text-sm text-lavanda/85">{empresa.notas}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-lavanda/15 shrink-0 space-y-2">
          {error && <p className="text-xs text-rojo">{error}</p>}
          <button
            onClick={guardar} disabled={guardando || !hayCambios}
            className="w-full rounded-xl bg-tec hover:bg-tec-claro disabled:opacity-50
                       py-3 font-bold text-sm transition-colors"
          >
            {guardando ? 'Guardando…' : hayCambios ? 'Guardar' : 'Sin cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
