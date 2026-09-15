import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSesion } from '../lib/sesion'

export default function Entrar() {
  const { sesion } = useSesion()
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState(null)
  const [entrando, setEntrando] = useState(false)

  if (sesion) return <Navigate to="/admin" replace />

  async function enviar(e) {
    e.preventDefault()
    setEntrando(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: correo, password: clave })
    if (error) setError('Ese correo y esa contraseña no coinciden.')
    setEntrando(false)
  }

  return (
    <div className="min-h-dvh grid place-items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-cian font-semibold">CVDP</p>
          <h1 className="text-3xl font-extrabold leading-tight mt-1">Warm Up AD2026</h1>
          <p className="text-sm text-lavanda/70 mt-2">28 de septiembre de 2026</p>
        </div>

        <form onSubmit={enviar} className="space-y-3">
          <div>
            <label htmlFor="correo" className="block text-xs text-lavanda/70 mb-1.5">Correo</label>
            <input
              id="correo" type="email" required autoComplete="username"
              value={correo} onChange={e => setCorreo(e.target.value)}
              className="w-full rounded-xl bg-marino-alto/70 border border-lavanda/20 px-3.5 py-3 text-[15px]
                         placeholder-lavanda/30 outline-none focus:border-cian focus:ring-2 focus:ring-cian/30"
            />
          </div>
          <div>
            <label htmlFor="clave" className="block text-xs text-lavanda/70 mb-1.5">Contraseña</label>
            <input
              id="clave" type="password" required autoComplete="current-password"
              value={clave} onChange={e => setClave(e.target.value)}
              className="w-full rounded-xl bg-marino-alto/70 border border-lavanda/20 px-3.5 py-3 text-[15px]
                         placeholder-lavanda/30 outline-none focus:border-cian focus:ring-2 focus:ring-cian/30"
            />
          </div>

          {error && (
            <p className="text-sm text-rojo bg-rojo/10 border border-rojo/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit" disabled={entrando}
            className="w-full rounded-xl bg-tec hover:bg-tec-claro disabled:opacity-50
                       py-3.5 font-bold text-[15px] transition-colors"
          >
            {entrando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-xs text-lavanda/40 mt-6 leading-relaxed">
          Esta pantalla es para el equipo del CVDP. Los reclutadores entran por el QR de su mesa,
          sin contraseña.
        </p>
      </div>
    </div>
  )
}
