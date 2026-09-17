import { mesasFijas, carrerasFijas, fechaDelMapa } from '../../lib/mapaFijo'
import { BLOQUES, etiquetaBloque, GIRO_PORTAFOLIO } from '../../lib/cifras'

/**
 * El salón en papel. Es el último respaldo: si se cae Supabase, Vercel, el wifi
 * o la pila del celular, esta hoja sigue diciendo quién está en cada mesa y a
 * dónde mandar a un estudiante de cada carrera.
 *
 * Sale del mismo `mapa-fijo.json` que usan las pantallas cuando la base no
 * contesta, así que el papel y el celular no se pueden desfasar entre ellos.
 * Se imprime una por host, más una de repuesto.
 */

function Hoja({ bloque, ultima }) {
  const mesas = mesasFijas(bloque)
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
          {mesas.length} mesas · datos del {fechaDelMapa()}
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

export default function Impreso() {
  return (
    <section className="space-y-5">
      <div className="no-imprimir">
        <h2 className="text-xl font-extrabold">El salón en papel</h2>
        <p className="text-sm text-lavanda/60 mt-0.5 max-w-prose">
          El respaldo de hasta abajo, para cuando no hay app ni señal. Dos hojas: quién está en
          cada mesa y a qué mesa mandar cada carrera. Imprime una por host y una de repuesto.
        </p>
      </div>

      <div className="no-imprimir rounded-xl border border-ambar/40 bg-ambar/10 px-4 py-3">
        <p className="text-xs text-ambar leading-relaxed">
          Estos datos son del {fechaDelMapa()}. Si se movió alguna mesa después, regenera el mapa
          con <code className="font-mono">node scripts/hornear-mapa.mjs</code> antes de imprimir.
        </p>
      </div>

      <div className="no-imprimir">
        <button
          onClick={() => window.print()}
          className="rounded-xl bg-tec hover:bg-tec-claro px-5 py-3 font-bold text-sm transition-colors"
        >
          Imprimir las dos hojas
        </button>
      </div>

      <div className="space-y-5">
        {BLOQUES.map((b, i) => (
          <Hoja key={b.clave} bloque={b.clave} ultima={i === BLOQUES.length - 1} />
        ))}
      </div>
    </section>
  )
}
