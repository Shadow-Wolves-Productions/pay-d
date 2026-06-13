import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@2.5.2';

function formatAUD(val) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 }).format(val || 0);
}

function hexToRgb(hex) {
  const clean = (hex || '#f59e0b').replace('#', '');
  return [parseInt(clean.slice(0,2),16), parseInt(clean.slice(2,4),16), parseInt(clean.slice(4,6),16)];
}

function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

async function loadImageAsBase64(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    const b64 = btoa(binary);
    const ct = res.headers.get('content-type') || 'image/png';
    return { data: b64, format: ct.includes('png') ? 'PNG' : 'JPEG' };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { invoice, template } = await req.json();
    if (!invoice || !template) {
      return Response.json({ error: 'Missing invoice or template' }, { status: 400 });
    }

    const accent = invoice.accent_colour || template.accent_colour || '#f59e0b';
    const [ar, ag, ab] = hexToRgb(accent);
    const gstEnabled = template.gst_enabled ?? true;
    const bill = invoice.bill_to || {};
    const ship = invoice.ship_to_same_as_bill ? bill : (invoice.ship_to || {});
    const items = invoice.line_items || [];

    // Pre-load logo
    let logoImg = null;
    if (template.logo_url) {
      logoImg = await loadImageAsBase64(template.logo_url);
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const W = 210;
    const PL = 20;
    const PR = 22;
    const pageH = 297;
    let y = 0;

    // ── Thin accent top bar (matches 6px = ~2.1mm) ───────────────────────────
    doc.setFillColor(ar, ag, ab);
    doc.rect(0, 0, W, 2.1, 'F');
    y = 10;

    // ── Header: Logo + Business Name (left) | Invoice Title (right) ──────────
    // Logo
    const logoMaxH = (template.logo_size || 80) * 0.264583; // px to mm
    const logoMaxW = 53; // ~200px
    if (logoImg) {
      try {
        // Add image, fit within box
        doc.addImage(logoImg.data, logoImg.format, PL, y, logoMaxW, logoMaxH, '', 'FAST');
        y += logoMaxH + 3.5;
      } catch {
        // skip logo if it fails
      }
    }

    // Business name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(17, 17, 17);
    doc.text(template.business_name || 'Your Business', PL, y + 5);

    if (template.tagline) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(template.tagline, PL, y + 10);
    }

    // Title (right side) — drawn at same y as business name
    const titleText = gstEnabled ? 'TAX INVOICE' : (invoice.title || 'INVOICE').toUpperCase();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(ar, ag, ab);
    doc.text(titleText, W - PR, y + 5, { align: 'right' });

    // Invoice number below title
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text('#' + invoice.invoice_number, W - PR, y + 12, { align: 'right' });

    y += 22;

    // ── Accent divider under header ───────────────────────────────────────────
    doc.setDrawColor(ar, ag, ab);
    doc.setLineWidth(0.7);
    doc.line(PL, y, W - PR, y);
    y += 9;

    // ── From (left) | Details (right) ─────────────────────────────────────────
    const colW = (W - PL - PR) / 2;
    const rightX = W - PR;
    const sectionLabelSize = 7;
    const sectionBodySize = 8.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sectionLabelSize);
    doc.setTextColor(107, 114, 128);
    doc.text('FROM', PL, y);
    doc.text('DETAILS', rightX, y, { align: 'right' });
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(sectionBodySize);

    let fromY = y;
    doc.setTextColor(107, 114, 128);
    if (template.abn) { doc.text('ABN ' + template.abn, PL, fromY); fromY += 4.5; }
    doc.setTextColor(55, 65, 81);
    if (template.address) {
      const lines = doc.splitTextToSize(template.address, colW - 5);
      doc.text(lines, PL, fromY); fromY += lines.length * 4.5;
    }
    if (template.email) { doc.text(template.email, PL, fromY); fromY += 4.5; }
    if (template.phone) { doc.text(template.phone, PL, fromY); fromY += 4.5; }
    if (template.website) {
      doc.setTextColor(ar, ag, ab);
      doc.text(template.website, PL, fromY);
      doc.setTextColor(55, 65, 81);
    }

    let dateY = y;
    doc.setFontSize(sectionBodySize);
    doc.setTextColor(55, 65, 81);

    const renderDateRow = (label, val, valColor) => {
      const labelW = doc.getTextWidth(label + ' ');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(55, 65, 81);
      doc.text(label, rightX - doc.getTextWidth(label + ' ') - doc.getTextWidth(formatDate(val)), dateY);
      doc.setFont('helvetica', 'bold');
      if (valColor) doc.setTextColor(...valColor); else doc.setTextColor(55, 65, 81);
      doc.text(formatDate(val), rightX, dateY, { align: 'right' });
      doc.setTextColor(55, 65, 81);
      dateY += 4.5;
    };

    // Simple right-aligned date rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(sectionBodySize);
    doc.setTextColor(55, 65, 81);
    doc.text('Issue Date: ', W - PR - 40, dateY);
    doc.setFont('helvetica', 'bold');
    doc.text(formatDate(invoice.issue_date), rightX, dateY, { align: 'right' });
    dateY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    doc.text('Due Date: ', W - PR - 40, dateY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 50, 50);
    doc.text(formatDate(invoice.due_date), rightX, dateY, { align: 'right' });
    doc.setTextColor(55, 65, 81);
    dateY += 4.5;

    if (invoice.po_reference) {
      doc.setFont('helvetica', 'normal');
      doc.text('PO/Ref: ', W - PR - 40, dateY);
      doc.setFont('helvetica', 'bold');
      doc.text(invoice.po_reference, rightX, dateY, { align: 'right' });
      dateY += 4.5;
    }

    y = Math.max(fromY, dateY) + 9;

    // ── Light divider ─────────────────────────────────────────────────────────
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.25);
    doc.line(PL, y, W - PR, y);
    y += 8;

    // ── Bill To / Ship To ─────────────────────────────────────────────────────
    const hasShip = !invoice.ship_to_same_as_bill && (ship.business_name || ship.contact_name || ship.address);
    const billColW = hasShip ? colW - 5 : (W - PL - PR);
    const shipX = PL + colW + 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sectionLabelSize);
    doc.setTextColor(107, 114, 128);
    doc.text('BILL TO', PL, y);
    if (hasShip) doc.text('SHIP TO', shipX, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(sectionBodySize);
    doc.setTextColor(55, 65, 81);

    const billLines = [
      bill.business_name && { text: bill.business_name, bold: true },
      bill.contact_name  && { text: bill.contact_name },
      bill.abn           && { text: 'ABN ' + bill.abn, color: [107,114,128] },
      bill.address       && { text: bill.address },
      bill.email         && { text: bill.email },
      bill.phone         && { text: bill.phone },
    ].filter(Boolean);

    let billY = y;
    billLines.forEach(line => {
      doc.setFont('helvetica', line.bold ? 'bold' : 'normal');
      if (line.color) doc.setTextColor(...line.color); else doc.setTextColor(55, 65, 81);
      const wrapped = doc.splitTextToSize(line.text, billColW);
      doc.text(wrapped, PL, billY);
      billY += wrapped.length * 4.5;
    });

    let shipY = y;
    if (hasShip) {
      const shipLines = [
        ship.business_name && { text: ship.business_name, bold: true },
        ship.contact_name  && { text: ship.contact_name },
        ship.address       && { text: ship.address },
      ].filter(Boolean);
      shipLines.forEach(line => {
        doc.setFont('helvetica', line.bold ? 'bold' : 'normal');
        doc.setTextColor(55, 65, 81);
        const wrapped = doc.splitTextToSize(line.text, colW - 5);
        doc.text(wrapped, shipX, shipY);
        shipY += wrapped.length * 4.5;
      });
    }

    y = Math.max(billY, shipY) + 10;

    // ── Line items table ──────────────────────────────────────────────────────
    const tableLeft  = PL;
    const tableRight = W - PR;
    const tableW     = tableRight - tableLeft;

    const descW = gstEnabled ? tableW - 22 - 22 - 25 - 20 : tableW - 22 - 22 - 25;
    const qtyX   = tableLeft + descW + 11;
    const unitX  = qtyX + 22;
    const priceX = unitX + 22;
    const gstX   = gstEnabled ? priceX + 15 : 0;
    const amtX   = tableRight;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);

    doc.setDrawColor(ar, ag, ab);
    doc.setLineWidth(0.7);
    doc.line(tableLeft, y + 3.5, tableRight, y + 3.5);

    doc.text('DESCRIPTION', tableLeft, y);
    doc.text('QTY', qtyX, y, { align: 'center' });
    doc.text('UNIT', unitX, y, { align: 'center' });
    doc.text('UNIT PRICE', priceX, y, { align: 'right' });
    if (gstEnabled) doc.text('GST', gstX, y, { align: 'right' });
    doc.text('AMOUNT', amtX, y, { align: 'right' });
    y += 7;

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.25);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    items.forEach((item) => {
      const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
      const gstAmt = item.gst ? lineTotal * 0.1 : 0;
      const descLines = doc.splitTextToSize(item.description || '', descW - 2);
      const rowH = Math.max(descLines.length * 4.5 + 3, 8);

      doc.setTextColor(55, 65, 81);
      doc.text(descLines, tableLeft, y);
      doc.text(String(item.quantity ?? ''), qtyX, y, { align: 'center' });
      doc.setTextColor(156, 163, 175);
      doc.text(item.unit || '', unitX, y, { align: 'center' });
      doc.setTextColor(55, 65, 81);
      doc.setFont('helvetica', 'normal');
      doc.text(formatAUD(item.unit_price), priceX, y, { align: 'right' });
      if (gstEnabled) {
        doc.text(item.gst ? formatAUD(gstAmt) : '\u2014', gstX, y, { align: 'right' });
      }
      doc.setFont('helvetica', 'bold');
      doc.text(formatAUD(lineTotal), amtX, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      y += rowH;
      doc.line(tableLeft, y - 1.5, tableRight, y - 1.5);
    });

    y += 8;

    // ── Totals block ──────────────────────────────────────────────────────────
    const totLabelX = W - PR - 55;
    const totValX   = W - PR;

    const addRow = (label, value, bold = false, color = [107, 114, 128]) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(bold ? 10 : 8.5);
      doc.setTextColor(...color);
      doc.text(label, totLabelX, y);
      doc.text(value, totValX, y, { align: 'right' });
      y += bold ? 7 : 5.5;
    };

    addRow('Subtotal', formatAUD(invoice.subtotal));
    if ((invoice.discount_amount || 0) > 0) addRow('Discount', '-' + formatAUD(invoice.discount_amount));
    if (gstEnabled) addRow('GST (10%)', formatAUD(invoice.gst_amount));

    // Accent divider before total
    doc.setDrawColor(ar, ag, ab);
    doc.setLineWidth(0.7);
    doc.line(totLabelX - 2, y, totValX, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(17, 17, 17);
    doc.text('Total Due', totLabelX, y);
    doc.setTextColor(ar, ag, ab);
    doc.text(formatAUD(invoice.total), totValX, y, { align: 'right' });
    y += 5;

    if (gstEnabled && (invoice.gst_amount || 0) > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(156, 163, 175);
      doc.text('Includes ' + formatAUD(invoice.gst_amount) + ' GST', totValX, y, { align: 'right' });
      y += 5;
    }

    y += 10;

    // ── Payment Details & Terms — two columns ─────────────────────────────────
    const paymentMethods = [
      template.bank_name      && 'Bank: ' + template.bank_name,
      template.account_name   && 'Account Name: ' + template.account_name,
      template.bsb            && 'BSB: ' + template.bsb,
      template.account_number && 'Account: ' + template.account_number,
      template.paypal_email   && 'PayPal: ' + template.paypal_email,
      template.pay_id         && 'PayID: ' + template.pay_id,
      template.other_payment  && template.other_payment,
    ].filter(Boolean);

    const halfW = (W - PL - PR) / 2 - 8;
    const rightColX = PL + halfW + 16;
    const hasPayment = paymentMethods.length > 0;
    const hasTerms   = !!(invoice.payment_terms || invoice.notes);

    if (hasPayment || hasTerms) {
      let leftY = y;
      if (hasPayment) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(sectionLabelSize);
        doc.setTextColor(107, 114, 128);
        doc.text('PAYMENT DETAILS', PL, leftY);
        leftY += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(55, 65, 81);
        paymentMethods.forEach(m => {
          const wrapped = doc.splitTextToSize(m, halfW);
          doc.text(wrapped, PL, leftY);
          leftY += wrapped.length * 4.5;
        });
      }

      let rightY = y;
      if (invoice.payment_terms) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(sectionLabelSize);
        doc.setTextColor(107, 114, 128);
        doc.text('PAYMENT TERMS', rightColX, rightY);
        rightY += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(55, 65, 81);
        const termLines = doc.splitTextToSize(invoice.payment_terms, halfW);
        doc.text(termLines, rightColX, rightY);
        rightY += termLines.length * 4.5 + 6;
      }
      if (invoice.notes) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(sectionLabelSize);
        doc.setTextColor(107, 114, 128);
        doc.text('NOTES', rightColX, rightY);
        rightY += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(55, 65, 81);
        const noteLines = doc.splitTextToSize(invoice.notes, halfW);
        doc.text(noteLines, rightColX, rightY);
      }
    }

    // ── Footer — full width, left-to-right like preview ───────────────────────
    const footerY = pageH - 14;
    doc.setDrawColor(ar, ag, ab);
    doc.setLineWidth(0.7);
    doc.line(PL, footerY, W - PR, footerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);

    const footerParts = [
      template.business_name,
      template.abn && 'ABN ' + template.abn,
      template.email,
      gstEnabled && 'Registered for GST',
    ].filter(Boolean);

    // Spread footer items evenly across the full width (left-aligned like preview)
    if (footerParts.length > 0) {
      const footerText = footerParts.join('  ·  ');
      doc.text(footerText, PL, footerY + 5);
    }

    const pdfBase64 = doc.output('datauristring').split(',')[1];
    return Response.json({ pdf: pdfBase64 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});