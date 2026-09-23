import { Link } from 'react-router-dom'
import { useDatos } from '../../lib/datos'
import { calcularCifras, faltan } from '../../lib/cifras'
import Cargando from '../../components/Cargando'
import EnlacesCompartir from '../../components/EnlacesCompartir'

function Cifra({ valor, etiqueta, nota, tono }) {
  const acento = {
    rojo:  'border-rojo/60',
    ambar: 'border-ambar/60',
    teal:  'border-teal/60',
  }[tono] ?? 'border-lavanda/15'
  return (
    <div className={`rounded-2xl border ${acento} bg-marino-alto/50 px-4 py-3.5`}>
      <p className="text-3xl font-extrabold cifra leading-none">{valor}</p>
      <p className="text-[13px] text-lavanda/80 mt-1.5 leading-tight">{etiqueta}</p>
      {nota && <p className="text-[11px] text-lavanda/45 mt-0.5 leading-tight">{nota}</p>}
    </div>
  )
}

export default function Tablero() {
  const datos = useDatos()
  if (datos.cargando || datos.error) return <Cargando error={datos.error} />

  const { edicion, empresas, reclutadores, pendientes } = datos
  const c = calcularCifras({ edicion, empresas, reclutadores })
  const vacio = empresas.length === 0

  const abiertos = pendientes.filter(p => !p.resuelto).length
  const sinCarreras = empresas.filter(e => (e.carreras ?? []).length === 0).length

  const dias = Math.ceil(
    (new Date(edicion.fecha + 'T00:00:00') - new Date(new Date().toDateString())) / 86400000
  )

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold">Tablero</h2>
        <p className="text-sm text-lavanda/60 mt-0.5">
          {edicion.nombre} · {new Date(edicion.fecha + 'T00:00:00')
            .toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {vacio && (
        <div className="rounded-2xl border border-ambar/50 bg-ambar/10 px-5 py-4">
          <p className="text-sm font-semibold">Todavía no hay datos</p>
          <p className="text-sm text-lavanda/75 mt-1">
            La base no tiene empresas en esta edición. Las altas se hacen en el{' '}
            <Link to="/admin/mesas" className="text-cian underline">Mapa de mesas</Link>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Cifra valor={dias > 0 ? dias : 0} etiqueta="Días para el evento" />
        <Cifra valor={c.empresas} etiqueta="Empresas registradas" />
        <Cifra valor={c.reclutadoresB1} etiqueta="Reclutadores Bloque 1" nota="10:00 a 13:00 h" />
        <Cifra valor={c.reclutadoresB2} etiqueta="Reclutadores Bloque 2" nota="14:00 a 17:00 h" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Cifra
          valor={`${c.mesasApartadas} de ${c.totalMesas}`}
          etiqueta="Mesas apartadas"
          nota={c.mesasLibres > 0 ? `Quedan ${c.mesasLibres} libres` : 'Sin mesas libres'}
        />
        <Cifra
          valor={c.mesasFaltantes}
          etiqueta="Mesas por conseguir"
          nota={c.mesasFaltantes > 0 ? `La más alta asignada es la ${c.mesaMasAlta}` : 'El salón alcanza'}
          tono={c.mesasFaltantes > 0 ? 'rojo' : undefined}
        />
        <Cifra
          valor={c.porConfirmar}
          etiqueta="Nombres por confirmar"
          tono={c.porConfirmar > 0 ? 'ambar' : undefined}
        />
        <Cifra valor={c.capacidad} etiqueta="Capacidad del evento" nota="atenciones" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Cifra
          valor={abiertos}
          etiqueta="Pendientes abiertos"
          nota={abiertos > 0 ? 'con empresas' : 'todo cerrado'}
          tono={abiertos > 0 ? 'ambar' : 'teal'}
        />
        <Cifra
          valor={sinCarreras}
          etiqueta="Empresas sin carreras"
          nota={sinCarreras > 0 ? 'el filtro no las encuentra' : 'todas etiquetadas'}
          tono={sinCarreras > 0 ? 'ambar' : 'teal'}
        />
      </div>

      {c.mesasFaltantes > 0 && (
        <div className="rounded-2xl border border-rojo/50 bg-rojo/10 px-5 py-4">
          <p className="text-sm font-semibold">
            En el salón {faltan(c.mesasFaltantes)}
          </p>
          <p className="text-sm text-lavanda/75 mt-1">
            Hay reclutadores asignados hasta la mesa {c.mesaMasAlta} y el salón tiene {c.totalMesas}.
            {' '}<Link to="/admin/mesas" className="text-cian underline">Ver el mapa</Link>.
          </p>
        </div>
      )}
      <EnlacesCompartir />
    </section>
  )
}
