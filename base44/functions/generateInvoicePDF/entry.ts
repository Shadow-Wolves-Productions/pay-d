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
    // Both sides are anchored to the same headerTopY so they stay vertically aligned.
    const headerTopY = y;
    const logoMaxH = (template.logo_size || 80) * 0.264583; // px to mm
    const logoMaxW = 53; // max width in mm (~200px)

    let leftBottomY = headerTopY;

    if (logoImg) {
      try {
        // Use a temporary canvas approach: clamp to max box while preserving aspect ratio.
        // jsPDF's addImage takes (data, format, x, y, w, h) — if we pass 0 for one dimension
        // it stretches, so we must calculate explicitly.
        // We'll place at max box and let the natural image dims handle it via getImageProperties.
        const props = doc.getImageProperties(logoImg.data);
        const naturalW = props.width;
        const naturalH = props.height;
        const scale = Math.min(logoMaxW / naturalW, logoMaxH / naturalH);
        const drawW = naturalW * scale;
        const drawH = naturalH * scale;
        doc.addImage(logoImg.data, logoImg.format, PL, headerTopY, drawW, drawH, '', 'FAST');
        leftBottomY = headerTopY + drawH + 3;
      } catch {
        // skip logo if it fails
      }
    }

    // Business name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(17, 17, 17);
    doc.text(template.business_name || 'Your Business', PL, leftBottomY + 5);
    leftBottomY += 8;

    if (template.tagline) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(template.tagline, PL, leftBottomY + 2);
      leftBottomY += 6;
    }

    // Title (right side) — always anchored to headerTopY, never pushed by logo
    const titleText = gstEnabled ? 'TAX INVOICE' : (invoice.title || 'INVOICE').toUpperCase();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(ar, ag, ab);
    doc.text(titleText, W - PR, headerTopY + 7, { align: 'right' });

    // Invoice number below title
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text('#' + invoice.invoice_number, W - PR, headerTopY + 14, { align: 'right' });

    y = Math.max(leftBottomY, headerTopY + 20) + 4;

    // ── Accent divider under header ───────────────────────────────────────────
    doc.setDrawColor(ar, ag, ab);
    doc.setLineWidth(0.4);
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
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 17, 17);
    if (template.business_name) { doc.text(template.business_name, PL, fromY); fromY += 4.5; }
    doc.setFont('helvetica', 'normal');
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
    doc.setLineWidth(0.1);
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

    doc.text('DESCRIPTION', tableLeft, y);
    doc.text('QTY', qtyX, y, { align: 'center' });
    doc.text('UNIT', unitX, y, { align: 'center' });
    doc.text('UNIT PRICE', priceX, y, { align: 'right' });
    if (gstEnabled) doc.text('GST', gstX, y, { align: 'right' });
    doc.text('AMOUNT', amtX, y, { align: 'right' });
    y += 4;

    // Accent underline BELOW header text, with gap before first row
    doc.setDrawColor(ar, ag, ab);
    doc.setLineWidth(0.4);
    doc.line(tableLeft, y, tableRight, y);
    y += 6;

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.1);
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
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.1);
      doc.line(tableLeft, y - 1, tableRight, y - 1);
    });

    y += 8;

    // ── Totals block — label aligns with divider start, value right-aligned ──
    const totLabelX = W - PR - 65;
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
    doc.setLineWidth(0.4);
    doc.line(totLabelX, y, totValX, y);
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
          const [label, ...rest] = m.split(': ');
          doc.setFont('helvetica', 'bold');
          doc.text(label + ':', PL, leftY);
          const labelWidth = doc.getTextWidth(label + ': ');
          doc.setFont('helvetica', 'normal');
          const wrapped = doc.splitTextToSize(rest.join(': '), halfW - labelWidth);
          doc.text(wrapped, PL + labelWidth, leftY);
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

    // ── Footer — spans full width with items spread (like preview flex space-between) ──
    const footerY = pageH - 14;
    doc.setDrawColor(ar, ag, ab);
    doc.setLineWidth(0.4);
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

    if (footerParts.length > 0) {
      const footerTextY = footerY + 5;
      if (footerParts.length === 1) {
        doc.text(footerParts[0], PL, footerTextY);
      } else {
        // Build full string with separator dots then measure each segment to space evenly
        const sep = '  \u00b7  ';
        const fullText = footerParts.join(sep);
        const totalTextW = doc.getTextWidth(fullText);
        const availW = W - PL - PR;
        if (totalTextW >= availW) {
          // Too wide — just render as-is left aligned
          doc.text(fullText, PL, footerTextY);
        } else {
          // Spread: place first item at left, last at right, others evenly spaced
          const sepW = doc.getTextWidth(sep);
          const itemWidths = footerParts.map(p => doc.getTextWidth(p));
          const totalItemW = itemWidths.reduce((a, b) => a + b, 0);
          const totalSepW = sepW * (footerParts.length - 1);
          const extraSpace = availW - totalItemW - totalSepW;
          const bonusPerGap = extraSpace / (footerParts.length - 1);
          let xPos = PL;
          footerParts.forEach((part, i) => {
            doc.text(part, xPos, footerTextY);
            xPos += itemWidths[i];
            if (i < footerParts.length - 1) {
              doc.text('\u00b7', xPos + sepW / 2 + bonusPerGap / 2, footerTextY, { align: 'center' });
              xPos += sepW + bonusPerGap;
            }
          });
        }
      }
    }

    const pdfBase64 = doc.output('datauristring').split(',')[1];
    return Response.json({ pdf: pdfBase64 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});