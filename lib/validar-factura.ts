import type { EstadoFactura } from './types'

/**
 * Paraguay RUC format: 3–8 digits, dash, 1 check digit.
 * Also tolerates OCR noise like "80012345 - 1" (spaces around dash).
 */
const RUC_REGEX = /\b(\d{3,8})\s*[-–]\s*(\d{1})\b/

/**
 * Invoice number: 001-001-0000001 or 001 001 0000001 (OCR sometimes drops dashes)
 */
const NUMERO_FACTURA_REGEX = /\b(\d{3})[- ](\d{3})[- ](\d{7})\b/

/**
 * Date: dd/mm/yyyy or dd-mm-yyyy
 */
const FECHA_REGEX = /\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b/

/**
 * Paraguayan monetary amount — two patterns tried in order:
 *
 * 1. WITH explicit currency prefix (G, Gs, Gs.):
 *      "G 146,296"  "Gs. 1.500.000"
 *
 * 2. WITHOUT prefix — any standalone number that looks like an amount
 *    (bare integers or digit groups separated by dots/commas).
 *    Used when the label regex already confirmed we are on an amount line.
 *
 * Guaraní never has decimal cents, so commas and dots are ALWAYS thousands separators.
 */
const AMOUNT_WITH_PREFIX_REGEX = /G[sS$]?\.?\s*([\d][0-9.,\s]{0,19}[0-9]|[0-9]+)/
// Matches the LAST number-like token on a line (avoids grabbing label digits like "10%")
const AMOUNT_BARE_REGEX = /([\d]{1,3}(?:[.,]\d{3})+|\d{4,})\s*$/

/**
 * Cleans a raw amount string extracted by OCR.
 *
 * Paraguayan format uses DOT as thousands separator and COMMA as decimal separator.
 * Example: "1.500.000" → 1500000   "250.500,50" → 250500.50
 *
 * Heuristic: if there are multiple dots, they are ALL thousands separators.
 * If there is a single comma (possibly preceded by a dot group), it is the decimal separator.
 * Spaces inserted by OCR between digit groups are treated as thousands separators.
 */
function limpiarMonto(raw: string): number {
  // Remove currency prefix noise (G, Gs, G., Gs.)
  let s = raw.replace(/^G[sS$]?\.?\s*/i, '').trim()

  // Remove spaces OCR inserts between digit groups (e.g. "1 500 000")
  s = s.replace(/(\d)\s+(\d)/g, '$1$2')

  const dotCount = (s.match(/\./g) ?? []).length
  const commaCount = (s.match(/,/g) ?? []).length

  if (dotCount === 0 && commaCount === 1) {
    // Single comma: check digits AFTER the comma
    const [, afterComma] = s.split(',')
    if (afterComma && afterComma.length === 3) {
      // "146,296" → 3 digits after comma → Guaraní thousands separator → 146296
      s = s.replace(',', '')
    } else {
      // "146,29" or "146,2" → treat as decimal (exotic but safe fallback)
      s = s.replace(',', '.')
    }
  } else if (commaCount > 1) {
    // Multiple commas → all thousands separators (e.g. "1,500,000")
    s = s.replace(/,/g, '')
  } else if (dotCount > 1) {
    // Multiple dots → all thousands separators (e.g. "1.500.000")
    s = s.replace(/\./g, '')
  } else if (dotCount === 1 && commaCount === 1) {
    // "1.500,50" → dot=thousands, comma=decimal
    s = s.replace('.', '').replace(',', '.')
  } else if (dotCount === 1 && commaCount === 0) {
    // Single dot: "1.500" (thousands) vs "1.5" (decimal)
    const [, frac] = s.split('.')
    if (frac && frac.length === 3) s = s.replace('.', '') // thousands
    // else leave as decimal
  }

  return parseFloat(s) || 0
}

/** Extract a single amount from a line.
 *  Tries the prefixed regex (G/Gs prefix) first, then falls back to a bare
 *  trailing number so we can handle lines like "TOTAL DE LA OPERACIÓN684.400"
 *  or "TOTAL EN GUARANÍES684.400" where no currency symbol is present.
 */
function extraerMontoDeLinea(linea: string): number | null {
  // 1. Try explicit currency prefix
  const mPrefix = linea.match(AMOUNT_WITH_PREFIX_REGEX)
  if (mPrefix) {
    const val = limpiarMonto(mPrefix[1])
    if (val > 0) return val
  }

  // 2. Fall back to the last bare number on the line
  const mBare = linea.match(AMOUNT_BARE_REGEX)
  if (mBare) {
    const val = limpiarMonto(mBare[1])
    if (val > 0) return val
  }

  return null
}

/**
 * Find the first line matching a label regex and extract its amount.
 * Strategy (in order):
 *  1. Scan the matched line for a prefixed amount (G/Gs prefix)
 *  2. Scan the matched line for a bare trailing number
 *  3. Strip everything up to and including the label match, re-scan the remainder
 *     (handles "TOTAL DE LA OPERACIÓN684.400" where label+number are concatenated)
 *  4. Try the next line (OCR sometimes splits label and value onto separate lines)
 */
function buscarMonto(lines: string[], label: RegExp): number | null {
  for (let i = 0; i < lines.length; i++) {
    const linea = lines[i]
    if (!label.test(linea)) continue

    // 1 & 2: full line (handles "TOTAL: G 684.400" and "TOTAL684.400")
    const enMismaLinea = extraerMontoDeLinea(linea)
    if (enMismaLinea !== null) return enMismaLinea

    // 3: strip label prefix then re-try (handles "TOTAL DE LA OPERACIÓN684.400")
    const stripped = linea.replace(label, '').trim()
    if (stripped) {
      const enStripped = extraerMontoDeLinea(stripped)
      if (enStripped !== null) return enStripped
      // Also try just parsing stripped as a plain number
      const plainVal = limpiarMonto(stripped.split(/\s+/).pop() ?? '')
      if (plainVal > 0) return plainVal
    }

    // 4: next line
    if (i + 1 < lines.length) {
      const enSiguiente = extraerMontoDeLinea(lines[i + 1])
      if (enSiguiente !== null) return enSiguiente
    }
  }
  return null
}

export interface DatosExtraidos {
  ruc_emisor: string | null
  ruc_receptor: string | null
  numero_factura: string | null
  fecha_emision: string | null
  monto_total: number | null
  iva_10: number | null
  iva_5: number | null
  exentas: number | null
}

export interface ResultadoValidacion {
  datos: DatosExtraidos
  estado: EstadoFactura
  errores: string[]
}

export function extraerYValidar(texto: string): ResultadoValidacion {
  const errores: string[] = []

  // --- Normalize OCR artifacts ---
  // Replace common OCR confusions that break numeric parsing
  const textoNorm = texto
    .replace(/[Oo](?=\d)/g, '0') // letter O before digit → 0
    .replace(/(?<=\d)[Oo]/g, '0') // digit followed by letter O → 0
    .replace(/[lI](?=\d)/g, '1') // letter l/I before digit → 1
    .replace(/\$/g, 'S')          // $ sometimes OCR'd instead of Gs

  // --- Extract RUCs ---
  const allRucs = [...textoNorm.matchAll(new RegExp(RUC_REGEX.source, 'g'))].map(
    (m) => `${m[1]}-${m[2]}`,
  )
  const ruc_emisor = allRucs[0] ?? null
  const ruc_receptor = allRucs[1] ?? null

  if (!ruc_emisor) errores.push('RUC del emisor no encontrado')
  if (!ruc_receptor) errores.push('RUC del receptor no encontrado')

  // --- Extract invoice number ---
  const matchNumero = textoNorm.match(NUMERO_FACTURA_REGEX)
  const numero_factura = matchNumero
    ? `${matchNumero[1]}-${matchNumero[2]}-${matchNumero[3]}`
    : null
  if (!numero_factura) errores.push('Número de factura no encontrado')

  // --- Extract date ---
  const matchFecha = textoNorm.match(FECHA_REGEX)
  const fecha_emision = matchFecha ? matchFecha[0] : null
  if (!fecha_emision) errores.push('Fecha de emisión no encontrada')

  // --- Extract amounts ---
  const lines = textoNorm.split('\n')

  const iva_10 = buscarMonto(lines, /iva.*10|10.*%.*iva|iva.*\(10|liquid.*10/i)
  const iva_5  = buscarMonto(lines, /iva.*5\b|5\b.*%.*iva|iva.*\(5|liquid.*5\b/i)
  const exentas = buscarMonto(lines, /exent/i)

  // Try most-specific TOTAL labels first (avoids matching SUB-TOTAL or partial lines).
  // Priority: "TOTAL DE LA OPERACIÓN" / "TOTAL EN GUARANÍES" > "TOTAL A PAGAR" > bare "TOTAL"
  const monto_total =
    buscarMonto(lines, /total\s+(?:de\s+la\s+operaci[oó]n|en\s+guaran[ií]es)/i) ??
    buscarMonto(lines, /total\s*(?:a\s*pagar|factura|general)/i) ??
    buscarMonto(lines, /importe\s*total|total\s*importe/i) ??
    buscarMonto(lines, /^\s*total[\s:]/i)

  if (monto_total === null) errores.push('Monto total no encontrado')

  // --- Determine estado ---
  let estado: EstadoFactura
  if (errores.length === 0) {
    estado = 'valida'
  } else if (errores.length <= 2) {
    estado = 'pendiente'
  } else {
    estado = 'invalida'
  }

  return {
    datos: {
      ruc_emisor,
      ruc_receptor,
      numero_factura,
      fecha_emision,
      monto_total,
      iva_10,
      iva_5,
      exentas,
    },
    estado,
    errores,
  }
}
