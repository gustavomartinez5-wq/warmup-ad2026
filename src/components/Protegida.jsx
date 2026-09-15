import { Navigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import Cargando from './Cargando'

export default function Protegida({ children }) {
  const { sesion, cargando } = useSesion()
  if (cargando) return <Cargando />
  if (!sesion) return <Navigate to="/entrar" replace />
  return children
}
