import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase, edicionCompleta } from './supabase'

const Ctx = createContext(null)

/**
 * Una sola carga de datos para todo el admin. Las pantallas la comparten y
 * cualquiera puede pedir `recargar()` después de escribir.
 */
export function ProveedorDatos({ children }) {
  const [estado, setEstado] = useState({ cargando: true, error: null })
  const [edicion, setEdicion] = useState(null)
  const [empresas, setEmpresas] = useState([])
  const [reclutadores, setReclutadores] = useState([])
  const [carreras, setCarreras] = useState([])
  const [pendientes, setPendientes] = useState([])

  const recargar = useCallback(async () => {
    setEstado({ cargando: true, error: null })
    try {
      const ed = await edicionCompleta()
      if (!ed) throw new Error('No hay una edición activa en la base.')
      setEdicion(ed)

      const [e, r, c, pe] = await Promise.all([
        supabase.from('empresas')
          .select('*, empresa_carreras(siglas)')
          .eq('edicion_id', ed.id).order('nombre'),
        supabase.from('reclutadores')
          .select('*').eq('edicion_id', ed.id).order('mesa_numero', { nullsFirst: false }),
        supabase.from('carreras').select('*').order('siglas'),
        supabase.from('pendientes')
          .select('*, empresas(nombre)').eq('edicion_id', ed.id).order('creado_en'),
      ])
      for (const res of [e, r, c, pe]) if (res.error) throw res.error

      setEmpresas((e.data ?? []).map(x => ({
        ...x,
        carreras: (x.empresa_carreras ?? []).map(k => k.siglas).sort(),
      })))
      setReclutadores(r.data ?? [])
      setCarreras(c.data ?? [])
      setPendientes(pe.data ?? [])
      setEstado({ cargando: false, error: null })
    } catch (err) {
      setEstado({ cargando: false, error: err.message ?? String(err) })
    }
  }, [])

  useEffect(() => { recargar() }, [recargar])

  return (
    <Ctx.Provider value={{ ...estado, edicion, empresas, reclutadores, carreras, pendientes, recargar }}>
      {children}
    </Ctx.Provider>
  )
}

export const useDatos = () => useContext(Ctx)
