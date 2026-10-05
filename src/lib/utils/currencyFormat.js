/**
 * MOTOR DE REGLAS DE MONEDA Y FORMATEO NUMÉRICO (Bs. vs. Usd.)
 * Sistema América — Radio Service ERP
 *
 * Reglas estrictas para Bolivia (AMERICA SISTEMAS DE COMUNICACIÓN KEMLO SRL):
 * - Bolivianos: "Bs. X.XXX,XX.-", "Importe Literal: [...] con XX/100 Bolivianos."
 * - Dólares:    "Usd. X.XXX,XX.-", "Importe Literal: [...] XX/100 dólares americanos."
 *   + Cláusula cambiaria obligatoria para Usd.
 */

// Unidades básicas
const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const DIEZ_A_DIECINUEVE = [
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE',
  'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'
];
const VEINTES = [
  'VEINTE', 'VEINTIUNO', 'VEINTIDOS', 'VEINTITRES', 'VEINTICUATRO',
  'VEINTICINCO', 'VEINTISEIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'
];
const DECENAS = [
  '', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA',
  'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'
];
const CENTENAS = [
  '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS',
  'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'
];

function convertirGrupo3(n) {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';

  const c = Math.floor(n / 100);
  const d = Math.floor((n % 100) / 10);
  const u = n % 10;

  let texto = '';

  // Centenas
  if (c > 0) {
    texto += CENTENAS[c] + ' ';
  }

  // Decenas y unidades
  const du = n % 100;
  if (du >= 10 && du <= 19) {
    texto += DIEZ_A_DIECINUEVE[du - 10];
  } else if (du >= 20 && du <= 29) {
    texto += VEINTES[du - 20];
  } else {
    if (d > 0) {
      texto += DECENAS[d];
      if (u > 0) texto += ' Y ' + UNIDADES[u];
    } else if (u > 0) {
      texto += UNIDADES[u];
    }
  }

  return texto.trim();
}

/**
 * Convierte un número entero positivo (hasta 999,999,999) a letras en español
 */
export function numeroEnPalabras(num) {
  const n = Math.floor(Math.abs(Number(num) || 0));
  if (n === 0) return 'CERO';

  const millones = Math.floor(n / 1000000);
  const miles = Math.floor((n % 1000000) / 1000);
  const unidades = n % 1000;

  let resultado = '';

  if (millones > 0) {
    if (millones === 1) {
      resultado += 'UN MILLON ';
    } else {
      resultado += convertirGrupo3(millones) + ' MILLONES ';
    }
  }

  if (miles > 0) {
    if (miles === 1) {
      resultado += 'MIL ';
    } else {
      resultado += convertirGrupo3(miles) + ' MIL ';
    }
  }

  if (unidades > 0) {
    resultado += convertirGrupo3(unidades);
  }

  return resultado.trim();
}

/**
 * Normaliza la clave de moneda
 * @param {string} currency 'BOB' | 'USD' | 'Bs' | 'Usd'
 * @returns {'BOB' | 'USD'}
 */
export function normalizeCurrency(currency = 'BOB') {
  const upper = String(currency || 'BOB').toUpperCase().trim();
  if (upper === 'USD' || upper === 'DOLAR' || upper === 'DOLARES' || upper.includes('USD')) {
    return 'USD';
  }
  return 'BOB';
}

/**
 * Formatea el número con puntos de miles y comas decimales
 * Ej: 2520.5 -> "2.520,50"
 */
export function formatNumberBolivia(amount) {
  const num = Math.abs(Number(amount) || 0);
  const entero = Math.floor(num);
  const centavos = Math.round((num - entero) * 100);
  const centavosStr = centavos.toString().padStart(2, '0');

  // Separador de miles con punto
  const enteroStr = entero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${enteroStr},${centavosStr}`;
}

/**
 * Formatea el monto con prefijo y sufijo oficial
 * - BOB: "Bs. 2.520,00.-"
 * - USD: "Usd. 360,00.-"
 */
export function formatCurrency(amount, currency = 'BOB') {
  const norm = normalizeCurrency(currency);
  const numStr = formatNumberBolivia(amount);

  if (norm === 'USD') {
    return `Usd. ${numStr}.-`;
  }
  return `Bs. ${numStr}.-`;
}

/**
 * Solo prefijo monetario
 */
export function getCurrencyPrefix(currency = 'BOB') {
  return normalizeCurrency(currency) === 'USD' ? 'Usd. ' : 'Bs. ';
}

/**
 * Genera el Importe Literal Oficial
 * - BOB: "Importe Literal: DOS MIL QUINIENTOS VEINTE con 00/100 Bolivianos."
 * - USD: "Importe Literal: TRESCIENTOS SESENTA 00/100 dólares americanos."
 */
export function getImporteLiteral(amount, currency = 'BOB') {
  const norm = normalizeCurrency(currency);
  const num = Math.abs(Number(amount) || 0);
  const entero = Math.floor(num);
  const centavos = Math.round((num - entero) * 100);
  const centavosStr = centavos.toString().padStart(2, '0');
  const palabras = numeroEnPalabras(entero);

  if (norm === 'USD') {
    return `Importe Literal: ${palabras} ${centavosStr}/100 dólares americanos.`;
  }
  return `Importe Literal: ${palabras} con ${centavosStr}/100 Bolivianos.`;
}

/**
 * Cláusula cambiaria obligatoria para USD
 */
export const CLAUSULA_CAMBIARIA_USD =
  'Nota: “Precios en USD, pagaderos en Bs al TC oficial del día de pago. Sujetos a reconfirmación si las condiciones cambiarias varían significativamente”.';

/**
 * Costo base por no autorización según moneda
 */
export const DEFAULT_REVISION_COST = {
  BOB: 210,
  USD: 15,
};

/**
 * Genera la cláusula legal de no autorización
 */
export function getRevisionCostText(cost, currency = 'BOB') {
  const norm = normalizeCurrency(currency);
  const valor = Number(cost !== undefined ? cost : DEFAULT_REVISION_COST[norm]) || DEFAULT_REVISION_COST[norm];
  const formatted = formatNumberBolivia(valor);

  if (norm === 'USD') {
    return `En caso de no autorizar el servicio se deberá cancelar el costo de la revisión de Usd. ${formatted}.-, por cada equipo handy.`;
  }
  return `En caso de no autorizar el servicio se deberá cancelar el costo de la revisión de Bs. ${formatted}.-, por cada equipo.`;
}
