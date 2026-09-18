// Aviso al celular cuando llega el turno.
//
// En iPhone las notificaciones web solo llegan si la persona instaló la página
// en su pantalla de inicio, así que no dependemos de ellas. Lo que sí funciona
// en todos los teléfonos: la pantalla abierta que cambia sola, más sonido.
// La vibración es de Android; en iPhone el navegador la ignora.

let audioCtx = null

// Se llama desde un toque de la persona. Los navegadores solo dejan crear o
// reanudar el audio dentro de un gesto; si no, el sonido después no suena.
export function prepararAlerta() {
  try {
    const Ctx = window.AudioContext ?? window.webkitAudioContext
    if (!Ctx) return
    if (!audioCtx) audioCtx = new Ctx()
    if (audioCtx.state === 'suspended') audioCtx.resume()
  } catch { /* sin audio disponible: el aviso visual sigue funcionando */ }
}

function beep(inicio, duracion = 0.18, freq = 880) {
  const osc  = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, inicio)
  // Rampa corta en la salida para que no truene al cortar.
  gain.gain.setValueAtTime(0.0001, inicio)
  gain.gain.exponentialRampToValueAtTime(0.35, inicio + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion)
  osc.connect(gain).connect(audioCtx.destination)
  osc.start(inicio)
  osc.stop(inicio + duracion + 0.02)
}

export function sonarAlerta() {
  try {
    if (audioCtx?.state === 'suspended') audioCtx.resume()
    if (audioCtx) {
      const t = audioCtx.currentTime
      beep(t + 0.00, 0.18, 880)
      beep(t + 0.28, 0.18, 1175)
      beep(t + 0.56, 0.32, 880)
    }
  } catch { /* ignora */ }

  try { navigator.vibrate?.([300, 120, 300, 120, 500]) } catch { /* ignora */ }
}

// Evita que la pantalla se apague mientras la persona espera su turno.
// Devuelve una función para soltarlo. Safari lo soporta desde iOS 16.4; donde
// no exista, la persona simplemente vuelve a prender la pantalla.
export function mantenerPantallaEncendida() {
  let sentinel = null
  let vivo     = true

  async function pedir() {
    try {
      if (!vivo || !navigator.wakeLock) return
      sentinel = await navigator.wakeLock.request('screen')
    } catch { /* el navegador lo negó: no es crítico */ }
  }

  // El sistema suelta el bloqueo al ocultar la pestaña; se vuelve a pedir.
  function alVolver() {
    if (document.visibilityState === 'visible') pedir()
  }

  pedir()
  document.addEventListener('visibilitychange', alVolver)

  return () => {
    vivo = false
    document.removeEventListener('visibilitychange', alVolver)
    try { sentinel?.release() } catch { /* ignora */ }
  }
}
