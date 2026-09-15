import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProveedorSesion } from './lib/sesion'
import Protegida from './components/Protegida'
import MarcoAdmin from './components/MarcoAdmin'

import Entrar from './pages/Entrar'
import Mesa from './pages/Mesa'
import Host from './pages/Host'

import Tablero from './pages/admin/Tablero'
import Mesas from './pages/admin/Mesas'
import Empresas from './pages/admin/Empresas'
import Reclutadores from './pages/admin/Reclutadores'
import Cupos from './pages/admin/Cupos'
import Pendientes from './pages/admin/Pendientes'
import Importar from './pages/admin/Importar'

export default function App() {
  return (
    <BrowserRouter>
      <ProveedorSesion>
        <Routes>
          {/* Sin sesión: el reclutador entra por aquí desde el QR. */}
          <Route path="/mesa" element={<Mesa />} />
          <Route path="/entrar" element={<Entrar />} />

          {/* Con la cuenta del equipo. */}
          <Route path="/host" element={<Protegida><Host /></Protegida>} />
          <Route path="/admin" element={<Protegida><MarcoAdmin /></Protegida>}>
            <Route index element={<Tablero />} />
            <Route path="mesas" element={<Mesas />} />
            <Route path="empresas" element={<Empresas />} />
            <Route path="reclutadores" element={<Reclutadores />} />
            <Route path="cupos" element={<Cupos />} />
            <Route path="pendientes" element={<Pendientes />} />
            <Route path="importar" element={<Importar />} />
          </Route>

          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </ProveedorSesion>
    </BrowserRouter>
  )
}
