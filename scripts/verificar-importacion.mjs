/**
 * Verificación de la importación contra el Excel de control.
 *
 * Corre el MISMO código que el navegador —`src/lib/excel.js`, `src/lib/importar.js`
 * y `src/lib/cifras.js`— sobre el libro real, y compara las cifras que salen contra
 * las del Tablero del Excel.
 *
 *   node scripts/verificar-importacion.mjs "<ruta al .xlsx>" [--aplicar]
 *
 * Sin `--aplicar` solo lee y compara: no toca la base.
 * El libro nunca se escribe, y este script no imprime datos de personas.
 */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { leerLibro } from '../src/lib/excel.js'
import { compararImportacion, aplicarImportacion } from '../src/lib/importar.js'
import { calcularCifras } from '../src/lib/cifras.js'
import { supabase, edicionCompleta } from '../src/lib/supabase.js'

// Lo que dice el Tablero del Excel al corte del 15-sep-2026.
const ESPERADO = {
  empresas:       54,
  reclutadoresB1: 71,
  reclutadoresB2: 48,
  mesasApartadas: 71,
  capacidad:      714,
  porConfirmar:   10,
}

const rutaArg = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null
const ruta = rutaArg ??
  join(homedir(), 'Downloads', 'WarmUp AD26 - Control de Mesas y Cupos.xlsx')
const aplicar = process.argv.includes('--aplicar')

const correo = process.env.WARMUP_CORREO
const clave  = process.env.WARMUP_CLAVE
if (!correo || !clave) {
  console.error('Faltan WARMUP_CORREO y WARMUP_CLAVE en el entorno.')
  process.exit(1)
}

const marca = ok => (ok ? 'ok  ' : 'MAL ')

console.log(`Libro: ${ruta}\n`)
const libro = leerLibro(new Uint8Array(readFileSync(ruta)))

console.log(`Leídas ${libro.empresas.length} empresas y ${libro.reclutadores.length} filas de reclutador.`)
if (libro.avisos.length) {
  console.log('\nAvisos del lector:')
  for (const a of libro.avisos) console.log('  -', a)
}

const { error: errEntrar } = await supabase.auth.signInWithPassword({
  email: correo, password: clave,
})
if (errEntrar) { console.error('No entró:', errEntrar.message); process.exit(1) }

const edicion = await edicionCompleta()

if (aplicar) {
  const { data: empresasAntes } = await supabase.from('empresas')
    .select('*').eq('edicion_id', edicion.id)
  const { data: recAntes } = await supabase.from('reclutadores')
    .select('*').eq('edicion_id', edicion.id)

  const comp = compararImportacion({
    empresasActuales: empresasAntes ?? [],
    reclutadoresActuales: recAntes ?? [],
    libro,
  })
  console.log(`\nAltas ${comp.altas.length} · cambios ${comp.cambios.length} · ` +
              `sin cambio ${comp.sinTocar.length} · ya no vienen ${comp.bajas.length}`)

  const pasos = await aplicarImportacion({ edicionId: edicion.id, libro })
  console.log('Aplicado:', pasos.join(' · '))
}

// Se leen de vuelta desde la base: lo que se compara es lo que quedó guardado.
const { data: empresas } = await supabase.from('empresas')
  .select('id, nombre').eq('edicion_id', edicion.id)
const { data: reclutadores } = await supabase.from('reclutadores')
  .select('bloque, estatus, mesa_numero, nombre').eq('edicion_id', edicion.id)

const c = calcularCifras({ edicion, empresas: empresas ?? [], reclutadores: reclutadores ?? [] })

console.log('\nCifras de la app contra el Tablero del Excel:\n')
let todoBien = true
for (const [campo, esperado] of Object.entries(ESPERADO)) {
  const ok = c[campo] === esperado
  todoBien &&= ok
  console.log(`  ${marca(ok)} ${campo.padEnd(16)} app ${String(c[campo]).padStart(4)}   excel ${String(esperado).padStart(4)}`)
}

console.log(`\n  --   mesasLibres      ${c.mesasLibres}`)
console.log(`  --   mesasFaltantes   ${c.mesasFaltantes}`)
console.log(`  --   sinNombre        ${c.sinNombre}`)
console.log(`  --   sinMesa          ${c.sinMesa}`)

await supabase.auth.signOut()
console.log(todoBien ? '\nCuadra todo.' : '\nHay cifras que no cuadran.')
process.exit(todoBien ? 0 : 1)
