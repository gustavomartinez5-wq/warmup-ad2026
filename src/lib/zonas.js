import { GIRO_PORTAFOLIO } from './cifras'

/**
 * Las zonas del salón, como en el acomodo del 24-sep: Big Names en la fila 1,
 * construcción y portafolio en las columnas A y B, y las demás áreas por columnas.
 * Las listas son las mismas que armaron esa propuesta, en el vault:
 * `Ediciones/WarmUp AD26/zonas/proponer-columnas.mjs`. Si una empresa cambia de
 * zona, se cambia en los dos lados.
 *
 * Es solo color: no mueve mesas. El Mapa abre en «Estado», porque el día del evento
 * el color de /host es el estado en vivo (DEC-019); «Zonas» es un botón aparte.
 * Una empresa que no está en ninguna lista cae en «Todas o varias carreras».
 */

/** En el orden en que se ven en el salón, de la columna A a la O. */
export const ZONAS = [
  { clave: 'big', nombre: 'Big Names',
    clase: 'bg-marino border-2 border-lavanda-suave text-white', fondo: '#0A1D38', borde: '#0A1D38', letra: '#FFFFFF' },
  { clave: 'aad', nombre: 'Construcción, arquitectura y portafolio',
    clase: 'bg-[#FDE7BF] border-[#B9770E] text-marino', fondo: '#FDE7BF', borde: '#B9770E', letra: '#0A1D38' },
  { clave: 'mix', nombre: 'Todas o varias carreras',
    clase: 'bg-white border-[#8A93A6] text-marino', fondo: '#FFFFFF', borde: '#8A93A6', letra: '#0A1D38' },
  { clave: 'neg', nombre: 'Negocios y finanzas',
    clase: 'bg-[#D6EDE9] border-[#07736B] text-marino', fondo: '#D6EDE9', borde: '#07736B', letra: '#0A1D38' },
  { clave: 'tec', nombre: 'Tecnología y datos',
    clase: 'bg-[#CCF3F6] border-[#008C96] text-marino', fondo: '#CCF3F6', borde: '#008C96', letra: '#0A1D38' },
  { clave: 'ing', nombre: 'Ingeniería',
    clase: 'bg-[#DCE3FF] border-[#0039A6] text-marino', fondo: '#DCE3FF', borde: '#0039A6', letra: '#0A1D38' },
]
const POR_CLAVE = Object.fromEntries(ZONAS.map(z => [z.clave, z]))

/**
 * Los 11 de la lista de Big Names que investigó Gustavo el 24-sep y que sí vienen.
 * OXXO entra por FEMSA y Viakable por Xignux.
 */
const BIG_NAMES = ['BBVA México', 'Cemex', 'Schneider Electric', 'Caterpillar México', 'Heineken México',
  'OXXO', 'Banamex', 'Viakable', 'Whirlpool', 'CHUBB', 'Ragasa']

/** Por lo que escribió cada reclutador y las carreras que se le etiquetaron. */
const POR_CARRERA = {
  tec: ['Apex Systems', 'CHUBB', 'Data IQ', 'Definity', 'SAP'],
  ing: ['Celestica', 'Clarios', 'EATON', 'GE Vernova', 'Johnson Controls', 'KATCON',
        'London Consulting Group', 'Ragasa', 'Ruhrpumpen', 'SLB', 'Whirlpool',
        'Schneider Electric', 'Calidra', 'Linde', 'ABB', 'Danfoss', 'Caterpillar México', 'VERTIV'],
  neg: ['BBVA México', 'Banamex', 'PwC', 'EY', 'Unitivida', 'Logrand', 'Capital Becarios',
        'Redwood Logistics', 'Iconn', 'OXXO'],
}

/** Construcción va por giro, no por carrera. */
const GIRO_CONSTRUCCION = 'Arquitectura y construcción'

export function zonaDe(empresa, giro) {
  if (BIG_NAMES.includes(empresa)) return POR_CLAVE.big
  if (giro === GIRO_PORTAFOLIO || giro === GIRO_CONSTRUCCION) return POR_CLAVE.aad
  for (const [clave, lista] of Object.entries(POR_CARRERA)) if (lista.includes(empresa)) return POR_CLAVE[clave]
  return POR_CLAVE.mix
}
