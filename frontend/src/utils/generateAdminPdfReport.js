import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoProfessional from '../assets/logo-professional.png';

const BRAND_BLUE = [31, 58, 95];
const BRAND_GREEN = [16, 185, 129];
const MARGIN = 14;

function getBase64ImageFromURL(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve({
        dataURL: canvas.toDataURL('image/png'),
        width: img.width,
        height: img.height,
      });
    };
    img.onerror = reject;
    img.src = url;
  });
}

function formatTime(value) {
  if (!value) return '';
  const [hours, minutes] = value.split(':');
  return new Date(2000, 0, 1, Number(hours), Number(minutes)).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateShort(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

function formatDateLong(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatRoute(ride) {
  if (!ride) return '';
  return ride.route || [ride.pickup, ride.drop].filter(Boolean).join(' to ');
}

function buildRideRows(reports) {
  const rows = [];
  reports.forEach((row) => {
    (row.rides || []).forEach((ride) => {
      rows.push({
        date: row.date,
        driverName: row.driver_name,
        tripType: ride.trip_type,
        time: ride.ride_time,
        route: formatRoute(ride),
        vehicle: ride.vehicle_number || '',
        km: ride.total_km,
        companyName: ride.company_name || '',
      });
    });
  });

  rows.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.driverName !== b.driverName) return a.driverName.localeCompare(b.driverName);
    return (a.time || '').localeCompare(b.time || '');
  });

  const dayCounters = {};
  rows.forEach((row) => {
    dayCounters[row.date] = (dayCounters[row.date] || 0) + 1;
    row.dayNo = dayCounters[row.date];
  });

  return rows;
}

function drawPageFooter(doc, pageWidth, pageHeight, companyName) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text(
    `© HeadGreen! — ${companyName}`,
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' },
  );
  doc.text(
    `Page ${doc.internal.getNumberOfPages()}`,
    pageWidth - MARGIN,
    pageHeight - 8,
    { align: 'right' },
  );
}

function fitCenteredTitle(doc, text, maxWidth, maxFontSize = 22, minFontSize = 11, maxLines = 2) {
  doc.setFont('helvetica', 'bold');
  let fontSize = maxFontSize;

  while (fontSize >= minFontSize) {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    if (lines.length <= maxLines) {
      return { lines, fontSize, lineHeight: fontSize * 0.42 };
    }
    fontSize -= 1;
  }

  doc.setFontSize(minFontSize);
  return {
    lines: doc.splitTextToSize(text, maxWidth).slice(0, maxLines),
    fontSize: minFontSize,
    lineHeight: minFontSize * 0.42,
  };
}

function drawReportHeader(doc, pageWidth, { companyName, periodLabel, driverLabel, logoData }) {
  const headerHeight = 58;
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  const brandPanelWidth = 52;
  const brandPanelHeight = 28;
  const brandPanelX = MARGIN;
  const brandPanelY = 7;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(230, 235, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(brandPanelX, brandPanelY, brandPanelWidth, brandPanelHeight, 2.5, 2.5, 'FD');

  if (logoData) {
    const innerPadding = 3;
    const maxWidth = brandPanelWidth - innerPadding * 2;
    const maxHeight = brandPanelHeight - innerPadding * 2;
    let finalWidth = maxWidth;
    let finalHeight = (logoData.height * maxWidth) / logoData.width;
    if (finalHeight > maxHeight) {
      finalHeight = maxHeight;
      finalWidth = (logoData.width * maxHeight) / logoData.height;
    }
    const logoX = brandPanelX + (brandPanelWidth - finalWidth) / 2;
    const logoY = brandPanelY + (brandPanelHeight - finalHeight) / 2;
    doc.addImage(logoData.dataURL, 'PNG', logoX, logoY, finalWidth, finalHeight);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...BRAND_BLUE);
    doc.text('HeadGreen!', brandPanelX + brandPanelWidth / 2, brandPanelY + 18, { align: 'center' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("Driver's Diary", brandPanelX, brandPanelY + brandPanelHeight + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(200);
  doc.text('By HeadGreen!', brandPanelX, brandPanelY + brandPanelHeight + 9);

  doc.setFontSize(8.5);
  doc.setTextColor(235);
  doc.text(periodLabel, pageWidth - MARGIN, 11, { align: 'right' });
  doc.text(`Driver: ${driverLabel}`, pageWidth - MARGIN, 16, { align: 'right' });
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - MARGIN, 21, { align: 'right' });

  const horizontalInset = 76;
  const titleMaxWidth = pageWidth - horizontalInset * 2;
  const { lines: titleLines, fontSize, lineHeight } = fitCenteredTitle(
    doc,
    companyName,
    titleMaxWidth,
    22,
    11,
    2,
  );

  const titleBlockHeight = titleLines.length * lineHeight;
  const subtitleY = 38 + titleBlockHeight + 3;
  let titleY = 38;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize);
  doc.setTextColor(255, 255, 255);
  titleLines.forEach((line, index) => {
    doc.text(line, pageWidth / 2, titleY + index * lineHeight, {
      align: 'center',
      maxWidth: titleMaxWidth,
    });
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(210);
  doc.text('Company Ride Report', pageWidth / 2, subtitleY, { align: 'center' });

  doc.setDrawColor(...BRAND_GREEN);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, headerHeight + 4, pageWidth - MARGIN, headerHeight + 4);

  return headerHeight + 10;
}

function drawSummaryStrip(doc, startY, pageWidth, stats) {
  const boxWidth = (pageWidth - MARGIN * 2 - 18) / 4;
  const items = [
    { label: 'Total Rides', value: String(stats.totalRides) },
    { label: 'Total Distance', value: `${stats.totalKm.toLocaleString('en-IN')} km` },
    { label: 'Active Drivers', value: String(stats.uniqueDrivers) },
    { label: 'Report Period', value: stats.periodShort },
  ];

  items.forEach((item, index) => {
    const x = MARGIN + index * (boxWidth + 6);
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(220, 225, 232);
    doc.roundedRect(x, startY, boxWidth, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(item.label, x + 4, startY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND_BLUE);
    doc.text(item.value, x + 4, startY + 14);
  });

  return startY + 24;
}

export async function generateAdminPdfReport({
  filters,
  companies,
  drivers,
  reports,
  stats = null,
}) {
  const company = companies.find((c) => String(c.id) === String(filters.company_id));
  const companyName = company?.name || 'All Companies';
  const driver = drivers.find((d) => String(d.id) === String(filters.driver_id));
  const driverLabel = driver?.name || 'All Drivers';

  const periodLabel = `${formatDateLong(filters.start_date)} — ${formatDateLong(filters.end_date)}`;
  const periodShort = `${formatDateShort(filters.start_date)} – ${formatDateShort(filters.end_date)}`;

  const rideRows = buildRideRows(reports);
  const totalRides = rideRows.length;
  const totalKm = rideRows.reduce((sum, row) => sum + (parseFloat(row.km) || 0), 0);
  const uniqueDrivers = new Set(rideRows.map((row) => row.driverName)).size;

  const summaryStats = {
    totalRides: stats?.total_rides ?? totalRides,
    totalKm: stats?.company_breakdown?.[0]?.total_km ?? totalKm,
    uniqueDrivers: uniqueDrivers || stats?.total_drivers || 0,
    periodShort,
  };

  if (stats?.company_breakdown?.length && filters.company_id) {
    const match = stats.company_breakdown.find((item) => item.name === companyName);
    if (match) {
      summaryStats.totalRides = match.count;
      summaryStats.totalKm = parseFloat(match.total_km) || totalKm;
    }
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let logoData = null;
  try {
    logoData = await getBase64ImageFromURL(logoProfessional);
  } catch {
    // Continue without logo if asset fails to load.
  }

  let startY = drawReportHeader(doc, pageWidth, {
    companyName,
    periodLabel,
    driverLabel,
    logoData,
  });
  startY = drawSummaryStrip(doc, startY, pageWidth, summaryStats);

  const tableData = rideRows.length
    ? rideRows.map((row) => [
        formatDateShort(row.date),
        row.dayNo,
        row.driverName,
        row.tripType,
        formatTime(row.time),
        row.route,
        row.vehicle,
        row.km ? parseFloat(row.km).toLocaleString('en-IN') : '-',
      ])
    : [[
        '-',
        '-',
        '-',
        '-',
        '-',
        'No rides recorded for the selected filters.',
        '-',
        '-',
      ]];

  autoTable(doc, {
    startY,
    head: [['Date', 'No', 'Driver', 'P/D', 'Time', 'Route', 'Vehicle', 'Km']],
    body: tableData,
    theme: 'striped',
    margin: { left: MARGIN, right: MARGIN, top: 62, bottom: 16 },
    headStyles: {
      fillColor: BRAND_BLUE,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 9,
      cellPadding: 3,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      valign: 'middle',
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 28, halign: 'left' },
      3: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 'auto', halign: 'left' },
      6: { cellWidth: 22, halign: 'center' },
      7: { cellWidth: 16, halign: 'right' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: () => {
      drawPageFooter(doc, pageWidth, pageHeight, companyName);
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        data.cell.styles.cellWidth = 'wrap';
      }
    },
  });

  const finalY = doc.lastAutoTable.finalY + 10;
  if (finalY < pageHeight - 24) {
    doc.setFillColor(...BRAND_BLUE);
    doc.roundedRect(MARGIN, finalY, pageWidth - MARGIN * 2, 16, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('Report Summary', MARGIN + 6, finalY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Total Rides: ${summaryStats.totalRides}`, MARGIN + 6, finalY + 12);
    doc.text(`Total Distance: ${Number(summaryStats.totalKm).toLocaleString('en-IN')} km`, MARGIN + 70, finalY + 12);
    doc.text(`Drivers: ${summaryStats.uniqueDrivers}`, MARGIN + 140, finalY + 12);
    doc.text(`Company: ${companyName}`, pageWidth - MARGIN - 6, finalY + 12, { align: 'right' });
  }

  drawPageFooter(doc, pageWidth, pageHeight, companyName);

  const safeCompany = companyName.replace(/[^\w\-]+/g, '_');
  const safeStart = filters.start_date;
  const safeEnd = filters.end_date;
  doc.save(`${safeCompany}_${safeStart}_to_${safeEnd}_Report.pdf`);
}
