import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@2.5.2';

function formatAUD(val) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 }).format(val || 0);
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return [r, g, b];
}

function formatDate(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return d; }
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

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const W = 210;
    const margin = 18;
    let y = 0;

    // Header band
    doc.setFillColor(ar, ag, ab);
    doc.rect(0, 0, W, 42, 'F');

    // Business name
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(template.business_name || 'Your Business', margin, 16);

    if (template.tagline) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0, 0.6);
      doc.text(template.tagline, margin, 22);
    }

    // Invoice title + number (right aligned)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    const titleText = gstEnabled ? 'TAX INVOICE' : (invoice.title || 'INVOICE').toUpperCase();
    doc.text(titleText, W - margin, 14, { align: 'right' });
    doc.setFontSize(13);
    doc.text('#' + invoice.invoice_number, W - margin, 22, { align: 'right' });

    y = 50;

    // From block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('FROM', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    if (template.abn) { doc.text('ABN ' + template.abn, margin, y); y += 5; }
    if (template.address) {
      const lines = doc.splitTextToSize(template.address, 70);
      doc.text(lines, margin, y); y += lines.length * 5;
    }
    if (template.email) { doc.text(template.email, margin, y); y += 5; }
    if (template.phone) { doc.text(template.phone, margin, y); y += 5; }
    if (template.website) {
      doc.setTextColor(ar, ag, ab);
      doc.text(template.website, margin, y);
      doc.setTextColor(40, 40, 40);
    }

    // Dates block (right side)
    let dy = 50;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('DETAILS', W - margin, dy, { align: 'right' });
    dy += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text('Issue Date: ' + formatDate(invoice.issue_date), W - margin, dy, { align: 'right' }); dy += 5;
    doc.setTextColor(200, 50, 50);
    doc.text('Due Date: ' + formatDate(invoice.due_date), W - margin, dy, { align: 'right' }); dy += 5;
    doc.setTextColor(40, 40, 40);
    if (invoice.po_reference) { doc.text('PO/Ref: ' + invoice.po_reference, W - margin, dy, { align: 'right' }); }

    y = Math.max(y, dy) + 10;

    // Divider
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y, W - margin, y);
    y += 8;

    // Bill To / Ship To
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('BILL TO', margin, y);

    const hasShip = !invoice.ship_to_same_as_bill && (ship.business_name || ship.contact_name || ship.address);
    if (hasShip) doc.text('SHIP TO', W / 2, y);

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);

    const billLines = [
      bill.business_name,
      bill.contact_name,
      bill.abn ? 'ABN ' + bill.abn : null,
      bill.address,
      bill.email,
      bill.phone,
    ].filter(Boolean);

    billLines.forEach(l => { doc.text(l, margin, y); y += 5; });

    if (hasShip) {
      let sy = y - billLines.length * 5;
      const shipLines = [ship.business_name, ship.contact_name, ship.address].filter(Boolean);
      shipLines.forEach(l => { doc.text(l, W / 2, sy); sy += 5; });
    }

    y += 8;

    // Line items table
    const colX = { desc: margin, qty: 110, unit: 125, price: 145, gst: 165, total: W - margin };
    const rowH = 7;

    // Table header
    doc.setFillColor(ar, ag, ab);
    doc.rect(margin - 2, y - 5, W - margin * 2 + 4, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text('DESCRIPTION', colX.desc, y);
    doc.text('QTY', colX.qty, y, { align: 'center' });
    doc.text('UNIT', colX.unit, y, { align: 'center' });
    doc.text('PRICE', colX.price, y, { align: 'right' });
    if (gstEnabled) doc.text('GST', colX.gst, y, { align: 'center' });
    doc.text('AMOUNT', colX.total, y, { align: 'right' });
    y += rowH;

    // Items
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);

    items.forEach((item, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(margin - 2, y - 5, W - margin * 2 + 4, rowH, 'F');
      }
      const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
      doc.text(doc.splitTextToSize(item.description || '', 55)[0], colX.desc, y);
      doc.text(String(item.quantity || ''), colX.qty, y, { align: 'center' });
      doc.text(item.unit || '', colX.unit, y, { align: 'center' });
      doc.text(formatAUD(item.unit_price), colX.price, y, { align: 'right' });
      if (gstEnabled) doc.text(item.gst ? '✓' : '–', colX.gst, y, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text(formatAUD(lineTotal), colX.total, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += rowH;
    });

    y += 6;
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y, W - margin, y);
    y += 6;

    // Totals
    const totX = W - margin - 50;
    const addTotalRow = (label, value, bold = false, colour = null) => {
      if (colour) doc.setTextColor(...colour);
      else doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(bold ? 10 : 9);
      doc.text(label, totX, y);
      if (colour) doc.setTextColor(...colour);
      doc.text(value, W - margin, y, { align: 'right' });
      doc.setTextColor(40, 40, 40);
      y += bold ? 8 : 6;
    };

    addTotalRow('Subtotal', formatAUD(invoice.subtotal));
    if (invoice.discount_amount > 0) addTotalRow('Discount', '-' + formatAUD(invoice.discount_amount));
    if (gstEnabled) addTotalRow('GST (10%)', formatAUD(invoice.gst_amount));

    // Total due line
    doc.setFillColor(ar, ag, ab);
    doc.rect(totX - 5, y - 5, W - margin - totX + 5 + margin, 10, 'F');
    addTotalRow('TOTAL DUE', formatAUD(invoice.total), true, [0, 0, 0]);

    if (gstEnabled && invoice.gst_amount > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Includes ' + formatAUD(invoice.gst_amount) + ' GST', W - margin, y, { align: 'right' });
      y += 6;
    }

    y += 4;

    // Payment details
    const paymentMethods = [
      template.bank_name && 'Bank: ' + template.bank_name,
      template.account_name && 'Account: ' + template.account_name,
      template.bsb && 'BSB: ' + template.bsb,
      template.account_number && 'Acc#: ' + template.account_number,
      template.paypal_email && 'PayPal: ' + template.paypal_email,
      template.pay_id && 'PayID: ' + template.pay_id,
      template.other_payment && template.other_payment,
    ].filter(Boolean);

    if (paymentMethods.length > 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(margin - 2, y, W - margin * 2 + 4, 8 + Math.ceil(paymentMethods.length / 2) * 5, 'F');
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      doc.text('PAYMENT DETAILS', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);
      paymentMethods.forEach((m, i) => {
        const col = i % 2 === 0 ? margin : W / 2;
        doc.text(m, col, y);
        if (i % 2 === 1) y += 5;
      });
      if (paymentMethods.length % 2 !== 0) y += 5;
      y += 5;
    }

    // Terms
    if (invoice.payment_terms) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      doc.text('PAYMENT TERMS', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);
      const termLines = doc.splitTextToSize(invoice.payment_terms, W - margin * 2);
      doc.text(termLines, margin, y);
      y += termLines.length * 5 + 4;
    }

    if (invoice.notes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      doc.text('NOTES', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);
      const noteLines = doc.splitTextToSize(invoice.notes, W - margin * 2);
      doc.text(noteLines, margin, y);
    }

    // Footer
    doc.setFillColor(ar, ag, ab);
    doc.rect(0, 287, W, 10, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(template.business_name || '', margin, 293);
    doc.text('Thank you for your business', W / 2, 293, { align: 'center' });
    if (template.website) doc.text(template.website, W - margin, 293, { align: 'right' });

    const pdfBase64 = doc.output('datauristring').split(',')[1];

    return Response.json({ pdf: pdfBase64 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});