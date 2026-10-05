import { Document, Paragraph, TextRun, Packer, AlignmentType } from 'docx';
import { numeroALetras } from '../../lib/common/numero-a-letras';

export const DocxGenerator = {
  async generateOrderReport(orden, equipos = []) {
    const numeroOrden = orden.numero_orden || 'PROV';
    const cliente = orden.razon_social || 'Consumidor Final';
    const fecha = orden.creado_en ? new Date(orden.creado_en).toLocaleDateString('es-BO') : new Date().toLocaleDateString('es-BO');
    const moneda = orden.moneda || 'BOB';
    const total = parseFloat(orden.sumatoria_total) || 0;

    const equiposParagraphs = equipos.flatMap((eq, index) => [
      new Paragraph({
        children: [
          new TextRun({
            text: `Equipo ${index + 1}: ${eq.marca || 'Radio'} ${eq.modelo || ''} - S/N: ${eq.numero_serie || 'S/N'}`,
            bold: true,
            size: 24,
          }),
        ],
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Falla Reportada: ', bold: true }),
          new TextRun({ text: eq.falla_declarada_cliente || 'Revisión general' }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Diagnóstico Técnico: ', bold: true }),
          new TextRun({ text: eq.texto_diagnostico || (eq.reparacion_rechazada ? `Reparación Rechazada: ${eq.motivo_rechazo || ''}` : 'Revisión y calibración RF') }),
        ],
      }),
    ]);

    const doc = new Document({
      creator: 'Sistema América ERP',
      title: `Informe Técnico OS-${numeroOrden}`,
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'AMERICA Sistemas de Comunicación',
                  bold: true,
                  size: 32,
                  color: '0B1B2B',
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'Informe Técnico Oficial de Servicio',
                  bold: true,
                  size: 26,
                  color: 'E30613',
                }),
              ],
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              children: [
                new TextRun({ text: 'N° Orden de Servicio: ', bold: true }),
                new TextRun({ text: `OS-${numeroOrden}` }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Cliente / Empresa: ', bold: true }),
                new TextRun({ text: cliente }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Fecha de Emisión: ', bold: true }),
                new TextRun({ text: fecha }),
              ],
            }),
            new Paragraph({ text: '' }),
            ...equiposParagraphs,
            new Paragraph({ text: '' }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: `TOTAL GENERAL (${moneda}): ${total.toFixed(2)}`,
                  bold: true,
                  size: 28,
                  color: '0B1B2B',
                }),
              ],
              spacing: { before: 400 },
            }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: numeroALetras(total, moneda === 'USD' ? 'USD' : 'BOB'),
                  italics: true,
                }),
              ],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    return buffer;
  },
};
