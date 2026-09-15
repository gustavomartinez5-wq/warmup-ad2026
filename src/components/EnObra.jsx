/** Marcador de pantalla que todavía no se construye. Se borra al cerrar su fase. */
export default function EnObra({ titulo, fase, que }) {
  return (
    <section>
      <h2 className="text-xl font-extrabold">{titulo}</h2>
      <div className="mt-4 rounded-2xl border border-dashed border-lavanda/25 bg-marino-alto/40 px-5 py-8">
        <p className="text-xs uppercase tracking-widest text-ambar font-semibold">Fase {fase}</p>
        <p className="text-sm text-lavanda/75 mt-2 leading-relaxed max-w-prose">{que}</p>
      </div>
    </section>
  )
}
