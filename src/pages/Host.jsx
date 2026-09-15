import EnObra from '../components/EnObra'

/** La vista del equipo el día del evento. */
export default function Host() {
  return (
    <div className="min-h-dvh px-5 py-8 max-w-2xl mx-auto">
      <p className="text-[10px] uppercase tracking-[0.18em] text-cian font-semibold">CVDP</p>
      <h1 className="text-2xl font-extrabold leading-tight mt-1 mb-5">Warm Up AD2026</h1>
      <EnObra
        titulo="Vista de host"
        fase="4"
        que="Las mesas del bloque activo con su estado y el tiempo corriendo, con filtro por carrera y por giro para mandar estudiantes."
      />
    </div>
  )
}
