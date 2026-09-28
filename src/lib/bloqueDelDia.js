import { useCallback, useEffect, useState } from 'react'
import { bloquePorReloj } from './reloj'

/**
 * El bloque que se ve, siguiendo al reloj. Abre en el que toca (`bloquePorReloj`) y,
 * si la pantalla se queda abierta, pasa sola a Bloque 2 a la 13:30 del día del evento.
 *
 * Deja de seguir al reloj en cuanto alguien elige un bloque a mano: esa decisión
 * manda hasta que se recargue la página. Con `pausa` (editando el acomodo, llamando
 * un turno) no cambia, para no mover el piso a media acción; al terminar se pone al día.
 */
export function useBloqueDelDia({ pausa = false } = {}) {
  const [bloque, setBloque] = useState(bloquePorReloj)
  const [manual, setManual] = useState(false)

  useEffect(() => {
    if (manual || pausa) return
    const revisar = () => setBloque(bloquePorReloj())
    revisar()
    const id = setInterval(revisar, 30 * 1000)
    return () => clearInterval(id)
  }, [manual, pausa])

  const elegir = useCallback(b => { setManual(true); setBloque(b) }, [])
  return [bloque, elegir]
}
