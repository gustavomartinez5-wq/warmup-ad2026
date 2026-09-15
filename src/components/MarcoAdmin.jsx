import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ProveedorDatos } from '../lib/datos'

const SECCIONES = [
  { a: '/admin',              t: 'Tablero',      fin: true },
  { a: '/admin/mesas',        t: 'Mapa de mesas' },
  { a: '/admin/empresas',     t: 'Empresas' },
  { a: '/admin/reclutadores', t: 'Reclutadores' },
  { a: '/admin/cupos',        t: 'Cupos' },
  { a: '/admin/pendientes',   t: 'Pendientes' },
  { a: '/admin/importar',     t: 'Importar Excel' },
]

export default function MarcoAdmin() {
  const navegar = useNavigate()

  async function salir() {
    await supabase.auth.signOut()
    navegar('/entrar', { replace: true })
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-lavanda/15 bg-marino/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 pt-3.5 pb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-cian font-semibold">CVDP</p>
            <h1 className="text-base font-extrabold leading-tight truncate">Warm Up AD2026</h1>
          </div>
          <button
            onClick={salir}
            className="text-xs text-lavanda/60 hover:text-white transition-colors shrink-0 pt-1"
          >
            Salir
          </button>
        </div>

        <nav className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto pb-px [scrollbar-width:none]">
          {SECCIONES.map(s => (
            <NavLink
              key={s.a} to={s.a} end={s.fin}
              className={({ isActive }) =>
                `shrink-0 px-3 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${
                  isActive
                    ? 'border-cian text-white'
                    : 'border-transparent text-lavanda/55 hover:text-lavanda'
                }`
              }
            >
              {s.t}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-5">
        <ProveedorDatos>
          <Outlet />
        </ProveedorDatos>
      </main>
    </div>
  )
}
