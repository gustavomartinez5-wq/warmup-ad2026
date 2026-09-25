import { useRef, useState } from 'react'

/**
 * Los enlaces que se mandan por WhatsApp o correo. Salen del dominio en el que
 * se está viendo la app, así que en producción copian el link de producción y
 * en local el de local: nunca se comparte uno que apunte a otro lado.
 */
const ENLACES = [
  {
    grupo: 'Para el día del evento',
    lista: [
      { ruta: '/turno', texto: 'Sacar turno',          quien: 'Estudiantes, por el QR de la entrada' },
      { ruta: '/mesa',  texto: 'Pantalla de la mesa',  quien: 'Reclutadores, por el QR de su mesa' },
      { ruta: '/host',  texto: 'Vista de host',        quien: 'Hosts y becarios, con cuenta' },
      { ruta: '/scout', texto: 'Vista de scout',       quien: 'Scouts, sin contraseña' },
      { ruta: '/fila',  texto: 'Lista de espera',      quien: 'Host de lista de espera, con cuenta' },
    ],
  },
  {
    grupo: 'Para el equipo',
    lista: [
      { ruta: '/admin/qr',       texto: 'QR imprimible',     quien: 'La hoja con los QR de las mesas' },
      { ruta: '/admin/impreso',  texto: 'Hoja de papel',     quien: 'El salón impreso, por si falla todo' },
      { ruta: '/admin/cambios',  texto: 'Cambios del día',   quien: 'Lo que se movió en el salón' },
      { ruta: '/api/latido',     texto: 'Latido de la base', quien: 'Si contesta, la base está viva' },
    ],
  },
]

/**
 * En celular el botón abre el menú de compartir del teléfono: de ahí sale directo
 * a WhatsApp, que es a donde van casi todos estos links. En laptop copia.
 */
const esTactil = () =>
  typeof navigator.share === 'function' && window.matchMedia?.('(pointer: coarse)').matches

async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    // Sin permiso de portapapeles: el truco viejo del textarea.
    try {
      const t = document.createElement('textarea')
      t.value = texto
      t.style.position = 'fixed'
      t.style.opacity = '0'
      document.body.appendChild(t)
      t.select()
      const ok = document.execCommand('copy')
      t.remove()
      return ok
    } catch {
      return false
    }
  }
}

function Renglon({ enlace, url, tactil }) {
  // 'copiado' · 'fallo' · null
  const [estado, setEstado] = useState(null)
  const link = useRef(null)

  function avisar(e) {
    setEstado(e)
    setTimeout(() => setEstado(null), e === 'fallo' ? 4000 : 1800)
  }

  async function alTocar() {
    if (tactil) {
      try {
        await navigator.share({ title: `Warm Up AD2026 · ${enlace.texto}`, url })
        return
      } catch (e) {
        // Cerrar el menú sin elegir no es un error que haya que decir.
        if (e?.name === 'AbortError') return
      }
    }
    if (await copiar(url)) { avisar('copiado'); return }

    // No se pudo copiar: se deja el link seleccionado para copiarlo a mano, y se
    // dice. Antes el botón no hacía nada y parecía que había funcionado.
    const rango = document.createRange()
    rango.selectNodeContents(link.current)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(rango)
    avisar('fallo')
  }

  const boton =
    estado === 'copiado' ? { texto: 'Copiado',           clase: 'bg-teal text-white' }
    : estado === 'fallo' ? { texto: 'Cópialo a mano',    clase: 'bg-ambar/15 border border-ambar/60 text-ambar' }
    : { texto: tactil ? 'Compartir' : 'Copiar', clase: 'bg-marino border border-lavanda/25 hover:border-cian/60' }

  return (
    <li className="rounded-xl border border-lavanda/15 bg-marino-alto/50 px-4 py-3 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{enlace.texto}</p>
        <p className="text-[11px] text-lavanda/50 leading-tight mt-0.5">{enlace.quien}</p>
        <a ref={link} href={url} target="_blank" rel="noreferrer"
          className="block text-xs text-cian/80 hover:text-cian truncate mt-1">
          {url.replace(/^https?:\/\//, '')}
        </a>
      </div>
      <button onClick={alTocar}
        className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${boton.clase}`}>
        {boton.texto}
      </button>
    </li>
  )
}

export default function EnlacesCompartir() {
  const origen = window.location.origin
  const tactil = esTactil()

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-extrabold">Enlaces para compartir</h3>
      {ENLACES.map(g => (
        <div key={g.grupo}>
          <p className="text-[11px] uppercase tracking-wider text-lavanda/45 font-semibold mb-2">{g.grupo}</p>
          <ul className="grid sm:grid-cols-2 gap-2">
            {g.lista.map(e => (
              <Renglon key={e.ruta} enlace={e} url={origen + e.ruta} tactil={tactil} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
