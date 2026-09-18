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
import Empresas from './pages/admin/Empresas'
import Reclutadores from './pages/admin/Reclutadores'
import Cupos from './pages/admin/Cupos'
import Pendientes from './pages/admin/Pendientes'
import Cambios from './pages/admin/Cambios'
import Cargando from './components/Cargando'

// SheetJS pesa medio megabyte. Se carga solo al abrir la importación, para que las
// pantallas del día del evento arranquen ligeras en un celular.
const Importar = lazy(() => import('./pages/admin/Importar'))

// La librería de QR tampoco tiene por qué viajar en el paquete principal.
const Qr = lazy(() => import('./pages/admin/Qr'))

import Impreso from './pages/admin/Impreso'

export default function App() {
  return (
    <BrowserRouter>
      <ProveedorSesion>
        <Routes>
          {/* Sin sesión: el reclutador entra por el QR de su mesa y el
              estudiante por el QR de la entrada. */}
          <Route path="/mesa" element={<Mesa />} />
          <Route path="/turno" element={<Turno />} />
          <Route path="/entrar" element={<Entrar />} />

          {/* Con la cuenta del equipo. */}
          <Route path="/host" element={<Protegida><Host /></Protegida>} />
          <Route path="/fila" element={<Protegida><Fila /></Protegida>} />
          <Route path="/admin" element={<Protegida><MarcoAdmin /></Protegida>}>
            <Route index element={<Tablero />} />
            <Route path="mesas" element={<Mesas />} />
            <Route path="empresas" element={<Empresas />} />
            <Route path="reclutadores" element={<Reclutadores />} />
            <Route path="cupos" element={<Cupos />} />
            <Route path="pendientes" element={<Pendientes />} />
            <Route path="cambios" element={<Cambios />} />
            <Route path="importar" element={<Suspense fallback={<Cargando />}><Importar /></Suspense>} />
            <Route path="qr" element={<Suspense fallback={<Cargando />}><Qr /></Suspense>} />
            <Route path="impreso" element={<Impreso />} />
          </Route>

          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </ProveedorSesion>
    </BrowserRouter>
  )
}
