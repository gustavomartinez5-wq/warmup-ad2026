import * as XLSX from 'xlsx'

/**
 * Lectura del libro de control `WarmUp AD26 - Control de Mesas y Cupos.xlsx`.
 *
 * El libro manda hasta el día del evento. Aquí solo se lee: nunca se escribe.
 *
 * Trampa conocida: el campo "cantidad de personas" del Forms casi nunca coincide con la
 * lista de nombres. Por eso no se toca esa columna. Lo que se cuenta son filas de la hoja
 * Reclutadores, una por persona por bloque.
 */

// En las tres hojas el encabezado está en la fila 4 y los datos arrancan en la 5.
const FILA_ENCABEZADO = 4

const HOJAS = {
  reclutadores: 'Reclutadores',
  empresas:     'Empresas',
  catalogo:     'Catálogo de Empresas',
}

const BLOQUE = { 'bloque 1': 'b1', 'bloque 2': 'b2' }
const ESTATUS = {
  'confirmado':    'confirmado',
  'por confirmar': 'por_confirmar',
  'cancelado':     'cancelado',
}

const texto = v => (v === null || v === undefined ? '' : String(v).trim())

/** El Excel usa «—» y «N/A» para decir "nada". Se tratan como vacío. */
function textoOpcional(v) {
  const t = texto(v)
  if (!t || t === '—' || t === '-' || t.toLowerCase() === 'n/a') return null
  return t
}

function entero(v) {
  const n = parseInt(texto(v), 10)
  return Number.isFinite(n) ? n : null
}

/** Las hojas traen encabezado en la fila 4, así que se leen crudas y se arma el objeto. */
function filas(libro, nombreHoja) {
  const hoja = libro.Sheets[nombreHoja]
  if (!hoja) throw new Error(`El libro no trae la hoja «${nombreHoja}».`)

  const matriz = XLSX.utils.sheet_to_json(hoja, { header: 1, raw: false, defval: null })
  const encabezado = (matriz[FILA_ENCABEZADO - 1] ?? []).map(texto)

  return matriz.slice(FILA_ENCABEZADO)
    .map(fila => Object.fromEntries(encabezado.map((col, i) => [col, fila?.[i] ?? null])))
    .filter(obj => Object.values(obj).some(v => texto(v)))
}

export function leerLibro(buffer) {
  const libro = XLSX.read(buffer, { type: 'array' })

  const faltantes = Object.values(HOJAS).filter(h => !libro.Sheets[h])
  if (faltantes.length) {
    throw new Error(`Al libro le faltan estas hojas: ${faltantes.join(', ')}.`)
  }

  // ── Catálogo: áreas y perfiles, tal como los escribió la empresa ──────────
  const catalogo = new Map()
  for (const f of filas(libro, HOJAS.catalogo)) {
    const nombre = texto(f['Empresa'])
    if (!nombre || nombre === 'TOTAL') continue
    catalogo.set(nombre, {
      areas_texto:    textoOpcional(f['Áreas que recluta']),
      perfiles_texto: textoOpcional(f['Perfiles o programas']),
    })
  }

  // ── Empresas: contacto y notas. La fila TOTAL no es una empresa ───────────
  const empresas = []
  for (const f of filas(libro, HOJAS.empresas)) {
    const nombre = texto(f['Empresa'])
    if (!nombre || nombre === 'TOTAL') continue
    empresas.push({
      nombre,
      giro:          textoOpcional(f['Giro']),
      representante: textoOpcional(f['Representante']),
      correo:        textoOpcional(f['Correo']),
      celular:       textoOpcional(f['Celular']),
      notas:         textoOpcional(f['Notas']),
      ...(catalogo.get(nombre) ?? { areas_texto: null, perfiles_texto: null }),
    })
  }

  // ── Reclutadores: una fila por persona por bloque, con su mesa ────────────
  const reclutadores = []
  const avisos = []
  for (const [i, f] of filas(libro, HOJAS.reclutadores).entries()) {
    const empresa = texto(f['Empresa'])
    if (!empresa || empresa === 'TOTAL') continue

    const bloqueCrudo = texto(f['Bloque']).toLowerCase()
    const bloque = BLOQUE[bloqueCrudo]
    if (!bloque) {
      avisos.push(`Fila ${i + FILA_ENCABEZADO + 1} de Reclutadores: bloque «${texto(f['Bloque'])}» no se entiende. Se omite.`)
      continue
    }

    const estatus = ESTATUS[texto(f['Estatus']).toLowerCase()] ?? 'por_confirmar'

    reclutadores.push({
      empresa,
      nombre:      texto(f['Reclutador']) || 'Por definir',
      bloque,
      estatus,
      mesa_numero: entero(f['Mesa']),
      notas:       textoOpcional(f['Notas']),
    })
  }

  // Empresas que aparecen en Reclutadores pero no en la hoja Empresas.
  const nombresEmpresa = new Set(empresas.map(e => e.nombre))
  for (const nombre of new Set(reclutadores.map(r => r.empresa))) {
    if (!nombresEmpresa.has(nombre)) {
      avisos.push(`«${nombre}» tiene reclutadores pero no está en la hoja Empresas.`)
    }
  }

  // Dos personas en la misma mesa y el mismo bloque: la base no lo permite.
  const vistas = new Set()
  for (const r of reclutadores) {
    if (r.mesa_numero === null) continue
    const llave = `${r.bloque}-${r.mesa_numero}`
    if (vistas.has(llave)) {
      avisos.push(`La mesa ${r.mesa_numero} está repetida en ${r.bloque === 'b1' ? 'Bloque 1' : 'Bloque 2'}.`)
    }
    vistas.add(llave)
  }

  return { empresas, reclutadores, avisos }
}
