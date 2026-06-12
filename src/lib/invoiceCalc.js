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

export function effectiveStatus(invoice) {
  if (isOverdue(invoice) && invoice.status !== 'Paid') return 'Overdue';
  return invoice.status;
}