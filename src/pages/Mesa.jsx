import EnObra from '../components/EnObra'

/** La pantalla del reclutador. Sin login: se entra por el QR. */
export default function Mesa() {
  return (
    <div className="min-h-dvh px-5 py-8 max-w-md mx-auto">
      <p className="text-[10px] uppercase tracking-[0.18em] text-cian font-semibold">CVDP</p>
      <h1 className="text-2xl font-extrabold leading-tight mt-1 mb-5">Warm Up AD2026</h1>
      <EnObra
        titulo="Tu mesa"
        fase="3"
        que="Eliges tu número de mesa y llegas a tu pantalla: empresa, instrucciones y los cuatro botones de estado, con el cronómetro."
      />
    </div>
  )
}
