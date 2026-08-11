import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoProfessional from '../assets/logo-professional.png';

const BRAND_BLUE = [31, 58, 95];
const MARGIN_X = 10;
const MARGIN_TOP = 10;
const FOOTER_GAP = 12;
const CONT_TOP = 10;

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

function safeFilePart(value, fallback = 'Report') {
  return String(value || fallback).replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '') || fallback;
}

function fitText(doc, text, maxWidth, maxFontSize, minFontSize = 10) {
  doc.setFont('helvetica', 'bold');
  let size = maxFontSize;
  while (size > minFontSize) {
    doc.setFontSize(size);
    if (doc.getTextWidth(text) <= maxWidth) break;
    size -= 0.5;
  }
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(text, maxWidth);
  return { lines: lines.slice(0, 2), fontSize: size };
}

function buildRideRows(reports, { includeCompany = false } = {}) {
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
    if (includeCompany && a.companyName !== b.companyName) {
      return a.companyName.localeCompare(b.companyName);
    }
    if (a.driverName !== b.driverName) return a.driverName.localeCompare(b.driverName);
    return (a.time || '').localeCompare(b.time || '');
  });

  const dayCounters = {};
  rows.forEach((row) => {
    const key = includeCompany
      ? `${row.date}|${row.companyName}|${row.driverName}`
      : `${row.date}|${row.driverName}`;
    dayCounters[key] = (dayCounters[key] || 0) + 1;
    row.dayNo = dayCounters[key];
  });

  return rows;
}

function resolveReportIdentity({ filters, companies, drivers }) {
  const company = companies.find((c) => String(c.id) === String(filters.company_id));
  const driver = drivers.find((d) => String(d.id) === String(filters.driver_id));
  const companyName = company?.name || '';
  const driverName = driver?.name || '';
  const vehicleNumber = filters.vehicle_number || '';

  const hasCompany = Boolean(filters.company_id);
  const hasDriver = Boolean(filters.driver_id);
  const hasVehicle = Boolean(filters.vehicle_number);

  let title = 'All Rides';
  let subtitle = 'Admin Ride Report';
  let footerLabel = 'Admin Report';
  const fileParts = [];

  if (hasCompany && hasDriver && hasVehicle) {
    title = companyName;
    subtitle = `Driver: ${driverName}  •  Vehicle: ${vehicleNumber}`;
    footerLabel = `${companyName} / ${driverName} / ${vehicleNumber}`;
    fileParts.push(companyName, driverName, vehicleNumber);
  } else if (hasCompany && hasDriver) {
    title = companyName;
    subtitle = `Driver Ride Report — ${driverName}`;
    footerLabel = `${companyName} / ${driverName}`;
    fileParts.push(companyName, driverName);
  } else if (hasCompany && hasVehicle) {
    title = companyName;
    subtitle = `Vehicle Ride Report — ${vehicleNumber}`;
    footerLabel = `${companyName} / ${vehicleNumber}`;
    fileParts.push(companyName, vehicleNumber);
  } else if (hasDriver && hasVehicle) {
    title = driverName;
    subtitle = `Vehicle Ride Report — ${vehicleNumber}`;
    footerLabel = `${driverName} / ${vehicleNumber}`;
    fileParts.push(driverName, vehicleNumber);
  } else if (hasCompany) {
    title = companyName;
    subtitle = 'Company Ride Report';
    footerLabel = companyName;
    fileParts.push(companyName);
  } else if (hasDriver) {
    title = driverName;
    subtitle = 'Driver Ride Report';
    footerLabel = driverName;
    fileParts.push(driverName);
  } else if (hasVehicle) {
    title = `Vehicle ${vehicleNumber}`;
    subtitle = 'Vehicle Ride Report';
    footerLabel = vehicleNumber;
    fileParts.push(`Vehicle_${vehicleNumber}`);
  } else {
    fileParts.push('All_Rides');
  }

  return {
    title,
    subtitle,
    footerLabel,
    companyName: companyName || 'All Companies',
    driverLabel: driverName || 'All Drivers',
    vehicleLabel: vehicleNumber || 'All Vehicles',
    hasCompany,
    hasDriver,
    hasVehicle,
    fileParts,
  };
}

function drawFooter(doc, pageWidth, pageHeight, subtitle) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(210);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_X, pageHeight - 8, pageWidth - MARGIN_X, pageHeight - 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(`© HeadGreen! — ${subtitle}`, pageWidth / 2, pageHeight - 4.5, { align: 'center' });
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - MARGIN_X, pageHeight - 4.5, { align: 'right' });
  }
}

function drawCleanHeader(doc, pageWidth, {
  logoData,
  title,
  subtitle,
  metaLines,
}) {
  let x = MARGIN_X;

  if (logoData) {
    const maxW = 26;
    const maxH = 14;
    let w = maxW;
    let h = (logoData.height * maxW) / logoData.width;
    if (h > maxH) {
      h = maxH;
      w = (logoData.width * maxH) / logoData.height;
    }
    doc.addImage(logoData.dataURL, 'PNG', x, MARGIN_TOP - 1, w, h);
    x += w + 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BRAND_BLUE);
  doc.text("Driver's Diary", x, MARGIN_TOP + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(110);
  doc.text('Premium Cab Services by HeadGreen!', x, MARGIN_TOP + 9.5);

  doc.setFontSize(8);
  doc.setTextColor(...BRAND_BLUE);
  metaLines.forEach((line, i) => {
    doc.text(line, pageWidth - MARGIN_X, MARGIN_TOP + 3.5 + i * 4, { align: 'right' });
  });

  doc.setDrawColor(...BRAND_BLUE);
  doc.setLineWidth(0.55);
  doc.line(MARGIN_X, 26, pageWidth - MARGIN_X, 26);

  const titleMaxWidth = pageWidth - MARGIN_X * 2;
  const { lines, fontSize } = fitText(doc, title, titleMaxWidth, 16, 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize);
  doc.setTextColor(...BRAND_BLUE);
  let y = 33;
  lines.forEach((line) => {
    doc.text(line, pageWidth / 2, y, { align: 'center' });
    y += fontSize * 0.42;
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(subtitle, pageWidth / 2, y + 1.5, { align: 'center' });

  return y + 6;
}

function drawSummaryRow(doc, startY, pageWidth, items) {
  const gap = 2.5;
  const boxW = (pageWidth - MARGIN_X * 2 - gap * (items.length - 1)) / items.length;
  const boxH = 12;

  items.forEach((item, i) => {
    const x = MARGIN_X + i * (boxW + gap);
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(220, 225, 232);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, startY, boxW, boxH, 1.2, 1.2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(110);
    doc.text(item.label, x + 2.5, startY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND_BLUE);
    doc.text(String(item.value), x + 2.5, startY + 9.5);
  });

  return startY + boxH + 4;
}

function buildTableConfig({ includeCompany, includeDriver, includeVehicle }) {
  const head = ['Date', 'No'];
  if (includeDriver) head.push('Driver');
  if (includeCompany) head.push('Client');
  head.push('P/D', 'Time', 'Route');
  if (includeVehicle) head.push('Vehicle');
  head.push('Km');

  // Portrait usable width ~ 190mm with 10mm margins
  const columnStyles = {
    0: { cellWidth: 15, halign: 'center' },
    1: { cellWidth: 8, halign: 'center' },
  };

  let idx = 2;
  if (includeDriver) {
    columnStyles[idx] = { cellWidth: 24 };
    idx += 1;
  }
  if (includeCompany) {
    columnStyles[idx] = { cellWidth: 22 };
    idx += 1;
  }
  columnStyles[idx] = { cellWidth: 8, halign: 'center' }; // P/D
  idx += 1;
  columnStyles[idx] = { cellWidth: 15, halign: 'center' }; // Time
  idx += 1;
  columnStyles[idx] = { cellWidth: 'auto' }; // Route
  idx += 1;
  if (includeVehicle) {
    columnStyles[idx] = { cellWidth: 16, halign: 'center' };
    idx += 1;
  }
  columnStyles[idx] = { cellWidth: 13, halign: 'right' }; // Km

  return { head: [head], columnStyles };
}

function mapBodyRows(rideRows, { includeCompany, includeDriver, includeVehicle }) {
  if (!rideRows.length) {
    const empty = ['-', '-'];
    if (includeDriver) empty.push('-');
    if (includeCompany) empty.push('-');
    empty.push('-', '-', 'No rides for selected filters');
    if (includeVehicle) empty.push('-');
    empty.push('-');
    return [empty];
  }

  return rideRows.map((row) => {
    const cells = [formatDateShort(row.date), row.dayNo];
    if (includeDriver) cells.push(row.driverName);
    if (includeCompany) cells.push(row.companyName || '-');
    cells.push(
      row.tripType || '',
      formatTime(row.time),
      row.route || '-',
    );
    if (includeVehicle) cells.push(row.vehicle || '-');
    cells.push(row.km != null && row.km !== '' ? Number(row.km).toLocaleString('en-IN') : '-');
    return cells;
  });
}

async function createPortraitReport({
  title,
  subtitle,
  metaLines,
  footerLabel,
  filename,
  rideRows,
  includeCompany = false,
  includeDriver = true,
  includeVehicle = true,
  summaryItems,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let logoData = null;
  try {
    logoData = await getBase64ImageFromURL(logoProfessional);
  } catch {
    // Continue without logo.
  }

  let startY = drawCleanHeader(doc, pageWidth, {
    logoData,
    title,
    subtitle,
    metaLines,
  });
  startY = drawSummaryRow(doc, startY, pageWidth, summaryItems);

  const { head, columnStyles } = buildTableConfig({
    includeCompany,
    includeDriver,
    includeVehicle,
  });
  const body = mapBodyRows(rideRows, { includeCompany, includeDriver, includeVehicle });

  autoTable(doc, {
    startY,
    head,
    body,
    theme: 'striped',
    // Continuation pages: tight top margin, no repeated header
    showHead: 'firstPage',
    margin: { left: MARGIN_X, right: MARGIN_X, top: CONT_TOP, bottom: FOOTER_GAP },
    tableWidth: pageWidth - MARGIN_X * 2,
    headStyles: {
      fillColor: BRAND_BLUE,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 7.5,
      cellPadding: 1.6,
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.4,
      valign: 'middle',
      overflow: 'linebreak',
      lineColor: [230, 233, 238],
      lineWidth: 0.1,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles,
  });

  const finalY = doc.lastAutoTable.finalY + 5;
  if (finalY < pageHeight - 18) {
    doc.setFillColor(...BRAND_BLUE);
    doc.roundedRect(MARGIN_X, finalY, pageWidth - MARGIN_X * 2, 10, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Report Summary', MARGIN_X + 3, finalY + 3.8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const summaryText = summaryItems.map((s) => `${s.label}: ${s.value}`).join('   |   ');
    doc.text(summaryText, MARGIN_X + 3, finalY + 7.8);
  }

  drawFooter(doc, pageWidth, pageHeight, footerLabel);
  doc.save(filename);
}

export async function generateAdminPdfReport({
  filters,
  companies,
  drivers,
  reports,
  stats = null,
}) {
  const identity = resolveReportIdentity({ filters, companies, drivers });
  const includeCompany = !identity.hasCompany;
  const includeDriver = !identity.hasDriver;
  const includeVehicle = !identity.hasVehicle;

  const periodLabel = `${formatDateLong(filters.start_date)} — ${formatDateLong(filters.end_date)}`;
  const rideRows = buildRideRows(reports, { includeCompany });
  const totalRides = rideRows.length;
  const totalKm = rideRows.reduce((sum, row) => sum + (parseFloat(row.km) || 0), 0);
  const uniqueDrivers = new Set(rideRows.map((r) => r.driverName)).size;

  let ridesCount = totalRides;
  let kmCount = totalKm;
  if (stats?.company_breakdown?.length && identity.hasCompany) {
    const match = stats.company_breakdown.find((item) => item.name === identity.companyName);
    if (match) {
      ridesCount = match.count;
      kmCount = parseFloat(match.total_km) || totalKm;
    }
  } else if (stats?.total_rides != null) {
    ridesCount = stats.total_rides;
  }

  const metaLines = [periodLabel];
  if (identity.hasDriver) metaLines.push(`Driver: ${identity.driverLabel}`);
  else if (identity.hasVehicle) metaLines.push(`Vehicle: ${identity.vehicleLabel}`);
  else metaLines.push(`Driver: ${identity.driverLabel}`);

  if (identity.hasVehicle && identity.hasDriver) {
    metaLines.push(`Vehicle: ${identity.vehicleLabel}`);
  } else if (!identity.hasVehicle && identity.hasCompany) {
    metaLines.push(`Generated: ${new Date().toLocaleDateString('en-IN')}`);
  } else {
    metaLines.push(`Generated: ${new Date().toLocaleDateString('en-IN')}`);
  }

  // Keep meta to max 3 lines for clean header
  const trimmedMeta = metaLines.slice(0, 3);

  const fileStem = identity.fileParts.map((p) => safeFilePart(p)).join('_');
  const filename = `${fileStem}_${filters.start_date}_to_${filters.end_date}_Report.pdf`;

  await createPortraitReport({
    title: identity.title,
    subtitle: identity.subtitle,
    metaLines: trimmedMeta,
    footerLabel: identity.footerLabel,
    filename,
    rideRows,
    includeCompany,
    includeDriver,
    includeVehicle,
    summaryItems: [
      { label: 'Total Rides', value: ridesCount },
      { label: 'Distance', value: `${Number(kmCount).toLocaleString('en-IN')} km` },
      { label: 'Drivers', value: uniqueDrivers },
      { label: 'Period', value: `${formatDateShort(filters.start_date)} – ${formatDateShort(filters.end_date)}` },
    ],
  });
}

export async function generateMonthlyCompanyPdfReport({ month, year, companies, reports, stats = null }) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const monthLabel = monthNames[month - 1] || String(month);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const rideRows = buildRideRows(reports, { includeCompany: true });
  const totalRides = rideRows.length;
  const totalKm = rideRows.reduce((sum, row) => sum + (parseFloat(row.km) || 0), 0);
  const uniqueDrivers = new Set(rideRows.map((r) => r.driverName)).size;
  const uniqueCompanies = new Set(rideRows.map((r) => r.companyName).filter(Boolean)).size;

  await createPortraitReport({
    title: `${monthLabel} ${year}`,
    subtitle: 'Monthly Company Ride Report',
    metaLines: [
      `${formatDateLong(start)} — ${formatDateLong(end)}`,
      `Companies: ${uniqueCompanies || companies.length}`,
      `Generated: ${new Date().toLocaleDateString('en-IN')}`,
    ],
    footerLabel: `Monthly Report ${monthLabel} ${year}`,
    filename: `monthly_report_${monthLabel}_${year}.pdf`,
    rideRows,
    includeCompany: true,
    includeDriver: true,
    includeVehicle: true,
    summaryItems: [
      { label: 'Total Rides', value: stats?.total_rides ?? totalRides },
      { label: 'Distance', value: `${Number(totalKm).toLocaleString('en-IN')} km` },
      { label: 'Drivers', value: uniqueDrivers },
      { label: 'Companies', value: uniqueCompanies },
    ],
  });
}
