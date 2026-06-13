import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import LineItemsTable from '@/components/builder/LineItemsTable';
import TotalsBlock from '@/components/builder/TotalsBlock';
import ClientBlock from '@/components/builder/ClientBlock';
import InvoicePreview from '@/components/invoice/InvoicePreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { today, in14Days } from '@/lib/dateUtils';
import { calcInvoice } from '@/lib/invoiceCalc';
import { Eye, Save, Download, X, Maximize2 } from 'lucide-react';
import { createPortal } from 'react-dom';

function buildEmpty(template, nextNumber) {
  return {
    template_id: template?.id || '',
    invoice_number: nextNumber || `${template?.invoice_prefix || 'INV'}-001`,
    title: template?.default_title || 'Tax Invoice',
    status: 'Draft',
    issue_date: today(),
    due_date: in14Days(),
    po_reference: '',
    bill_to: {},
    ship_to_same_as_bill: false,
    ship_to: {},
    line_items: [{ description: '', quantity: 1, unit: 'items', unit_price: 0, gst: true, total: 0 }],
    discount_type: 'percent',
    discount_value: 0,
    payment_terms: template?.default_payment_terms || '',
    notes: template?.default_notes || '',
    accent_colour: template?.accent_colour || '#f59e0b',
  };
}

function Section({ title, children }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

export default function InvoiceBuilder() {
  const [searchParams] = useSearchParams();
  const cloneId = searchParams.get('clone');
  const editId = searchParams.get('edit');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState('form');
  const [fullscreen, setFullscreen] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data: templates = [] } = useQuery({ queryKey: ['templates'], queryFn: () => base44.entities.Template.list('-created_date') });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list('-created_date') });
  const { data: allInvoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list('-created_date') });

  const selectedTemplate = useMemo(() => templates.find(t => t.id === form?.template_id) || templates[0], [templates, form?.template_id]);

  // Next invoice number
  const getNextNumber = (template, existingInvoices) => {
    const prefix = template?.invoice_prefix || 'INV';
    const relevant = existingInvoices.filter(i => i.invoice_number?.startsWith(prefix + '-'));
    if (relevant.length === 0) return `${prefix}-001`;
    const nums = relevant.map(i => parseInt(i.invoice_number.replace(prefix + '-', '')) || 0);
    const next = Math.max(...nums) + 1;
    return `${prefix}-${String(next).padStart(3, '0')}`;
  };

  // Init form
  useEffect(() => {
    if (templates.length === 0 || allInvoices === undefined) return;
    if (form !== null) return;

    if (editId) {
      const existing = allInvoices.find(i => i.id === editId);
      if (existing) { setForm({ ...existing }); return; }
    }
    if (cloneId) {
      const source = allInvoices.find(i => i.id === cloneId);
      if (source) {
        const { id, created_date, updated_date, created_by_id, ...rest } = source;
        const t = templates.find(t => t.id === rest.template_id) || templates[0];
        setForm({ ...rest, invoice_number: getNextNumber(t, allInvoices), status: 'Draft' });
        return;
      }
    }

    const t = templates[0];
    setForm(buildEmpty(t, getNextNumber(t, allInvoices)));
  }, [templates, allInvoices, cloneId, editId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const totals = useMemo(() => {
    if (!form) return { subtotal: 0, discountAmount: 0, gstAmount: 0, total: 0 };
    return calcInvoice(form.line_items, form.discount_type, form.discount_value);
  }, [form?.line_items, form?.discount_type, form?.discount_value]);

  const invoiceForPreview = form ? {
    ...form,
    subtotal: totals.subtotal,
    discount_amount: totals.discountAmount,
    gst_amount: totals.gstAmount,
    total: totals.total,
    accent_colour: selectedTemplate?.accent_colour || form.accent_colour,
  } : null;

  const saveMut = useMutation({
    mutationFn: async (data) => {
      if (editId && form?.id) return base44.entities.Invoice.update(form.id, data);
      return base44.entities.Invoice.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries(['invoices']);
      toast.success(editId ? 'Invoice updated' : 'Invoice saved');
      navigate('/invoices');
    },
  });

  const handleSave = (status = form?.status || 'Draft') => {
    const data = {
      ...form,
      status,
      subtotal: totals.subtotal,
      discount_amount: totals.discountAmount,
      gst_amount: totals.gstAmount,
      total: totals.total,
      business_snapshot: selectedTemplate,
      accent_colour: selectedTemplate?.accent_colour || form.accent_colour,
    };
    saveMut.mutate(data);
  };

  const handleSaveClient = async (clientData) => {
    if (!clientData?.contact_name) { toast.error('Contact name required'); return; }
    await base44.entities.Client.create(clientData);
    qc.invalidateQueries(['clients']);
    toast.success('Client saved');
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('generateInvoicePDF', {
        invoice: invoiceForPreview,
        template: selectedTemplate,
      });
      const base64 = response.data?.pdf;
      if (!base64) throw new Error('No PDF returned');
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${form.invoice_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('PDF export failed: ' + e.message);
    }
    setExporting(false);
  };

  if (!form || templates.length === 0) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-96">
          {templates.length === 0
            ? <div className="text-center text-muted-foreground">
                <p className="font-medium mb-2">No templates found</p>
                <p className="text-sm">Create a template first to start building invoices.</p>
                <Button className="mt-4" onClick={() => navigate('/templates')}>Go to Templates</Button>
              </div>
            : <div className="w-6 h-6 border-2 border-muted border-t-foreground rounded-full animate-spin" />
          }
        </div>
      </AppShell>
    );
  }

  const gstEnabled = selectedTemplate?.gst_enabled ?? true;

  const formContent = (
    <div className="space-y-5">
      {/* Template & Header */}
      <Section title="Invoice Setup">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Template</Label>
            <Select value={form.template_id} onValueChange={v => {
              const t = templates.find(t => t.id === v);
              setForm(f => ({ ...f, template_id: v, accent_colour: t?.accent_colour || f.accent_colour, payment_terms: t?.default_payment_terms || f.payment_terms, notes: t?.default_notes || f.notes }));
            }}>
              <SelectTrigger className="bg-secondary border-0 h-8"><SelectValue placeholder="Select template" /></SelectTrigger>
              <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Invoice Number</Label>
            <Input value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} className="bg-secondary border-0 h-8 font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Issue Date</Label>
            <Input type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)} className="bg-secondary border-0 h-8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Due Date</Label>
            <Input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} className="bg-secondary border-0 h-8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">PO / Reference</Label>
            <Input value={form.po_reference} onChange={e => set('po_reference', e.target.value)} className="bg-secondary border-0 h-8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger className="bg-secondary border-0 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Draft','Sent','Paid','Overdue'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      {/* Bill To */}
      <Section title="Bill To">
        <ClientBlock value={form.bill_to} onChange={v => set('bill_to', v)} clients={clients} onSaveAsClient={handleSaveClient} />
      </Section>

      {/* Ship To */}
      <Section title="Ship To">
        <div className="flex items-center gap-3 mb-3">
          <Switch checked={form.ship_to_same_as_bill} onCheckedChange={v => set('ship_to_same_as_bill', v)} />
          <span className="text-sm text-muted-foreground">Same as Bill To</span>
        </div>
        {!form.ship_to_same_as_bill && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[['business_name','Business Name'],['contact_name','Contact Name'],['address','Address']].map(([k,l]) => (
              <div key={k} className={`space-y-1.5 ${k === 'address' ? 'sm:col-span-2' : ''}`}>
                <Label className="text-xs text-muted-foreground">{l}</Label>
                <Input value={form.ship_to?.[k] || ''} onChange={e => set('ship_to', { ...form.ship_to, [k]: e.target.value })} className="bg-secondary border-0 h-8" />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Line Items */}
      <Section title="Line Items">
        <LineItemsTable items={form.line_items} onChange={v => set('line_items', v)} gstEnabled={gstEnabled} />
      </Section>

      {/* Totals */}
      <Section title="Totals">
        <TotalsBlock
          subtotal={totals.subtotal}
          discountAmount={totals.discountAmount}
          gstAmount={totals.gstAmount}
          total={totals.total}
          discountType={form.discount_type}
          discountValue={form.discount_value}
          onDiscountTypeChange={v => set('discount_type', v)}
          onDiscountValueChange={v => set('discount_value', v)}
          gstEnabled={gstEnabled}
          accentColour={selectedTemplate?.accent_colour || '#f59e0b'}
        />
      </Section>

      {/* Terms & Notes */}
      <Section title="Payment Terms & Notes">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Payment Terms</Label>
          <Textarea value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)} className="bg-secondary border-0 h-16 resize-none" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Notes</Label>
          <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} className="bg-secondary border-0 h-16 resize-none" />
        </div>
      </Section>
    </div>
  );

  return (
    <AppShell>
      <div className="px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold font-heading tracking-tight">{editId ? 'Edit Invoice' : 'New Invoice'}</h1>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">{form.invoice_number}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportPDF} disabled={exporting}>
              <Download className="w-3.5 h-3.5" /> {exporting ? 'Generating…' : 'Export PDF'}
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => handleSave('Draft')} disabled={saveMut.isPending}>
              <Save className="w-3.5 h-3.5" /> Save Draft
            </Button>
            <Button size="sm" className="gap-2" style={{ background: selectedTemplate?.accent_colour || '#f59e0b', color: '#000' }} onClick={() => handleSave('Sent')} disabled={saveMut.isPending}>
              Save & Mark Sent
            </Button>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="lg:hidden mb-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="form" className="flex-1">Form</TabsTrigger>
              <TabsTrigger value="preview" className="flex-1 gap-2"><Eye className="w-3.5 h-3.5" /> Preview</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="lg:grid lg:grid-cols-[620px_1fr] gap-6 xl:gap-8">
          {/* Preview - left side */}
          <div className={`${tab !== 'form' ? 'block' : 'hidden lg:block'} relative`}>
            <div className="sticky top-20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Live Preview</span>
                <Button variant="ghost" size="sm" className="gap-1.5 h-7" onClick={() => setFullscreen(true)}>
                  <Maximize2 className="w-3.5 h-3.5" /> Full Screen
                </Button>
              </div>
              <div className="overflow-hidden rounded-xl border border-border shadow-2xl" style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
                <div style={{ transform: 'scale(0.78)', transformOrigin: 'top left', width: '1018px' }}>
                  <InvoicePreview invoice={invoiceForPreview} template={selectedTemplate} />
                </div>
              </div>
            </div>
          </div>

          {/* Form - right side, spacious */}
          <div className={tab !== 'preview' ? 'block' : 'hidden lg:block'}>
            {formContent}
          </div>
        </div>
      </div>

      {/* Fullscreen preview modal */}
      {fullscreen && createPortal(
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
            <span className="text-white font-medium">{form.invoice_number} — Preview</span>
            <Button variant="ghost" size="icon" className="text-white hover:text-white" onClick={() => setFullscreen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto flex items-start justify-center p-8">
            <div className="shadow-2xl">
              <InvoicePreview invoice={invoiceForPreview} template={selectedTemplate} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </AppShell>
  );
}