export function calcInvoice(lineItems = [], discountType = 'percent', discountValue = 0) {
  const subtotal = lineItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    return sum + qty * price;
  }, 0);

  let discountAmount = 0;
  if (discountType === 'percent') {
    discountAmount = subtotal * ((parseFloat(discountValue) || 0) / 100);
  } else {
    discountAmount = parseFloat(discountValue) || 0;
  }

  const afterDiscount = subtotal - discountAmount;

  // GST applied proportionally to gst-flagged items
  const gstableSubtotal = lineItems.reduce((sum, item) => {
    if (!item.gst) return sum;
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    return sum + qty * price;
  }, 0);

  const gstRatio = subtotal > 0 ? gstableSubtotal / subtotal : 0;
  const gstBase = afterDiscount * gstRatio;
  const gstAmount = gstBase * 0.1;

  const total = afterDiscount + gstAmount;

  return {
    subtotal,
    discountAmount,
    gstAmount,
    total,
  };
}

export function formatAUD(value) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(value || 0);
}

export function isOverdue(invoice) {
  if (invoice.status === 'Paid') return false;
  if (!invoice.due_date) return false;
  return new Date(invoice.due_date) < new Date(new Date().toDateString());
}

export function effectiveStatus(invoice, totalPaid = 0) {
  const total = invoice.total || 0;
  const paid = totalPaid;
  if (paid >= total && total > 0) return 'Paid';
  if (isOverdue(invoice) && paid < total) return 'Overdue';
  if (paid > 0 && paid < total) return 'Part Paid';
  return invoice.status || 'Draft';
}

export function paymentStatus(invoice, totalPaid = 0) {
  const total = invoice.total || 0;
  if (totalPaid >= total && total > 0) return 'Paid';
  if (isOverdue(invoice) && totalPaid < total) return 'Overdue';
  if (totalPaid > 0) return 'Part Paid';
  return 'Unpaid';
}