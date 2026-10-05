/**
 * Convierte un número decimal a su representación literal oficial en español.
 * Formato legal boliviano: "SON: [LITERAL] XX/100 BOLIVIANOS / DÓLARES"
 * @param {number|string} cantidad
 * @param {string} moneda 'BOB' | 'USD'
 * @returns {string}
 */
export function numeroALetras(cantidad, moneda = 'BOB') {
  const num = parseFloat(cantidad);
  if (isNaN(num) || num < 0) {
    const sufijo = moneda === 'USD' ? 'DÓLARES' : 'BOLIVIANOS';
    return `SON: CERO 00/100 ${sufijo}`;
  }

  const entero = Math.floor(num);
  const centavos = Math.round((num - entero) * 100);
  const centavosStr = centavos.toString().padStart(2, '0');
  const sufijoMoneda = moneda === 'USD' ? 'DÓLARES AMERICANOS' : 'BOLIVIANOS';

  if (entero === 0) {
    return `SON: CERO ${centavosStr}/100 ${sufijoMoneda}`;
  }

  function seccion(n, divisor, strSingular, strPlural) {
    const cientos = Math.floor(n / divisor);
    const resto = n - (cientos * divisor);
    let letras = '';

    if (cientos > 0) {
      if (cientos > 1) {
        letras = `${centenas(cientos)} ${strPlural}`;
      } else {
        letras = `${strSingular}`;
      }
    }

    if (resto > 0) {
      letras += '';
    }

    return { letras, resto };
  }

  function miles(numero) {
    const divisor = 1000;
    const cientos = Math.floor(numero / divisor);
    const resto = numero - (cientos * divisor);

    let strMiles = '';
    if (cientos > 0) {
      if (cientos === 1) {
        strMiles = 'MIL';
      } else {
        strMiles = `${centenas(cientos)} MIL`;
      }
    }

    let strCentenas = '';
    if (resto > 0) {
      strCentenas = centenas(resto);
    }

    if (strMiles && strCentenas) return `${strMiles} ${strCentenas}`;
    return strMiles || strCentenas;
  }

  function centenas(numero) {
    const centenasArr = [
      '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS',
      'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'
    ];
    const c = Math.floor(numero / 100);
    const d = numero - (c * 100);

    if (numero === 100) return 'CIEN';
    const decenasStr = decenas(d);
    if (c > 0 && decenasStr) return `${centenasArr[c]} ${decenasStr}`;
    if (c > 0) return centenasArr[c];
    return decenasStr;
  }

  function decenas(numero) {
    if (numero === 0) return '';
    if (numero < 10) return unidades(numero);
    if (numero <= 20) {
      const especiales = [
        'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE',
        'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'
      ];
      return especiales[numero - 10];
    }
    if (numero < 30) {
      const veinti = [
        'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO',
        'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'
      ];
      return veinti[numero - 21];
    }

    const decenasArr = [
      '', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA',
      'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'
    ];
    const d = Math.floor(numero / 10);
    const u = numero - (d * 10);

    if (u > 0) return `${decenasArr[d]} Y ${unidades(u)}`;
    return decenasArr[d];
  }

  function unidades(numero) {
    const unidadesArr = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    return unidadesArr[numero] || '';
  }

  let resultado = '';
  // Manejo de millones
  if (entero >= 1000000) {
    const secMillon = seccion(entero, 1000000, 'UN MILLÓN', 'MILLONES');
    resultado = secMillon.letras;
    if (secMillon.resto > 0) {
      resultado += ` ${miles(secMillon.resto)}`;
    }
  } else {
    resultado = miles(entero);
  }

  return `SON: ${resultado.trim()} ${centavosStr}/100 ${sufijoMoneda}`;
}
