export default function Cargando({ texto = 'Cargando…', error = null }) {
  if (error) {
    return (
      <div className="min-h-[50dvh] grid place-items-center px-5">
        <div className="max-w-sm text-center">
          <p className="text-sm text-rojo bg-rojo/10 border border-rojo/30 rounded-lg px-3 py-2">
            No se pudo cargar.
          </p>
          <p className="text-xs text-lavanda/45 mt-2 break-words">{String(error)}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-[50dvh] grid place-items-center">
      <p className="text-sm text-lavanda/60">{texto}</p>
    </div>
  )
}
