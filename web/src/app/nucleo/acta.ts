import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { fecha, fechaHora } from './formato';
import { Asignacion, EquipoResumen, nombreTipo } from './modelos';

// Acta de entrega en PDF, para imprimir y firmar
export async function descargarActa(a: Asignacion, e: EquipoResumen, cargo: string | null) {
  const pdf = new jsPDF({ unit: 'mm', format: 'letter' });
  const ancho = pdf.internal.pageSize.getWidth();
  const m = 20;
  let y = 22;

  pdf.setFillColor(27, 32, 39);
  pdf.rect(0, 0, ancho, 8, 'F');
  pdf.setFont('helvetica', 'bold').setFontSize(10).setTextColor(110);
  pdf.text('PARQUE TI · EMPRESA DEMO S.A.S.', m, y);
  pdf.setFont('courier', 'bold').setTextColor(27, 32, 39);
  pdf.text(`ACTA ${a.codigoEquipo}-${String(a.id).padStart(4, '0')}`, ancho - m, y, { align: 'right' });

  y += 12;
  pdf.setFont('helvetica', 'bold').setFontSize(18).setTextColor(20);
  pdf.text('Acta de entrega de equipo', m, y);
  y += 8;
  pdf.setFont('helvetica', 'normal').setFontSize(10).setTextColor(80);
  pdf.text(`Barranquilla, ${fecha(a.fechaEntrega)}`, m, y);

  const qr = await QRCode.toDataURL(a.codigoEquipo, { margin: 0, width: 240 });
  pdf.addImage(qr, 'PNG', ancho - m - 28, y - 14, 28, 28);

  y += 14;
  const fila = (k: string, v: string, mono = false) => {
    pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(110);
    pdf.text(k.toUpperCase(), m, y);
    pdf.setFont(mono ? 'courier' : 'helvetica', mono ? 'bold' : 'normal').setFontSize(11).setTextColor(20);
    pdf.text(v, m + 45, y);
    y += 7;
  };
  const titulo = (t: string) => {
    pdf.setDrawColor(210).line(m, y - 4, ancho - m, y - 4);
    pdf.setFont('helvetica', 'bold').setFontSize(11).setTextColor(20);
    pdf.text(t, m, y + 2);
    y += 10;
  };

  titulo('Equipo');
  fila('Código', e.codigo, true);
  fila('Tipo', nombreTipo(e.tipo));
  fila('Marca y modelo', `${e.marca} ${e.modelo}`);
  fila('Serial', e.serial, true);

  y += 3;
  titulo('Recibe');
  fila('Nombre', a.empleado.nombre);
  if (cargo) fila('Cargo', cargo);
  fila('Área', a.empleado.area);
  fila('Fecha', fechaHora(a.fechaEntrega));
  fila('Entrega', a.entregadoPor);
  if (a.observaciones) {
    pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(110);
    pdf.text('OBSERVACIONES', m, y);
    pdf.setFontSize(11).setTextColor(20);
    const lineas = pdf.splitTextToSize(a.observaciones, ancho - m * 2 - 45);
    pdf.text(lineas, m + 45, y);
    y += 6 * lineas.length + 1;
  }

  y += 4;
  titulo('Compromisos');
  pdf.setFont('helvetica', 'normal').setFontSize(10).setTextColor(50);
  const texto = [
    'Quien recibe se compromete a usar el equipo solo para labores de la empresa y a cuidarlo.',
    'Debe informar de inmediato al área de tecnología cualquier daño, falla, pérdida o robo.',
    'No debe instalar programas sin autorización ni entregar el equipo a otra persona.',
    'Al retirarse de la empresa o cuando se le solicite, debe devolverlo en el estado en que lo recibió, salvo el desgaste normal.',
  ];
  for (const t of texto) {
    const l = pdf.splitTextToSize(`•  ${t}`, ancho - m * 2);
    pdf.text(l, m, y);
    y += 5.2 * l.length + 1.5;
  }

  y = Math.max(y + 28, 235);
  pdf.setDrawColor(60);
  const col = (ancho - m * 2 - 20) / 2;
  pdf.line(m, y, m + col, y);
  pdf.line(m + col + 20, y, ancho - m, y);
  pdf.setFont('helvetica', 'bold').setFontSize(10).setTextColor(20);
  pdf.text(a.empleado.nombre, m, y + 5);
  pdf.text(a.entregadoPor, m + col + 20, y + 5);
  pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(110);
  pdf.text('Recibe · C.C.', m, y + 10);
  pdf.text('Entrega · Tecnología', m + col + 20, y + 10);

  const nombre = `Acta_${a.codigoEquipo}_${a.empleado.nombre.normalize('NFD').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}.pdf`;
  const url = URL.createObjectURL(pdf.output('blob'));
  const enlace = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
