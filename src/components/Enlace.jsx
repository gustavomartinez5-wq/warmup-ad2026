/**
 * El semáforo de la conexión en vivo.
 *
 * Sin esto, si el websocket se cae la pantalla se ve idéntica y solo deja de
 * actualizarse. El síntoma es una pantalla que parece congelada, y la reacción
 * natural es machacar recargar —que abre otra conexión y empeora el problema.
 * Más vale decirlo.
 */
const PINTA = {
  conectando: { punto: 'bg-lavanda/50',       texto: 'Conectando…',   clase: 'text-lavanda/50' },
  vivo:       { punto: 'bg-teal',             texto: 'En vivo',       clase: 'text-teal' },
  caido:      { punto: 'bg-rojo animate-pulse', texto: 'Sin conexión', clase: 'text-rojo' },
}

export default function Enlace({ estado, alReconectar }) {
  const p = PINTA[estado] ?? PINTA.conectando
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
      <span className={`w-2 h-2 rounded-full shrink-0 ${p.punto}`} />
      <span className={p.clase}>{p.texto}</span>
      {estado === 'caido' && alReconectar && (
        <button onClick={alReconectar} className="text-cian underline underline-offset-2">
          reconectar
        </button>
      )}
    </span>
  )
}
