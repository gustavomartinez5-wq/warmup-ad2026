import { Link } from 'react-router-dom'

/**
 * La importación del Excel está apagada desde el 22-sep.
 *
 * Importar borraba y volvía a insertar `reclutadores` con la columna Mesa del libro.
 * Desde que las mesas se acomodan en la app (`/admin/acomodo`), eso tiraría el
 * acomodo sin avisar. Las altas y bajas se hacen en la app. El lector sigue en
 * `src/lib/excel.js` y `src/lib/importar.js` por si hace falta volver; la versión
 * con el botón está en el historial de git.
 */
export default function Importar() {
  return (
    <section className="space-y-4 max-w-prose">
      <h2 className="text-xl font-extrabold">Importar Excel</h2>
      <div className="rounded-xl border border-ambar/40 bg-ambar/10 px-4 py-3 space-y-1.5">
        <p className="text-sm">La importación está apagada desde el 22 de septiembre.</p>
        <p className="text-xs text-lavanda/75 leading-relaxed">
          Las mesas ya no salen del Excel: se acomodan en la app. Importar reescribiría todas las
          mesas y se perdería el acomodo.
        </p>
      </div>
      <Link to="/admin/acomodo" className="inline-block text-sm font-semibold text-cian hover:text-white">
        Ir al acomodo de mesas
      </Link>
    </section>
  )
}
