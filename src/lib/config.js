/**
 * Conexión a Supabase.
 *
 * La clave publicable está pensada para ir en el navegador: se lee igual desde el
 * paquete compilado que desde aquí. Lo que protege los datos son las políticas RLS,
 * no esconder esta cadena. Por eso va en el código, como respaldo: así un despliegue
 * no se cae por una variable de entorno que faltó.
 *
 * Las variables de entorno mandan cuando existen, para poder apuntar a otra base
 * sin tocar el código. El `?.` permite además importar este módulo desde Node, donde
 * `import.meta.env` no existe: así los scripts de verificación corren el mismo código
 * que el navegador.
 */
export const SUPABASE_URL =
  import.meta.env?.VITE_SUPABASE_URL || 'https://vaowqzodsivdeqbqpcrn.supabase.co'

export const SUPABASE_KEY =
  import.meta.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_g9M5sOz91Lp-K30Y7o3bfQ_ZdLtiiP8'

/**
 * `?sinbase=1` finge que Supabase no contesta. Existe para poder probar el modo
 * de datos fijos desde un celular en el preflight, sin herramientas de
 * desarrollador. No es una pantalla aparte: hace fallar las mismas llamadas que
 * fallarían de verdad, así que lo que se ve es exactamente lo que se vería.
 */
export const sinBase = () => {
  try { return new URLSearchParams(globalThis.location?.search ?? '').has('sinbase') }
  catch { return false }
}
