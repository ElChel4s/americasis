import {
  Document,
  Paragraph,
  TextRun,
  Packer,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
  PageBreak,
  HeadingLevel,
  Header,
  Footer,
  ImageRun
} from 'docx';
import {
  formatCurrency,
  getImporteLiteral,
  CLAUSULA_CAMBIARIA_USD,
  getRevisionCostText,
  normalizeCurrency
} from './currencyFormat.js';
import { resolveImageUrl } from '../services/orders.service.js';

/**
 * Helper para cargar bytes de imagen tanto en navegador como en entorno Node.js
 */
async function getImageBytes(urlOrPath) {
  if (!urlOrPath) return null;
  try {
    if (typeof urlOrPath === 'string' && urlOrPath.startsWith('data:')) {
      const commaIdx = urlOrPath.indexOf(',');
      const base64 = commaIdx !== -1 ? urlOrPath.slice(commaIdx + 1) : urlOrPath;
      if (typeof window !== 'undefined') {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      } else {
        return Buffer.from(base64, 'base64');
      }
    }
    if (typeof window !== 'undefined') {
      const res = await fetch(urlOrPath);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Uint8Array(await blob.arrayBuffer());
    } else {
      const fs = await import('fs');
      const path = await import('path');
      const fullPath = path.join(process.cwd(), 'public', urlOrPath.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath);
      }
      return null;
    }
  } catch (err) {
    console.warn('[docxExport] No se pudo obtener bytes de imagen:', err.message);
    return null;
  }
}

/**
 * Genera el documento oficial .docx con exactitud milimétrica
 * @param {Object} formData
 * @param {Object} currentUser
 * @returns {Promise<Blob>}
 */
export async function generateDocxBlob(formData = {}, currentUser = null) {
  // 0. Cargar membretes oficiales para encabezado y pie de página
  let headerImgBytes = null;
  let footerImgBytes = null;
  try {
    headerImgBytes = await getImageBytes('/images/header_membrete.png');
    footerImgBytes = await getImageBytes('/images/footer_membrete.png');
  } catch (err) {
    console.warn('[docxExport] No se pudieron cargar membretes PNG:', err);
  }
  const moneda = normalizeCurrency(formData.moneda || 'BOB');
  const numeroOrden = formData.ordenServicio || formData.numero_orden || (formData.id ? String(formData.id) : '001');
  const cliente = (formData.cliente || formData.razon_social || 'CLIENTE MOSTRADOR').toUpperCase();
  const condiciones = formData.condiciones || {};
  const tecnicoFirmanteNombre = condiciones.tecnicoFirmanteNombre || formData.tecnicoNombre || formData.tecnico_nombre_manual || (currentUser?.rol === 'TECNICO' ? currentUser.nombre_completo : 'Ramiro Condori');
  const tecnicoFirmanteCargo = condiciones.tecnicoFirmanteCargo || 'Técnico Especialista RF';

  const fechaActual = new Date().toLocaleDateString('es-BO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Cálculo de Subtotal 1 y 2
  const subtotal1 = (formData.equipos || []).reduce((acc, eq) => {
    if (eq.reparacion_rechazada && !eq.no_autorizo_revision) return acc;
    return acc + (parseFloat(eq.costo_servicio) || 0);
  }, 0);

  const accesoriosList = [];
  (formData.equipos || []).forEach((eq, eqIdx) => {
    (eq.repuestos || []).forEach((r) => {
      if (r.se_reemplaza) {
        accesoriosList.push({
          equipoIdx: eqIdx,
          equipoNombre: `${eq.marca || 'Radio'} ${eq.modelo || `Eq. ${eqIdx + 1}`}`,
          nombre: r.nombre || r.descripcion || 'Repuesto',
          cantidad: parseInt(r.cantidad, 10) || 1,
          precio: parseFloat(r.precio) || 0,
          es_opcional: Boolean(r.es_opcional)
        });
      }
    });

    if (eq.antenaEstado === 'REEMPLAZO' && !(eq.repuestos || []).some(r => r.nombre?.toLowerCase().includes('antena'))) {
      accesoriosList.push({
        equipoIdx: eqIdx,
        equipoNombre: `${eq.marca} ${eq.modelo || `Eq. ${eqIdx + 1}`}`,
        nombre: `Antena ${eq.banda || 'VHF'} (${eq.antenaModelo || 'Original'})`,
        cantidad: 1,
        precio: moneda === 'USD' ? 25 : 175,
        es_opcional: true
      });
    }

    if ((eq.bateriaEstado === 'REEMPLAZO' || (parseInt(eq.bateriaCarga, 10) > 0 && parseInt(eq.bateriaCarga, 10) < 70)) && !(eq.repuestos || []).some(r => r.nombre?.toLowerCase().includes('bater'))) {
      accesoriosList.push({
        equipoIdx: eqIdx,
        equipoNombre: `${eq.marca} ${eq.modelo || `Eq. ${eqIdx + 1}`}`,
        nombre: `Batería Li-Ion ${eq.bateriaModelo || 'Alta Capacidad'}`,
        cantidad: 1,
        precio: moneda === 'USD' ? 55 : 380,
        es_opcional: false
      });
    }
  });

  const subtotal2 = accesoriosList.reduce((acc, a) => acc + (a.cantidad * a.precio), 0);
  const totalGeneral = subtotal1 + subtotal2;

  // Helper para crear fila punteada alineada (izq / der)
  const createDottedLine = (leftText, rightText, isBold = false) => {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE }
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: leftText, bold: isBold, size: 21 })] })]
            }),
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: rightText, bold: isBold, size: 21, font: 'Consolas' })]
                })
              ]
            })
          ]
        })
      ]
    });
  };

  // Párrafos del documento
  const paragraphs = [];

  // Fecha y Destinatario (el membrete visual superior va en el Header de sección)
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Santa Cruz de la Sierra, ${fechaActual}`,
          size: 21
        })
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Señores:', size: 21 })]
    }),
    new Paragraph({
      children: [new TextRun({ text: cliente, bold: true, size: 23 })]
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Presente. -', size: 21 })],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `REF.: INFORME TECNICO PRELIMINAR DE ORDEN DE SERVICIO: N° ${numeroOrden}${condiciones.referenciaAdicional ? ' ' + condiciones.referenciaAdicional : ''}`,
          bold: true,
          underline: {},
          size: 22
        })
      ],
      spacing: { after: 150 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Atendiendo a su requerimiento, le enviamos el informe técnico de la Orden de Servicio.',
          size: 21
        })
      ],
      spacing: { after: 250 }
    })
  );

  // SECCIÓN 1: SOLICITUD DEL CLIENTE
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '1. Solicitud del cliente:',
          bold: true,
          underline: {},
          size: 22
        })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Para reparación y mantenimiento general de equipos:',
          size: 21
        })
      ],
      spacing: { after: 150 }
    })
  );

  (formData.equipos || []).forEach((eq, idx) => {
    let accList = [];
    const accObj = eq.accesoriosRecepcion || {};
    Object.keys(accObj).forEach((k) => {
      if (accObj[k] === 'CON') {
        accList.push(`con ${k.toLowerCase()}`);
      }
    });
    const accStr = accList.length > 0 ? accList.join(', ') : 'con accesorios completos';

    paragraphs.push(
      new Paragraph({
        bullet: { level: 0 },
        children: [
          new TextRun({
            text: `Handy ${eq.marca || 'Motorola'} ${eq.modelo || 'Radio'} ${eq.banda || 'VHF'} – Serie: ${eq.serie || eq.numero_serie || 'S/N'} - ${accStr}.`,
            size: 21
          })
        ]
      })
    );
  });

  // SECCIÓN 2: DIAGNÓSTICO DE RADIOS
  paragraphs.push(
    new Paragraph({
      spacing: { before: 250 },
      children: [
        new TextRun({
          text: '2. Diagnóstico de radios:',
          bold: true,
          underline: {},
          size: 22
        })
      ]
    })
  );

  (formData.equipos || []).forEach((eq, idx) => {
    paragraphs.push(
      new Paragraph({
        spacing: { before: 150, after: 80 },
        children: [
          new TextRun({
            text: `[${idx + 1}]. ${eq.marca || 'Motorola'} ${eq.modelo || 'Radio'} ${eq.banda || 'VHF'} – Serie: ${eq.serie || eq.numero_serie || 'S/N'}, se realizó la revisión general del equipo:`,
            bold: true,
            size: 21
          })
        ]
      })
    );

    if (eq.reparacion_rechazada) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `NOTA: EQUIPO NO REPARADO NO AUTORIZADO POR EL CLIENTE, REPARACION COTIZADA ${formatCurrency(eq.costo_servicio || condiciones.costoRevision, moneda)}, SI SE DESEA REPARAR EL EQUIPO, SE DEBE ACTUALIZAR EL PRECIO.`,
              bold: true,
              color: 'E30613',
              size: 20
            })
          ]
        })
      );
    } else {
      // Viñetas consolidadas de fallas de placa
      if (eq.fallas && eq.fallas.length > 0) {
        if (eq.fallas.length === 1) {
          paragraphs.push(
            new Paragraph({
              bullet: { level: 0 },
              children: [
                new TextRun({
                  text: `- El equipo presenta falla en ${eq.fallas[0].label?.toLowerCase() || 'componente de placa'}, requiere ajuste-calibración de parámetros, limpieza y mantenimiento general.`,
                  size: 20
                })
              ]
            })
          );
        } else {
          const listaFallas = eq.fallas.map(f => f.label?.toLowerCase() || 'componente de placa').join(', ');
          paragraphs.push(
            new Paragraph({
              bullet: { level: 0 },
              children: [
                new TextRun({
                  text: `- El equipo presenta fallas en: ${listaFallas}, requiere ajuste-calibración de parámetros, limpieza y mantenimiento general.`,
                  size: 20
                })
              ]
            })
          );
        }
      } else {
        paragraphs.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: '- El equipo presenta desgaste por uso operativo, requiere ajuste-calibración de parámetros, limpieza y mantenimiento general.',
                size: 20
              })
            ]
          })
        );
      }

      // Viñeta antena
      if (eq.antenaEstado === 'REEMPLAZO') {
        paragraphs.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: '- La antena presenta desgaste por uso, pero está funcionando con normalidad, se recomienda su reemplazo, se cotizará en forma opcional.',
                size: 20
              })
            ]
          })
        );
      }

      // Viñeta batería
      if (eq.bateriaEstado === 'REEMPLAZO' || (parseInt(eq.bateriaCarga, 10) > 0 && parseInt(eq.bateriaCarga, 10) < 70)) {
        paragraphs.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: `- La batería ${eq.bateriaModelo || 'del equipo'}, tiene una capacidad de carga del ${eq.bateriaCarga || 40}% se debe reemplazar, se cotizará en accesorios.`,
                size: 20
              })
            ]
          })
        );
      }
    }
  });

  // SECCIÓN 3: CONCLUSIONES / RECOMENDACIONES (CONDICIONAL)
  const conclusionesList = Array.isArray(condiciones.conclusiones)
    ? condiciones.conclusiones.filter(Boolean)
    : (condiciones.conclusionesTexto ? condiciones.conclusionesTexto.split('\n').filter(Boolean) : []);

  if (condiciones.incluirConclusiones && conclusionesList.length > 0) {
    paragraphs.push(
      new Paragraph({
        spacing: { before: 250 },
        children: [
          new TextRun({
            text: 'CONCLUSIONES / RECOMENDACIONES:',
            bold: true,
            underline: {},
            size: 22
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'De acuerdo a la revisión realizada se observa:',
            size: 21
          })
        ]
      })
    );

    conclusionesList.forEach((c) => {
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun({ text: c, size: 20 })]
        })
      );
    });

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Confirmarnos si se procede con el servicio técnico indicado.',
            italic: true,
            size: 20
          })
        ],
        spacing: { after: 150 }
      })
    );
  }

  // OBSERVACIONES / NOTAS ADICIONALES (CONDICIONAL)
  if (condiciones.incluirNotas && condiciones.notasObservaciones?.trim()) {
    paragraphs.push(
      new Paragraph({
        spacing: { before: 200 },
        children: [
          new TextRun({
            text: 'OBSERVACIONES / NOTAS:',
            bold: true,
            underline: {},
            size: 22
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: condiciones.notasObservaciones.trim(),
            size: 20
          })
        ],
        spacing: { after: 150 }
      })
    );
  }

  // SECCIÓN 4: CUADRO ECONÓMICO ("Costo del Servicio:")
  paragraphs.push(
    new Paragraph({
      spacing: { before: 250 },
      children: [
        new TextRun({
          text: 'Costo del Servicio:',
          bold: true,
          underline: {},
          size: 22
        })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Costo de la reparación, cambio de repuestos, mantenimiento y control operativo:',
          size: 21
        })
      ],
      spacing: { after: 150 }
    })
  );

  // Bloque 1: Servicio Técnico por equipo
  (formData.equipos || []).forEach((eq, idx) => {
    const costo = parseFloat(eq.costo_servicio) || 0;
    const desc = eq.descripcion_servicio || '(Servicio técnico, revisión general, limpieza, ajuste-calibración de parámetros y mantenimiento general)';

    paragraphs.push(
      createDottedLine(
        `${eq.marca || 'Radio'} ${eq.modelo || ''} – Serie: ${eq.serie || eq.numero_serie || 'S/N'}`,
        formatCurrency(costo, moneda),
        true
      ),
      new Paragraph({
        children: [
          new TextRun({
            text: desc,
            italic: true,
            size: 19
          })
        ],
        spacing: { after: 100 }
      })
    );
  });

  paragraphs.push(
    createDottedLine(
      'Sub total 1 Servicio técnico ...................................................',
      formatCurrency(subtotal1, moneda),
      true
    )
  );

  // Bloque 2: Accesorios (si existen)
  if (accesoriosList.length > 0) {
    paragraphs.push(
      new Paragraph({
        spacing: { before: 150, after: 50 },
        children: [new TextRun({ text: 'Accesorios:', bold: true, size: 21 })]
      })
    );

    accesoriosList.forEach((acc) => {
      const itemSubtotal = acc.cantidad * acc.precio;
      const opcText = acc.es_opcional ? ' [Opcional]' : '';
      paragraphs.push(
        createDottedLine(
          `${acc.nombre} (${acc.cantidad} Unid X ${formatCurrency(acc.precio, moneda)} c/u)${opcText}`,
          formatCurrency(itemSubtotal, moneda),
          false
        )
      );
    });

    paragraphs.push(
      createDottedLine(
        'Sub total 2 Accesorios .........................................................',
        formatCurrency(subtotal2, moneda),
        true
      )
    );
  }

  // Sumatoria Total
  paragraphs.push(
    new Paragraph({ spacing: { before: 150 } }),
    createDottedLine(
      'SUMATORIA TOTAL: Servicio técnico + Accesorios ----------------------------------------',
      formatCurrency(totalGeneral, moneda),
      true
    ),
    new Paragraph({
      spacing: { before: 100 },
      children: [
        new TextRun({
          text: getImporteLiteral(totalGeneral, moneda),
          bold: true,
          size: 20
        })
      ]
    })
  );

  // Nota cambiaria si USD
  if (moneda === 'USD') {
    paragraphs.push(
      new Paragraph({
        spacing: { before: 80 },
        children: [
          new TextRun({
            text: CLAUSULA_CAMBIARIA_USD,
            bold: true,
            size: 20
          })
        ]
      })
    );
  }

  // SECCIÓN 5: TÉRMINOS COMERCIALES Y POLÍTICAS
  paragraphs.push(
    new Paragraph({
      spacing: { before: 250 },
      children: [
        new TextRun({
          text: 'Términos Comerciales y Políticas de Servicio:',
          bold: true,
          underline: {},
          size: 22
        })
      ]
    }),
    new Paragraph({ children: [new TextRun({ text: '• Forma de pago: Al contado.', size: 20 })] }),
    new Paragraph({ children: [new TextRun({ text: `• Vigencia de informe: ${condiciones.diasVigencia || 5} días para su aprobación a partir de la fecha de entrega del presente informe.`, size: 20 })] }),
    new Paragraph({ children: [new TextRun({ text: '• Accesorios y repuestos: Disponibles en Stock, salvo ventas sin previo aviso.', size: 20 })] }),
    new Paragraph({ children: [new TextRun({ text: `• Entrega de equipos reparados: ${condiciones.tiempoEntrega || '1 a 2 semanas'}, posterior al día de la autorización por escrito del presente informe.`, size: 20 })] }),
    new Paragraph({ children: [new TextRun({ text: `• Garantía de la reparación: ${condiciones.textoGarantia || '5 días calendario a partir de la entrega para verificación operativa.'}`, size: 20 })] })
  );

  if (condiciones.incluirGarantiaBaterias) {
    paragraphs.push(
      new Paragraph({ children: [new TextRun({ text: '• Tiempo de prueba de baterías: Las baterías nuevas cuentan con 3 meses de garantía por defectos de fábrica.', size: 20 })] })
    );
  }

  paragraphs.push(
    new Paragraph({ children: [new TextRun({ text: '• Cuenta de cheque: Para pagos con cheque, este debe ser girado a nombre de: AMERICA SISTEMAS DE COMUNICACIÓN KEMLO SRL', size: 20 })] }),
    new Paragraph({
      children: [
        new TextRun({
          text: `• Penalidad por no autorización: ${getRevisionCostText(condiciones.costoRevision, moneda)}`,
          size: 20
        })
      ]
    }),
    ...(condiciones.incluirPoliticasGenerales !== false ? [
      new Paragraph({
        spacing: { before: 150 },
        children: [
          new TextRun({
            text: 'CONDICIONES Y POLITICAS GENERALES DE LA EMPRESA:\n' +
                  'SERVICIOS - Toda cotización de servicios, como ser instalaciones, servicio técnico, revisiones, reparaciones, mantenimientos, etc., son solo una estimación del precio por servicio y no el precio final, el cual variará de acuerdo a la particularidad de cada servicio.\n' +
                  'Se debe tomar en cuenta que en cada servicio se debe realizar las pruebas operativas, de los equipos y posteriormente se pueden requerir más cambios de repuestos u accesorios, que serán cobrados de forma adicional.\n\n' +
                  'Sin otro particular, me despido.',
            size: 19
          })
        ]
      })
    ] : [
      new Paragraph({
        spacing: { before: 150 },
        children: [
          new TextRun({
            text: 'Sin otro particular, me despido.',
            italic: true,
            size: 20
          })
        ]
      })
    ])
  );

  // SECCIÓN 6: FIRMAS AL PIE
  paragraphs.push(
    new Paragraph({ spacing: { before: 400 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE }
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: '____________________________________\n', bold: true }),
                    new TextRun({ text: `${currentUser?.nombre_completo || 'Atención al Cliente'}\n`, bold: true, size: 21 }),
                    new TextRun({ text: 'Asistente de Servicio Técnico\nAMERICA SISTEMAS DE COMUNICACIÓN', size: 18 })
                  ]
                })
              ]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: '____________________________________\n', bold: true }),
                    new TextRun({ text: `${tecnicoFirmanteNombre}\n`, bold: true, size: 21 }),
                    new TextRun({ text: `${tecnicoFirmanteCargo}\nAMERICA SISTEMAS DE COMUNICACIÓN`, size: 18 })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
  );

  // SECCIÓN 7: ANEXO FOTOGRÁFICO OFICIAL (ORGANIZADO POR RADIO)
  const equiposConFotosDocx = [];
  const seenDocxUrls = new Set();

  (formData.equipos || []).forEach((eq, eqIdx) => {
    const handyNum = eq.orden_indice || (eqIdx + 1);
    const handyLabel = `${eq.marca || 'Motorola'} ${eq.modelo || `Handy #${handyNum}`}`.trim();
    const serie = eq.serie || eq.numero_serie || `Handy #${handyNum}`;

    const rawRecepcion = [
      ...(Array.isArray(eq.imagenesRecepcion) ? eq.imagenesRecepcion : []),
      ...(Array.isArray(eq.fotosRecepcion) ? eq.fotosRecepcion : []),
      ...(Array.isArray(eq.imagenes) ? eq.imagenes.filter(img => {
        const et = String(img?.etapa || img?.tipo || '').toUpperCase();
        return et !== 'DIAGNOSTICO' && et !== 'INTERNA' && et !== 'INTERNO';
      }) : []),
      ...(Array.isArray(eq.evidencias) ? eq.evidencias.filter(img => {
        const et = String(img?.etapa || img?.tipo || '').toUpperCase();
        return et !== 'DIAGNOSTICO' && et !== 'INTERNA' && et !== 'INTERNO';
      }) : [])
    ];

    const rawDiagnostico = [
      ...(Array.isArray(eq.imagenesInternas) ? eq.imagenesInternas : []),
      ...(Array.isArray(eq.imagenesDiagnostico) ? eq.imagenesDiagnostico : []),
      ...(Array.isArray(eq.fotosDiagnostico) ? eq.fotosDiagnostico : []),
      ...(Array.isArray(eq.imagenes) ? eq.imagenes.filter(img => {
        const et = String(img?.etapa || img?.tipo || '').toUpperCase();
        return et === 'DIAGNOSTICO' || et === 'INTERNA' || et === 'INTERNO';
      }) : []),
      ...(Array.isArray(eq.evidencias) ? eq.evidencias.filter(img => {
        const et = String(img?.etapa || img?.tipo || '').toUpperCase();
        return et === 'DIAGNOSTICO' || et === 'INTERNA' || et === 'INTERNO';
      }) : [])
    ];

    const reception = [];
    rawRecepcion.forEach((img, i) => {
      const url = resolveImageUrl(img);
      if (!url || seenDocxUrls.has(url)) return;
      seenDocxUrls.add(url);
      reception.push({
        ...img,
        url,
        name: img?.name || img?.nombre_archivo || `Foto Ingreso #${i + 1}`
      });
    });

    const diagnosis = [];
    rawDiagnostico.forEach((img, i) => {
      const url = resolveImageUrl(img);
      if (!url || seenDocxUrls.has(url)) return;
      seenDocxUrls.add(url);
      diagnosis.push({
        ...img,
        url,
        name: img?.name || img?.nombre_archivo || `Foto Placa / Daño #${i + 1}`
      });
    });

    if (reception.length > 0 || diagnosis.length > 0) {
      equiposConFotosDocx.push({
        handyLabel,
        serie,
        reception,
        diagnosis
      });
    }
  });

  if (equiposConFotosDocx.length > 0) {
    paragraphs.push(
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'ANEXO FOTOGRAFICO OFICIAL',
            bold: true,
            underline: {},
            size: 26
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'Estado de los equipos.\nEvidencias técnicas de Recepción y Laboratorio organizadas por radio.',
            size: 20
          })
        ],
        spacing: { after: 250 }
      })
    );

    for (let eqIdx = 0; eqIdx < equiposConFotosDocx.length; eqIdx++) {
      const eqFoto = equiposConFotosDocx[eqIdx];

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `RADIO #${eqIdx + 1}: ${eqFoto.handyLabel} (S/N: ${eqFoto.serie})`,
              bold: true,
              size: 22,
              color: '1E293B'
            })
          ],
          spacing: { before: 200, after: 100 }
        })
      );

      // Bloque 1: Registro de Ingreso (Recepción)
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `1. Registro de Ingreso (Recepción) — ${eqFoto.handyLabel} (S/N: ${eqFoto.serie})`,
              bold: true,
              size: 20,
              color: 'E30613'
            })
          ],
          spacing: { before: 80, after: 60 }
        })
      );

      if (eqFoto.reception.length === 0) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '• Sin fotos de ingreso registradas en mostrador.',
                italics: true,
                size: 19,
                color: '64748B'
              })
            ],
            spacing: { after: 80 }
          })
        );
      } else {
        for (let fi = 0; fi < eqFoto.reception.length; fi++) {
          const foto = eqFoto.reception[fi];
          let imgBytes = null;
          try {
            imgBytes = await getImageBytes(foto.url);
          } catch (e) {}

          const photoChildren = [
            new TextRun({
              text: `  [Foto ${fi + 1}] ${foto.name} — S/N: ${eqFoto.serie}\n`,
              bold: true,
              size: 19,
              color: '334155'
            })
          ];

          if (imgBytes) {
            try {
              photoChildren.push(
                new ImageRun({
                  data: imgBytes,
                  transformation: {
                    width: 250,
                    height: 180
                  }
                })
              );
            } catch (err) {}
          }

          paragraphs.push(
            new Paragraph({
              children: photoChildren,
              spacing: { after: 120 }
            })
          );
        }
      }

      // Bloque 2: Evidencia Técnica de Daños y Laboratorio
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `2. Evidencia Técnica de Daños y Laboratorio — ${eqFoto.handyLabel} (S/N: ${eqFoto.serie})`,
              bold: true,
              size: 20,
              color: '0F172A'
            })
          ],
          spacing: { before: 100, after: 60 }
        })
      );

      if (eqFoto.diagnosis.length === 0) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '• Sin fotos de daños o placa registradas en laboratorio.',
                italics: true,
                size: 19,
                color: '64748B'
              })
            ],
            spacing: { after: 150 }
          })
        );
      } else {
        for (let fi = 0; fi < eqFoto.diagnosis.length; fi++) {
          const foto = eqFoto.diagnosis[fi];
          let imgBytes = null;
          try {
            imgBytes = await getImageBytes(foto.url);
          } catch (e) {}

          const photoChildren = [
            new TextRun({
              text: `  [Foto ${fi + 1}] ${foto.name} — S/N: ${eqFoto.serie}\n`,
              bold: true,
              size: 19,
              color: '334155'
            })
          ];

          if (imgBytes) {
            try {
              photoChildren.push(
                new ImageRun({
                  data: imgBytes,
                  transformation: {
                    width: 250,
                    height: 180
                  }
                })
              );
            } catch (err) {}
          }

          paragraphs.push(
            new Paragraph({
              children: photoChildren,
              spacing: { after: 120 }
            })
          );
        }
      }
    }
  }

  // Configuración de encabezados y pies de página oficiales
  const headersObj = headerImgBytes ? {
    default: new Header({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: headerImgBytes,
              transformation: {
                width: 535,
                height: 65
              }
            })
          ]
        })
      ]
    })
  } : undefined;

  const footersObj = footerImgBytes ? {
    default: new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: footerImgBytes,
              transformation: {
                width: 535,
                height: 65
              }
            })
          ]
        })
      ]
    })
  } : undefined;

  const doc = new Document({
    creator: 'AMERICA SISTEMAS DE COMUNICACIÓN KEMLO SRL',
    title: `Informe Técnico OS-${numeroOrden}`,
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 21,
            color: '1E293B'
          }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 Ancho en twips
              height: 16838 // A4 Alto en twips
            },
            margin: {
              top: headerImgBytes ? 1300 : 1440,
              bottom: footerImgBytes ? 1200 : 1440,
              left: 1000,
              right: 1000,
              header: 450,
              footer: 400
            }
          }
        },
        headers: headersObj,
        footers: footersObj,
        children: paragraphs
      }
    ]
  });

  return await Packer.toBlob(doc);
}
