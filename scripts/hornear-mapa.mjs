/**
 * Hornea el mapa fijo del salón dentro de la app.
 *
 * Quién está en cada mesa no cambia durante el evento: se sabe desde días antes.
 * Guardarlo en el paquete deja que `/host` y `/mesa` pinten el salón completo
 * —números, empresas, giros, carreras y el buscador— aunque la base no conteste.
 * Lo vivo —el estado y el reloj— nunca se hornea: eso solo sale de Supabase.
 *
 *   node scripts/hornear-mapa.mjs              regenera src/datos/mapa-fijo.json
 *   node scripts/hornear-mapa.mjs --verificar   compara contra la base, sin escribir
 *
 * El archivo se commitea a propósito. Si se generara en el build de Vercel, un
 * despliegue con la base pausada publicaría un mapa vacío justo el día que hace falta.
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mesasDelBloque } from '../src/lib/mesaPublica.js'
import { catalogoDeCarreras } from '../src/lib/carreras.js'

const AQUI    = dirname(fileURLToPath(import.meta.url))
const DESTINO = join(AQUI, '..', 'src', 'datos', 'mapa-fijo.json')
const BLOQUES = ['b1', 'b2']

/** Se queda lo que no cambia. `estado` y `ocupado_desde` se tiran: son del día. */
const soloLoFijo = mesas => mesas.map(m => ({
  numero:   m.numero,
  empresa:  m.empresa,
  giro:     m.giro ?? null,
  carreras: [...(m.carreras ?? [])].sort(),
})).sort((a, b) => a.numero - b.numero)

async function traerDeLaBase() {
  const [b1, b2, carreras] = await Promise.all([
    mesasDelBloque('b1'),
    mesasDelBloque('b2'),
    catalogoDeCarreras(),
  ])
  return {
    bloques: { b1: soloLoFijo(b1), b2: soloLoFijo(b2) },
    carreras: [...carreras].sort((a, b) => a.siglas.localeCompare(b.siglas)),
  }
}

/** Compara sin la fecha: lo que importa es si cambió el salón, no cuándo se generó. */
const huella = m => JSON.stringify({ bloques: m.bloques, carreras: m.carreras })

function resumen(mapa) {
  return `${mapa.bloques.b1.length} mesas en Bloque 1, ` +
         `${mapa.bloques.b2.length} en Bloque 2, ` +
         `${mapa.carreras.length} carreras`
}

const vivo = await traerDeLaBase()

if (process.argv.includes('--verificar')) {
  if (!existsSync(DESTINO)) {
    console.error('No existe src/datos/mapa-fijo.json. Corre el script sin --verificar.')
    process.exit(1)
  }
  const horneado = JSON.parse(readFileSync(DESTINO, 'utf8'))

  if (huella(horneado) === huella(vivo)) {
    console.log(`Al día: ${resumen(vivo)}.`)
    console.log(`Horneado el ${new Date(horneado.generado_en).toLocaleString('es-MX')}.`)
    process.exit(0)
  }

  console.error('El mapa horneado ya no coincide con la base.')
  console.error(`  Horneado: ${resumen(horneado)}`)
  console.error(`  En la base: ${resumen(vivo)}`)
  for (const b of BLOQUES) {
    const antes = new Map(horneado.bloques[b].map(m => [m.numero, m]))
    for (const m of vivo.bloques[b]) {
      const a = antes.get(m.numero)
      if (!a) { console.error(`  ${b} mesa ${m.numero}: nueva, ${m.empresa}`); continue }
      if (a.empresa !== m.empresa) console.error(`  ${b} mesa ${m.numero}: ${a.empresa} → ${m.empresa}`)
      else if (JSON.stringify(a.carreras) !== JSON.stringify(m.carreras)) {
        console.error(`  ${b} mesa ${m.numero}: cambiaron las carreras de ${m.empresa}`)
      }
      antes.delete(m.numero)
    }
    for (const a of antes.values()) console.error(`  ${b} mesa ${a.numero}: ya no está, era ${a.empresa}`)
  }
  console.error('\nCorre `node scripts/hornear-mapa.mjs` para regenerarlo.')
  process.exit(1)
}

writeFileSync(DESTINO, JSON.stringify({ generado_en: new Date().toISOString(), ...vivo }, null, 2) + '\n')
console.log(`Horneado: ${resumen(vivo)}.`)
console.log('Queda en src/datos/mapa-fijo.json. Commitéalo.')
