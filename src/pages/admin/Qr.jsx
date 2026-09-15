import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/**
 * El QR que va en los acrílicos. Es uno solo para todas las mesas: lleva a la
 * lista y cada quien toca su número.
 *
 * Se imprime desde el navegador. Los estilos de impresión dejan solo la hoja
 * blanca con el código, sin el marco oscuro de la app.
 */
export default function Qr() {
  const destino = `${window.location.origin}/mesa`
  const [imagen, setImagen] = useState(null)

  useEffect(() => {
    QRCode.toDataURL(destino, {
      width: 1200,
      margin: 1,
      errorCorrectionLevel: 'H',   // aguanta que se manche o se doble una esquina
      color: { dark: '#0A1D38', light: '#FFFFFF' },
    }).then(setImagen)
  }, [destino])

  return (
    <section className="space-y-5">
      <div className="no-imprimir">
        <h2 className="text-xl font-extrabold">QR de las mesas</h2>
        <p className="text-sm text-lavanda/60 mt-0.5 max-w-prose">
          Uno solo para todas. Lleva a la lista de mesas del bloque que corre según el reloj,
          y cada reclutador toca su número.
        </p>
      </div>

      <div className="no-imprimir rounded-xl border border-lavanda/20 bg-marino-alto/40 px-4 py-3">
        <p className="text-xs text-lavanda/55">A dónde lleva</p>
        <p className="text-sm break-all mt-0.5">{destino}</p>
      </div>

      {/* La hoja que se imprime */}
      <div className="hoja bg-white text-marino rounded-2xl px-6 py-8 text-center max-w-sm mx-auto">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-tec">CVDP</p>
        <p className="text-2xl font-extrabold mt-1">Warm Up AD2026</p>
        <p className="text-sm text-marino/70 mt-1">Marca tu estado desde aquí</p>

        {imagen
          ? <img src={imagen} alt="Código QR para la pantalla del reclutador"
                 className="w-full max-w-[280px] mx-auto my-5" />
          : <div className="w-full max-w-[280px] aspect-square mx-auto my-5 bg-marino/5 rounded" />}

        <p className="text-sm font-semibold">Escanea y busca tu número de mesa</p>
        <p className="text-xs text-marino/60 mt-2 break-all">{destino}</p>
      </div>

      <div className="no-imprimir flex flex-wrap gap-2">
        <button
          onClick={() => window.print()}
          className="rounded-xl bg-tec hover:bg-tec-claro px-5 py-3 font-bold text-sm transition-colors"
        >
          Imprimir
        </button>
        {imagen && (
          <a
            href={imagen} download="warmup-ad2026-qr.png"
            className="rounded-xl border border-lavanda/25 hover:border-lavanda/50
                       px-5 py-3 font-bold text-sm transition-colors"
          >
            Descargar el PNG
          </a>
        )}
      </div>

      <p className="no-imprimir text-xs text-lavanda/40 max-w-prose leading-relaxed">
        El PNG sirve si lo vas a meter a un acrílico diseñado en Canva. Para pegarlo tal cual
        en la mesa, imprime desde aquí.
      </p>
    </section>
  )
}
