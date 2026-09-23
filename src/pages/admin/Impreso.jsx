import { useEffect, useState } from 'react'
import { mesasFijas, carrerasFijas, fechaDelMapa } from '../../lib/mapaFijo'
import { mesasDelBloque } from '../../lib/mesaPublica'
import { BLOQUES, etiquetaBloque, GIRO_PORTAFOLIO } from '../../lib/cifras'
import { MESAS_EN_PLANO, nombreCorto, tienePalabraLarga } from '../../lib/plano'
import PlanoSalon from '../../components/PlanoSalon'

/**
 * El salón en papel. Es el último respaldo: si se cae Supabase, Vercel, el wifi
 * o la pila del celular, esta hoja sigue diciendo quién está en cada mesa y a
 * dónde mandar a un estudiante de cada carrera.
 *
 * Sale de la base, con el acomodo del momento: desde el 22-sep las mesas se
 * acomodan en la app y el mapa horneado puede ir atrás. Si la base no contesta,
 * cae al `mapa-fijo.json` y lo dice con su fecha.
 * Se imprime una por host, más una de repuesto.
 */

function Hoja({ bloque, ultima, mesas, fecha }) {
  const nombres = new Map(carrerasFijas().map(c => [c.siglas, c.nombre]))

  // Qué mesas atienden cada carrera. Es la vuelta que se da un host cuando
  // trae a un estudiante al lado: de la carrera al número de mesa.
  const porCarrera = new Map()
  for (const m of mesas) {
    for (const c of m.carreras ?? []) {
      if (!porCarrera.has(c)) porCarrera.set(c, [])
      porCarrera.get(c).push(m.numero)
    }
  }
  const carreras = [...porCarrera.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  // La zona de portafolio no es reclutamiento: un host con la hoja en la mano
  // tiene que saberlo sin preguntar. Sale del giro y no de números fijos, para
  // que siga diciendo la verdad si esas mesas se mueven.
  const portafolio = mesas
    .filter(m => m.giro === GIRO_PORTAFOLIO)
    .map(m => m.numero)

  return (
    <div
      className="hoja bg-white text-marino rounded-2xl px-8 py-7 max-w-4xl mx-auto"
      style={ultima ? undefined : { breakAfter: 'page' }}
    >
      <div className="flex items-baseline justify-between gap-4 border-b-2 border-marino pb-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-tec">CVDP</p>
          <h2 className="text-xl font-extrabold leading-tight">
            Warm Up AD2026 · {etiquetaBloque(bloque)}
          </h2>
        </div>
        <p className="text-[11px] text-marino/60 shrink-0">
          {mesas.length} mesas · datos del {fecha}
        </p>
      </div>

      {portafolio.length > 0 && (
        <p className="text-[11px] text-marino/75 mt-2">
          <span className="font-bold">Revisión de portafolio (EAAD):</span>{' '}
          <span className="cifra">{portafolio.join(', ')}</span>. No son mesas de reclutamiento.
        </p>
      )}

      <h3 className="text-[11px] uppercase tracking-[0.14em] font-bold text-marino/60 mt-4 mb-1.5">
        Quién está en cada mesa
      </h3>
      <ul className="columns-3 gap-6 text-[11px] leading-[1.45]">
        {mesas.map(m => (
          <li key={m.numero} className="flex gap-1.5 break-inside-avoid">
            <span className="cifra font-bold w-5 shrink-0 text-right">{m.numero}</span>
            <span className="min-w-0">{m.empresa}</span>
          </li>
        ))}
      </ul>

      <h3 className="text-[11px] uppercase tracking-[0.14em] font-bold text-marino/60 mt-5 mb-1.5
                     border-t border-marino/20 pt-3">
        A qué mesa mandar cada carrera
      </h3>
      <ul className="columns-2 gap-6 text-[11px] leading-[1.45]">
        {carreras.map(([siglas, numeros]) => (
          <li key={siglas} className="break-inside-avoid mb-1">
            <span className="font-bold">{siglas}</span>
            <span className="text-marino/55"> · {nombres.get(siglas) ?? ''}</span>
            <br />
            <span className="cifra text-marino/80">{numeros.join('  ')}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Cuántas siglas caben en una mesa del papel antes de que la letra deje de leerse. */
const SIGLAS_EN_LA_MESA = 12

/**
 * El salón dibujado, en papel. Va horizontal y en una hoja por bloque, con el
 * mismo acomodo del mapa oficial. Se imprime como alternativa a las listas: la
 * lista dice quién está en cada mesa; el plano dice dónde queda esa mesa.
 */
function HojaPlano({ bloque, ultima, mesas, fecha }) {
  const porNumero = new Map(mesas.map(m => [m.numero, m]))
  const portafolio = mesas.filter(m => m.giro === GIRO_PORTAFOLIO).map(m => m.numero)

  const celda = numero => {
    const m = porNumero.get(numero)
    if (!m) {
      return (
        <div className="h-full min-h-[108px] rounded border border-dashed border-marino/25 px-1 py-1
                        text-marino/35 text-[10px] font-bold cifra">
          {numero}
        </div>
      )
    }
    const carreras = m.carreras ?? []
    const dentro = carreras.slice(0, SIGLAS_EN_LA_MESA)
    const resto = carreras.length - dentro.length
    return (
      <div className={`h-full min-h-[108px] rounded border px-[3px] py-1 flex flex-col gap-0.5 min-w-0
                       ${m.giro === GIRO_PORTAFOLIO
                         ? 'border-marino border-dashed bg-marino/5' : 'border-marino/70'}`}>
        <span className="text-[10px] font-extrabold cifra leading-none">{numero}</span>
        {/* En el papel la mesa es más angosta que en pantalla: la palabra larga
            baja a 8 px para no partirse a media palabra. */}
        <span className={`${tienePalabraLarga(nombreCorto(m.empresa))
                            ? 'text-[8px] tracking-tighter' : 'text-[9px]'}
                          leading-tight font-semibold break-words`}>
          {nombreCorto(m.empresa)}
        </span>
        {carreras.length > 0 && (
          <span className="text-[7px] leading-[1.25] text-marino/70 break-words">
            {dentro.join(' ')}{resto > 0 ? ` +${resto}` : ''}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className="hoja hoja-plano bg-white text-marino rounded-2xl px-6 py-5"
      style={ultima ? undefined : { breakAfter: 'page' }}
    >
      <div className="flex items-baseline justify-between gap-4 border-b-2 border-marino pb-2 mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-tec">CVDP</p>
          <h2 className="text-xl font-extrabold leading-tight">
            Warm Up AD2026 · {etiquetaBloque(bloque)} · el salón
          </h2>
        </div>
        <p className="text-[11px] text-marino/60 shrink-0">
          {mesas.length} mesas · datos del {fecha}
        </p>
      </div>

      <PlanoSalon
        orientacion="horizontal" tono="papel"
        excedentes={mesas.filter(m => m.numero > MESAS_EN_PLANO).map(m => m.numero)}
        celda={celda}
      />

      <p className="text-[10px] text-marino/70 mt-3">
        La mesa 1 queda abajo a la derecha, junto al acceso. Debajo del nombre van las carreras que
        busca la empresa.
        {portafolio.length > 0 && (
          <> Revisión de portafolio (EAAD), con contorno punteado:{' '}
            <span className="cifra">{portafolio.join(', ')}</span>.</>
        )}
      </p>
    </div>
  )
}

export default function Impreso() {
  const [que, setQue] = useState('listas')
  const plano = que === 'plano'
  // null mientras pregunta; 'fijo' si la base no contestó.
  const [vivo, setVivo] = useState(null)

  useEffect(() => {
    let vigente = true
    Promise.all(BLOQUES.map(b => mesasDelBloque(b.clave)))
      .then(listas => {
        if (!vigente) return
        const porBloque = Object.fromEntries(BLOQUES.map((b, i) => [
          b.clave,
          [...listas[i]].sort((x, y) => x.numero - y.numero),
        ]))
        setVivo(porBloque)
      })
      .catch(() => { if (vigente) setVivo('fijo') })
    return () => { vigente = false }
  }, [])

  const deLaBase = vivo && vivo !== 'fijo'
  const hoy = new Date()
  const fecha = deLaBase
    ? `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}`
    : fechaDelMapa()
  const mesasDe = bloque => deLaBase ? vivo[bloque] : mesasFijas(bloque)

  return (
    <section className="space-y-5">
      <div className="no-imprimir">
        <h2 className="text-xl font-extrabold">El salón en papel</h2>
        <p className="text-sm text-lavanda/60 mt-0.5 max-w-prose">
          El respaldo de hasta abajo, para cuando no hay app ni señal. Las listas dicen quién está
          en cada mesa y a qué mesa mandar cada carrera; el plano dice dónde queda esa mesa.
          Imprime una por host y una de repuesto.
        </p>
      </div>

      <div className="no-imprimir flex rounded-lg border border-lavanda/20 overflow-hidden w-fit">
        {[['listas', 'Listas'], ['plano', 'Plano']].map(([v, t]) => (
          <button
            key={v} onClick={() => setQue(v)}
            className={`px-3.5 py-2 text-xs font-bold transition-colors ${
              que === v ? 'bg-tec text-white' : 'text-lavanda/55 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {vivo === null && (
        <p className="no-imprimir text-xs text-lavanda/60">Trayendo el acomodo de la base…</p>
      )}
      {deLaBase && (
        <p className="no-imprimir text-xs text-lavanda/60">
          Datos de la base, con el acomodo de este momento.
        </p>
      )}
      {vivo === 'fijo' && (
        <div className="no-imprimir rounded-xl border border-ambar/40 bg-ambar/10 px-4 py-3">
          <p className="text-xs text-ambar leading-relaxed">
            La base no contestó. Estos datos son del mapa de respaldo del {fechaDelMapa()}; si se
            acomodó algo después, no sale aquí.
          </p>
        </div>
      )}

      <div className="no-imprimir">
        <button
          onClick={() => window.print()}
          className="rounded-xl bg-tec hover:bg-tec-claro px-5 py-3 font-bold text-sm transition-colors"
        >
          {plano ? 'Imprimir el plano de los dos bloques' : 'Imprimir las dos hojas'}
        </button>
      </div>

      <div className="space-y-5">
        {BLOQUES.map((b, i) => (
          plano
            ? <HojaPlano key={b.clave} bloque={b.clave} ultima={i === BLOQUES.length - 1}
                         mesas={mesasDe(b.clave)} fecha={fecha} />
            : <Hoja key={b.clave} bloque={b.clave} ultima={i === BLOQUES.length - 1}
                    mesas={mesasDe(b.clave)} fecha={fecha} />
        ))}
      </div>
    </section>
  )
}
