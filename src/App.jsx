import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProveedorSesion } from './lib/sesion'
import Protegida from './components/Protegida'
import MarcoAdmin from './components/MarcoAdmin'

import Entrar from './pages/Entrar'
import Mesa from './pages/Mesa'
import Turno from './pages/Turno'
import Host from './pages/Host'
import Fila from './pages/Fila'

import Tablero from './pages/admin/Tablero'
import Mesas from './pages/admin/Mesas'
import Reclutadores from './pages/admin/Reclutadores'
import Pendientes from './pages/admin/Pendientes'
import Cambios from './pages/admin/Cambios'
import Cargando from './components/Cargando'

// La librería de QR tampoco tiene por qué viajar en el paquete principal.
const Qr = lazy(() => import('./pages/admin/Qr'))

import Impreso from './pages/admin/Impreso'

export default function App() {
  return (
    <BrowserRouter>
      <ProveedorSesion>
        <Routes>
          {/* Sin sesión: el reclutador entra por el QR de su mesa, el
              estudiante por el QR de la entrada y el scout por su liga. */}
          <Route path="/mesa" element={<Mesa />} />
          <Route path="/turno" element={<Turno />} />
          {/* Los scouts ven el salón y cambian estados sin contraseña: es /host
              sin nada de edición, con las mismas funciones que /mesa. */}
          <Route path="/scout" element={<Host scout />} />
          <Route path="/entrar" element={<Entrar />} />

          {/* Con la cuenta del equipo. */}
          <Route path="/host" element={<Protegida><Host /></Protegida>} />
          <Route path="/fila" element={<Protegida><Fila /></Protegida>} />
          <Route path="/admin" element={<Protegida><MarcoAdmin /></Protegida>}>
            <Route index element={<Tablero />} />
            <Route path="mesas" element={<Mesas />} />
            <Route path="reclutadores" element={<Reclutadores />} />
            <Route path="pendientes" element={<Pendientes />} />
            <Route path="cambios" element={<Cambios />} />
            {/* Pantallas que salieron el 22-sep. El acomodo y la ficha de cada empresa
                viven en el Mapa de mesas; los cupos se llevan en un Excel aparte; la
                importación se apagó. Una liga guardada cae en el Mapa. */}
            {['acomodo', 'empresas', 'cupos', 'importar'].map(r => (
              <Route key={r} path={r} element={<Navigate to="/admin/mesas" replace />} />
            ))}
            <Route path="qr" element={<Suspense fallback={<Cargando />}><Qr /></Suspense>} />
            <Route path="impreso" element={<Impreso />} />
          </Route>

          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </ProveedorSesion>
    </BrowserRouter>
  )
}
