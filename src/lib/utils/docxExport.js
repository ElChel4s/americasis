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
  HeadingLevel
} from 'docx';
import {
  formatCurrency,
  getImporteLiteral,
  CLAUSULA_CAMBIARIA_USD,
  getRevisionCostText,
  normalizeCurrency
} from './currencyFormat.js';

/**
 * Genera el documento oficial .docx con exactitud milimétrica
 * @param {Object} formData
 * @param {Object} currentUser
 * @returns {Promise<Blob>}
 */
export async function generateDocxBlob(formData = {}, currentUser = null) {
  const moneda = normalizeCurrency(formData.moneda || 'BOB');
  const numeroOrden = formData.ordenServicio || '001';
  const cliente = (formData.cliente || 'CLIENTE MOSTRADOR').toUpperCase();
  const condiciones = formData.condiciones || {};

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
          equipoNombre: `${eq.marca} ${eq.modelo || `Eq. ${eqIdx + 1}`}`,
          nombre: r.nombre,
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

  // Encabezado
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'AMERICA SISTEMAS DE COMUNICACIÓN KEMLO SRL',
          bold: true,
          size: 26,
          color: '0B1B2B'
        })
      ],
      spacing: { after: 100 }
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'LABORATORIO OFICIAL DE RADIOCOMUNICACIÓN — SERVICIO TÉCNICO',
          bold: true,
          size: 18,
          color: 'E30613'
        })
      ],
      spacing: { after: 300 }
    }),
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
      // Viñetas de fallas
      if (eq.fallas && eq.fallas.length > 0) {
        eq.fallas.forEach((f) => {
          paragraphs.push(
            new Paragraph({
              bullet: { level: 0 },
              children: [
                new TextRun({
                  text: `- El equipo presenta falla en ${f.label?.toLowerCase() || 'componentes de placa'}, requiere ajuste-calibración de parámetros, limpieza y mantenimiento general.`,
                  size: 20
                })
              ]
            })
          );
        });
      } else {
        paragraphs.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: '- Se realizó la revisión electrónica integral, requiere ajuste-calibración de parámetros, limpieza y mantenimiento general.',
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
  if (condiciones.incluirConclusiones) {
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

    (condiciones.conclusiones || []).forEach((c) => {
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
                    new TextRun({ text: 'Dpto. Técnico de Laboratorio\n', bold: true, size: 21 }),
                    new TextRun({ text: 'Técnico Especialista RF\nAMERICA SISTEMAS DE COMUNICACIÓN', size: 18 })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
  );

  // SECCIÓN 7: ANEXO FOTOGRÁFICO (SI HAY FOTOS)
  const todasFotos = (formData.equipos || []).flatMap((eq, eqIdx) => {
    const ext = (eq.imagenes || []).map(img => ({ ...img, equipoLabel: eq.modelo || `Equipo ${eqIdx + 1}`, tipo: 'Recepción' }));
    const int = (eq.imagenesInternas || []).map(img => ({ ...img, equipoLabel: eq.modelo || `Equipo ${eqIdx + 1}`, tipo: 'Diagnóstico' }));
    return [...ext, ...int];
  });

  if (todasFotos.length > 0) {
    paragraphs.push(
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'ANEXO FOTOGRAFICO',
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
            text: 'Estado de los equipos.\nEvidencias técnicas registradas en Recepción y Laboratorio RF.',
            size: 20
          })
        ],
        spacing: { after: 200 }
      })
    );

    todasFotos.forEach((foto, fi) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[Foto ${fi + 1}] ${foto.equipoLabel} — Etapa de ${foto.tipo}: ${foto.name || 'Registro fotográfico'}`,
              bold: true,
              size: 20
            })
          ],
          spacing: { before: 100, after: 50 }
        })
      );
    });
  }

  const doc = new Document({
    creator: 'AMERICA SISTEMAS DE COMUNICACIÓN KEMLO SRL',
    title: `Informe Técnico OS-${numeroOrden}`,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440
            }
          }
        },
        children: paragraphs
      }
    ]
  });

  return await Packer.toBlob(doc);
}
