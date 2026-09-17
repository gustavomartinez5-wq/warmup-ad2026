/**
 * Las cifras del evento, calculadas igual que el Tablero del Excel.
 *
 * Las fórmulas originales, para que se pueda comparar:
 *   Empresas registradas  = COUNTIF(Empresas!B:B,"?*") - COUNTIF(Empresas!B:B,"TOTAL")
 *   Reclutadores Bloque N = COUNTIFS(Reclutadores!B:B,"Bloque N", Reclutadores!F:F,"<>Cancelado")
 *   Mesas a apartar       = MAX(reclutadores B1, reclutadores B2)
 *   Nombres por confirmar = COUNTIF(Reclutadores!F:F,"Por confirmar")
 *   Capacidad             = reclutadores x atenciones_por_hora x 3 franjas, por bloque
 */

export const BLOQUES = [
  { clave: 'b1', nombre: 'Bloque 1', horario: '10:00 a 13:00 h' },
  { clave: 'b2', nombre: 'Bloque 2', horario: '14:00 a 17:00 h' },
]

export const etiquetaBloque = b => (b === 'b1' ? 'Bloque 1' : 'Bloque 2')

/**
 * El giro con el que entran los expertos de portafolio de EAAD. No reclutan:
 * revisan portafolio creativo. Se reconocen por el giro y no por el número de
 * mesa, para que la etiqueta siga siendo cierta si esas mesas se mueven.
 */
export const GIRO_PORTAFOLIO = 'Revisión de portafolio'

/** Un reclutador cancelado no ocupa lugar ni cuenta para la capacidad. */
const vivos = reclutadores => reclutadores.filter(r => r.estatus !== 'cancelado')

export function calcularCifras({ edicion, empresas, reclutadores }) {
  const activos = vivos(reclutadores)
  const porBloque = Object.fromEntries(
    BLOQUES.map(b => [b.clave, activos.filter(r => r.bloque === b.clave)])
  )

  // Una mesa física sirve a los dos bloques: se cuentan las distintas, no las filas.
  const mesasUsadas = new Set(
    activos.map(r => r.mesa_numero).filter(n => n !== null && n !== undefined)
  )
  const mesaMasAlta = mesasUsadas.size ? Math.max(...mesasUsadas) : 0
  const total = edicion?.total_mesas ?? 0

  return {
    empresas:        empresas.length,
    reclutadoresB1:  porBloque.b1.length,
    reclutadoresB2:  porBloque.b2.length,

    mesasApartadas:  mesasUsadas.size,
    totalMesas:      total,
    mesasLibres:     Math.max(0, total - mesasUsadas.size),
    // Mesas asignadas con un número que el salón todavía no tiene.
    mesasFaltantes:  Math.max(0, mesaMasAlta - total),
    mesaMasAlta,

    porConfirmar:    activos.filter(r => r.estatus === 'por_confirmar').length,
    sinNombre:       activos.filter(r => esPorDefinir(r.nombre)).length,
    sinMesa:         activos.filter(r => r.mesa_numero === null || r.mesa_numero === undefined).length,

    capacidad:       capacidadTotal(edicion, porBloque),
  }
}

export const esPorDefinir = nombre => !nombre || /por definir/i.test(nombre)

/** «falta 1 mesa» / «faltan 2 mesas». */
export const faltan = n => (n === 1 ? 'falta 1 mesa' : `faltan ${n} mesas`)

/** Cada bloque son tres horas, y cada reclutador atiende N por hora. */
function capacidadTotal(edicion, porBloque) {
  const porHora = edicion?.atenciones_por_hora ?? 2
  return BLOQUES.reduce((suma, b) => suma + porBloque[b.clave].length * porHora * 3, 0)
}

/**
 * Las seis franjas con su cupo, igual que la hoja Cupos.
 * El registro de estudiantes no se captura en la app: se teclea el número.
 */
export function calcularCupos({ edicion, reclutadores, registros = [] }) {
  const porHora  = edicion?.atenciones_por_hora ?? 2
  const propCv   = Number(edicion?.prop_cv ?? 0.6)
  const activos  = vivos(reclutadores)

  return registros.map(fila => {
    const cuantos  = activos.filter(r => r.bloque === fila.bloque).length
    const capacidad = cuantos * porHora
    const cupoCv    = Math.round(capacidad * propCv)
    const usados    = (fila.registro_cv ?? 0) + (fila.registro_entrevista ?? 0)
    const ocupado   = capacidad ? usados / capacidad : 0

    return {
      ...fila,
      reclutadores:     cuantos,
      capacidad,
      cupoCv,
      cupoEntrevista:   capacidad - cupoCv,
      disponible:       Math.max(0, capacidad - usados),
      porcentajeOcupado: ocupado,
      semaforo:         ocupado >= 0.95 ? 'lleno' : ocupado >= 0.7 ? 'por_cerrar' : 'abierto',
    }
  })
}

/**
 * El estado de apartado de cada mesa en un bloque. No es el estado en vivo del
 * día del evento: es si la mesa está tomada, tomada sin nombre, libre o excedente.
 */
export function mapaDeMesas({ edicion, reclutadores, bloque }) {
  const total = edicion?.total_mesas ?? 0
  const activos = vivos(reclutadores).filter(r => r.bloque === bloque)

  const porMesa = new Map()
  for (const r of activos) {
    if (r.mesa_numero !== null && r.mesa_numero !== undefined) porMesa.set(r.mesa_numero, r)
  }

  const mayor = Math.max(total, ...[...porMesa.keys()], 0)

  return Array.from({ length: mayor }, (_, i) => {
    const numero = i + 1
    const r = porMesa.get(numero)
    const excedente = numero > total

    let estado
    if (excedente)                  estado = 'excedente'
    else if (!r)                    estado = 'libre'
    else if (esPorDefinir(r.nombre)) estado = 'sin_nombre'
    else                            estado = 'completa'

    return { numero, reclutador: r ?? null, estado, excedente }
  })
}

export const ESTADO_MESA = {
  completa:   { texto: 'Completa',  clase: 'bg-teal/25 border-teal text-white' },
  sin_nombre: { texto: 'Sin nombre', clase: 'bg-ambar/20 border-ambar text-white' },
  libre:      { texto: 'Libre',     clase: 'bg-lavanda/8 border-lavanda/25 text-lavanda/60' },
  excedente:  { texto: 'Falta la mesa', clase: 'bg-rojo/25 border-rojo text-white' },
}
