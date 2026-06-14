import React from 'react';
import { formatAUD } from '@/lib/invoiceCalc';
import { formatDisplayDate } from '@/lib/dateUtils';

export default function InvoicePreview({ invoice, template }) {
  if (!invoice || !template) return null;

  const accent = invoice.accent_colour || template?.accent_colour || '#f59e0b';
  const gstEnabled = template?.gst_enabled ?? true;
  const bill = invoice.bill_to || {};
  const ship = invoice.ship_to_same_as_bill ? bill : (invoice.ship_to || {});
  const items = invoice.line_items || [];

  const paymentMethods = [
    template?.bank_name && `Bank: ${template.bank_name}`,
    template?.account_name && `Account Name: ${template.account_name}`,
    template?.bsb && `BSB: ${template.bsb}`,
    template?.account_number && `Account: ${template.account_number}`,
    template?.paypal_email && `PayPal: ${template.paypal_email}`,
    template?.pay_id && `PayID: ${template.pay_id}`,
    template?.other_payment && template.other_payment,
  ].filter(Boolean);

  return (
    <div
      id="invoice-preview"
      className="bg-white text-gray-900 font-body"
      style={{ width: '794px', minHeight: '1123px', fontFamily: 'Inter, sans-serif', fontSize: '13px', display: 'flex', flexDirection: 'column' }}
    >
      {/* Thin accent top bar */}
      <div style={{ background: accent, height: '6px' }} />

      {/* Header */}
      <div style={{ padding: '32px 48px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          {template?.logo_url && (
            <img src={template.logo_url} alt="logo" style={{ height: template.logo_size || 80, maxWidth: 200, objectFit: 'contain', marginBottom: 12 }} />
          )}
          <div style={{ fontSize: 22, fontWeight: 800, color: '#111', letterSpacing: '-0.5px' }}>
            {template?.business_name || 'Your Business'}
          </div>
          {template?.tagline && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{template.tagline}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: accent, letterSpacing: '-1px', textTransform: 'uppercase' }}>
            {gstEnabled ? 'TAX\u2009INVOICE' : (invoice.title || 'INVOICE')}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', marginTop: 4 }}>
            #{invoice.invoice_number}
          </div>
        </div>
      </div>

      {/* Divider below header */}
      <div style={{ borderBottom: `2px solid ${accent}`, margin: '0 48px' }} />

      {/* Meta block */}
      <div style={{ padding: '24px 48px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb' }}>
        {/* From */}
        <div style={{ fontSize: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>From</div>
          {template?.abn && <div style={{ color: '#6b7280' }}>ABN {template.abn}</div>}
          {template?.address && <div style={{ whiteSpace: 'pre-line' }}>{template.address}</div>}
          {template?.email && <div>{template.email}</div>}
          {template?.phone && <div>{template.phone}</div>}
          {template?.website && <div style={{ color: accent }}>{template.website}</div>}
        </div>

        {/* Dates */}
        <div style={{ textAlign: 'right', fontSize: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Details</div>
          <div>Issue Date: <strong>{formatDisplayDate(invoice.issue_date)}</strong></div>
          <div>Due Date: <strong style={{ color: '#ef4444' }}>{formatDisplayDate(invoice.due_date)}</strong></div>
          {invoice.po_reference && <div>PO/Ref: <strong>{invoice.po_reference}</strong></div>}
        </div>
      </div>

      {/* Bill To / Ship To */}
      <div style={{ padding: '20px 48px 0', display: 'flex', gap: 40 }}>
        <div style={{ flex: 1, fontSize: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Bill To</div>
          {bill.business_name && <div style={{ fontWeight: 700 }}>{bill.business_name}</div>}
          {bill.contact_name && <div>{bill.contact_name}</div>}
          {bill.abn && <div style={{ color: '#6b7280' }}>ABN {bill.abn}</div>}
          {bill.address && <div style={{ whiteSpace: 'pre-line' }}>{bill.address}</div>}
          {bill.email && <div>{bill.email}</div>}
          {bill.phone && <div>{bill.phone}</div>}
        </div>
        {(ship.business_name || ship.contact_name || ship.address) && (
          <div style={{ flex: 1, fontSize: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Ship To</div>
            {ship.business_name && <div style={{ fontWeight: 700 }}>{ship.business_name}</div>}
            {ship.contact_name && <div>{ship.contact_name}</div>}
            {ship.address && <div style={{ whiteSpace: 'pre-line' }}>{ship.address}</div>}
          </div>
        )}
      </div>

      {/* Line Items */}
      <div style={{ padding: '24px 48px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${accent}` }}>
              <th style={{ textAlign: 'left', paddingBottom: 8, fontWeight: 700, fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</th>
              <th style={{ textAlign: 'center', paddingBottom: 8, fontWeight: 700, fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: 60 }}>Qty</th>
              <th style={{ textAlign: 'center', paddingBottom: 8, fontWeight: 700, fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: 60 }}>Unit</th>
              <th style={{ textAlign: 'right', paddingBottom: 8, fontWeight: 700, fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: 90 }}>Unit Price</th>
              {gstEnabled && <th style={{ textAlign: 'right', paddingBottom: 8, fontWeight: 700, fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: 70 }}>GST</th>}
              <th style={{ textAlign: 'right', paddingBottom: 8, fontWeight: 700, fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: 90 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 0', verticalAlign: 'top' }}>{item.description}</td>
                <td style={{ padding: '8px 0', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '8px 0', textAlign: 'center', color: '#9ca3af' }}>{item.unit}</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'monospace' }}>{formatAUD(item.unit_price)}</td>
                {gstEnabled && <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'monospace' }}>{item.gst ? formatAUD((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0) * 0.1) : '—'}</td>}
                <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                  {formatAUD((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div style={{ padding: '0 48px 24px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 260, fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#6b7280' }}>
            <span>Subtotal</span><span style={{ fontFamily: 'monospace' }}>{formatAUD(invoice.subtotal)}</span>
          </div>
          {(invoice.discount_amount > 0) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#6b7280' }}>
              <span>Discount</span><span style={{ fontFamily: 'monospace' }}>-{formatAUD(invoice.discount_amount)}</span>
            </div>
          )}
          {gstEnabled && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#6b7280' }}>
              <span>GST (10%)</span><span style={{ fontFamily: 'monospace' }}>{formatAUD(invoice.gst_amount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `2px solid ${accent}`, paddingTop: 8, fontWeight: 800, fontSize: 15, marginTop: 4 }}>
            <span>Total Due</span><span style={{ fontFamily: 'monospace', color: accent }}>{formatAUD(invoice.total)}</span>
          </div>
          {gstEnabled && invoice.gst_amount > 0 && (
            <div style={{ textAlign: 'right', fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
              Includes {formatAUD(invoice.gst_amount)} GST
            </div>
          )}
        </div>
      </div>

      {/* Payment & Terms - Two Columns */}
      <div style={{ padding: '20px 48px 0', fontSize: 12, flex: 1, display: 'flex', gap: 32 }}>
        {/* Payment Details */}
        {paymentMethods.length > 0 && (
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Payment Details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {paymentMethods.map((m, i) => {
                const [label, ...rest] = m.split(': ');
                return <span key={i} style={{ color: '#374151' }}><strong>{label}:</strong> {rest.join(': ')}</span>;
              })}
            </div>
          </div>
        )}

        {/* Terms & Notes */}
        <div style={{ flex: 1 }}>
          {invoice.payment_terms && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Payment Terms</div>
              <div style={{ color: '#374151' }}>{invoice.payment_terms}</div>
            </div>
          )}
          {invoice.notes && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Notes</div>
              <div style={{ color: '#374151', whiteSpace: 'pre-line' }}>{invoice.notes}</div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 'auto' }}>
        <div style={{ borderTop: `2px solid ${accent}`, margin: '0 48px 0' }} />
        <div style={{ padding: '12px 48px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 11, color: '#9ca3af', gap: 16 }}>
          {template?.business_name && <span>{template.business_name}</span>}
          {template?.abn && <><span>·</span><span>ABN {template.abn}</span></>}
          {template?.email && <><span>·</span><span>{template.email}</span></>}
          {gstEnabled && <><span>·</span><span>Registered for GST</span></>}
        </div>
      </div>
    </div>
  );
}