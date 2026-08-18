import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoProfessional from '../assets/logo-professional.png';

const BRAND_BLUE = [31, 58, 95];
const BRAND_GREEN = [5, 150, 105];
const MARGIN = 10;

function getBase64ImageFromURL(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.setAttribute('crossOrigin', 'anonymous');
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext('2d').drawImage(image, 0, 0);
      resolve({
        dataURL: canvas.toDataURL('image/png'),
        width: image.width,
        height: image.height,
      });
    };
    image.onerror = reject;
    image.src = url;
  });
}

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCycle(summary) {
  return `${formatDate(summary.cycle_start)} – ${formatDate(summary.cycle_end)}`;
}

function safeFilePart(value, fallback = 'Salary_Statement') {
  return String(value || fallback).replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '') || fallback;
}

function drawHeader(doc, pageWidth, { logoData, title, subtitle, metaLines = [] }) {
  let contentX = MARGIN;
  if (logoData) {
    const maxWidth = 26;
    const maxHeight = 14;
    let width = maxWidth;
    let height = (logoData.height * maxWidth) / logoData.width;
    if (height > maxHeight) {
      height = maxHeight;
      width = (logoData.width * maxHeight) / logoData.height;
    }
    doc.addImage(logoData.dataURL, 'PNG', MARGIN, 9, width, height);
    contentX += width + 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BRAND_BLUE);
  doc.text("Driver's Diary", contentX, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100);
  doc.text('Premium Cab Services by HeadGreen!', contentX, 19.5);

  doc.setFontSize(8);
  doc.setTextColor(...BRAND_BLUE);
  metaLines.forEach((line, index) => {
    doc.text(line, pageWidth - MARGIN, 12.5 + index * 4, { align: 'right' });
  });

  doc.setDrawColor(...BRAND_BLUE);
  doc.setLineWidth(0.55);
  doc.line(MARGIN, 26, pageWidth - MARGIN, 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...BRAND_BLUE);
  doc.text(title, pageWidth / 2, 34, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(subtitle, pageWidth / 2, 39, { align: 'center' });
  return 46;
}

function drawFooter(doc, pageWidth, pageHeight, label) {
  const pages = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(210);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, pageHeight - 8, pageWidth - MARGIN, pageHeight - 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(`Confidential • HeadGreen! • ${label}`, pageWidth / 2, pageHeight - 4.5, { align: 'center' });
    doc.text(`Page ${page} of ${pages}`, pageWidth - MARGIN, pageHeight - 4.5, { align: 'right' });
  }
}

function drawSummaryCards(doc, startY, pageWidth, items) {
  const gap = 2.5;
  const cardWidth = (pageWidth - MARGIN * 2 - gap * (items.length - 1)) / items.length;
  const cardHeight = 14;

  items.forEach((item, index) => {
    const x = MARGIN + index * (cardWidth + gap);
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(220, 225, 232);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 1.2, 1.2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(110);
    doc.text(item.label, x + 2.5, startY + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(...(item.tone || BRAND_BLUE));
    doc.text(item.value, x + 2.5, startY + 10.5);
  });
  return startY + cardHeight + 5;
}

function drawCycleSection(doc, startY, pageWidth, summary, label, status, rules) {
  doc.setFillColor(...BRAND_BLUE);
  doc.roundedRect(MARGIN, startY, pageWidth - MARGIN * 2, 8, 1.2, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(label, MARGIN + 3, startY + 5.1);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`${formatCycle(summary)} • ${status}`, pageWidth - MARGIN - 3, startY + 5.1, { align: 'right' });

  let y = drawSummaryCards(doc, startY + 11, pageWidth, [
    { label: 'SALARY EARNED', value: formatCurrency(summary.gross_earnings), tone: BRAND_GREEN },
    { label: 'ADVANCE PAID', value: formatCurrency(summary.advance_paid) },
    { label: 'NET PAYABLE', value: formatCurrency(summary.net_payable), tone: BRAND_BLUE },
  ]);

  const attendance = summary.attendance || {};
  autoTable(doc, {
    startY: y,
    head: [['Earnings component', 'Calculation', 'Amount']],
    body: [
      [
        'Standard ride earnings',
        `${summary.standard_rides} rides × ${formatCurrency(rules.standard_ride_rate)}`,
        formatCurrency(summary.standard_ride_earnings),
      ],
      [
        'Distance-based earnings',
        `${Number(summary.special_kms || 0).toLocaleString('en-IN')} km × ${formatCurrency(rules.special_km_rate)}`,
        formatCurrency(summary.distance_earnings),
      ],
      [
        'Incentive bonus',
        `${summary.incentive_trips} rides over ${rules.incentive_threshold} × ${formatCurrency(rules.incentive_trip_rate)}`,
        formatCurrency(summary.incentive_earnings),
      ],
      [
        'Attendance recorded',
        `${attendance.full_days || 0} full • ${attendance.half_days || 0} half • ${attendance.leaves || 0} leave • ${attendance.holidays || 0} holiday`,
        '—',
      ],
      ['Total rides', `${summary.standard_rides} standard • ${summary.special_rides} distance-based`, String(summary.total_rides)],
    ],
    theme: 'striped',
    margin: { left: MARGIN, right: MARGIN, bottom: 14 },
    headStyles: {
      fillColor: BRAND_BLUE,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      cellPadding: 1.5,
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.45,
      lineColor: [230, 233, 238],
      lineWidth: 0.1,
      valign: 'middle',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 44 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 31, halign: 'right' },
    },
  });
  return doc.lastAutoTable.finalY + 7;
}

async function loadLogo() {
  try {
    return await getBase64ImageFromURL(logoProfessional);
  } catch {
    return null;
  }
}

export async function generateDriverSalaryPdfReport(summary) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logoData = await loadLogo();
  const generatedOn = new Date().toLocaleDateString('en-IN');

  let y = drawHeader(doc, pageWidth, {
    logoData,
    title: 'Salary Statement',
    subtitle: summary.driver_name,
    metaLines: [`Generated: ${generatedOn}`, 'Salary cycle: 16th – 15th'],
  });
  y = drawSummaryCards(doc, y, pageWidth, [
    { label: 'PREVIOUS EARNED', value: formatCurrency(summary.previous_cycle.gross_earnings), tone: BRAND_GREEN },
    { label: 'CURRENT EARNED', value: formatCurrency(summary.current_cycle.gross_earnings), tone: BRAND_GREEN },
    { label: 'CURRENT PAYABLE', value: formatCurrency(summary.current_cycle.net_payable) },
  ]);
  y = drawCycleSection(doc, y, pageWidth, summary.previous_cycle, 'Previous salary cycle', 'Finalised cycle', summary.salary_rules);
  drawCycleSection(doc, y, pageWidth, summary.current_cycle, 'Current salary cycle', 'Earnings to date', summary.salary_rules);

  drawFooter(doc, pageWidth, pageHeight, `Salary Statement • ${summary.driver_name}`);
  doc.save(`${safeFilePart(summary.driver_name)}_Salary_Statement.pdf`);
}

export async function generateAdminSalaryPdfReport(summary) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logoData = await loadLogo();
  const generatedOn = new Date().toLocaleDateString('en-IN');
  const previousTotals = summary.previous_cycle?.totals || {};
  const currentTotals = summary.current_cycle?.totals || {};

  let y = drawHeader(doc, pageWidth, {
    logoData,
    title: 'Driver Salary Overview',
    subtitle: 'All active drivers • Previous and current salary cycles',
    metaLines: [`Generated: ${generatedOn}`, 'Salary cycle: 16th – 15th'],
  });
  y = drawSummaryCards(doc, y, pageWidth, [
    { label: 'PREVIOUS EARNED', value: formatCurrency(previousTotals.gross_earnings), tone: BRAND_GREEN },
    { label: 'PREVIOUS PAYABLE', value: formatCurrency(previousTotals.net_payable) },
    { label: 'CURRENT EARNED', value: formatCurrency(currentTotals.gross_earnings), tone: BRAND_GREEN },
    { label: 'CURRENT PAYABLE', value: formatCurrency(currentTotals.net_payable) },
  ]);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND_BLUE);
  doc.text(`Previous: ${formatDate(summary.previous_cycle.cycle_start)} – ${formatDate(summary.previous_cycle.cycle_end)} (finalised)`, MARGIN, y + 2);
  doc.text(`Current: ${formatDate(summary.current_cycle.cycle_start)} – ${formatDate(summary.current_cycle.cycle_end)} (earnings to date)`, pageWidth - MARGIN, y + 2, { align: 'right' });

  const rows = (summary.drivers || []).map((driver) => [
    driver.driver_name,
    formatCurrency(driver.previous_cycle.gross_earnings),
    formatCurrency(driver.previous_cycle.advance_paid),
    formatCurrency(driver.previous_cycle.net_payable),
    formatCurrency(driver.current_cycle.gross_earnings),
    formatCurrency(driver.current_cycle.advance_paid),
    formatCurrency(driver.current_cycle.net_payable),
    String(driver.current_cycle.total_rides),
  ]);
  rows.push([
    'Portfolio total',
    formatCurrency(previousTotals.gross_earnings),
    formatCurrency(previousTotals.advance_paid),
    formatCurrency(previousTotals.net_payable),
    formatCurrency(currentTotals.gross_earnings),
    formatCurrency(currentTotals.advance_paid),
    formatCurrency(currentTotals.net_payable),
    String(currentTotals.total_rides || 0),
  ]);

  autoTable(doc, {
    startY: y + 6,
    head: [[
      'Driver', 'Previous earned', 'Previous advance', 'Previous payable',
      'Current earned', 'Current advance', 'Current payable', 'Current rides',
    ]],
    body: rows,
    theme: 'striped',
    margin: { left: MARGIN, right: MARGIN, top: 10, bottom: 14 },
    headStyles: {
      fillColor: BRAND_BLUE,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7.2,
      halign: 'center',
      cellPadding: 1.8,
    },
    styles: {
      fontSize: 7.2,
      cellPadding: 1.8,
      lineColor: [230, 233, 238],
      lineWidth: 0.1,
      valign: 'middle',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { cellWidth: 19, halign: 'center' },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.row.index === rows.length - 1) {
        data.cell.styles.fillColor = [232, 240, 250];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = BRAND_BLUE;
      }
    },
  });

  drawFooter(doc, pageWidth, pageHeight, 'Driver Salary Overview');
  doc.save(`Driver_Salary_Overview_${summary.current_cycle.cycle_end}.pdf`);
}
