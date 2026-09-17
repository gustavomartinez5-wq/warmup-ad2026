import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_KEY } from '../src/lib/config.js'

/**
 * Latido diario contra la base.
 *
 * Supabase pausa los proyectos del plan gratuito que pasan 7 días con poca
 * actividad. Del corte del registro al 28 de septiembre puede haber una semana
 * sin que nadie abra la app, y un proyecto pausado la mañana del evento sería
 * el peor momento para descubrirlo.
 *
 * Lo dispara el cron de `vercel.json`, una vez al día. Hace tres consultas
 * —no una— para que cuente como actividad de verdad, y solo lee.
 */
export default async function handler(_req, res) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const [edicion, carreras, mesas] = await Promise.all([
      supabase.from('ediciones').select('nombre, fecha').eq('activa', true).maybeSingle(),
      supabase.from('carreras').select('siglas', { count: 'exact', head: true }),
      supabase.rpc('mesas_publicas', { p_bloque: 'b1' }),
    ])

    const error = edicion.error ?? carreras.error ?? mesas.error
    if (error) throw error

    res.status(200).json({
      vivo: true,
      cuando: new Date().toISOString(),
      edicion: edicion.data?.nombre ?? null,
      fecha: edicion.data?.fecha ?? null,
      carreras: carreras.count ?? 0,
      mesasBloque1: (mesas.data ?? []).length,
    })
  } catch (e) {
    // 500 para que Vercel lo marque como fallo y quede visible en los registros.
    res.status(500).json({ vivo: false, cuando: new Date().toISOString(), error: String(e.message ?? e) })
  }
}
