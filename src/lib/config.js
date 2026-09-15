/**
 * Conexión a Supabase.
 *
 * La clave publicable está pensada para ir en el navegador: se lee igual desde el
 * paquete compilado que desde aquí. Lo que protege los datos son las políticas RLS,
 * no esconder esta cadena. Por eso va en el código, como respaldo: así un despliegue
 * no se cae por una variable de entorno que faltó.
 *
 * Las variables de entorno mandan cuando existen, para poder apuntar a otra base
 * sin tocar el código.
 */
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://vaowqzodsivdeqbqpcrn.supabase.co'

export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_g9M5sOz91Lp-K30Y7o3bfQ_ZdLtiiP8'
