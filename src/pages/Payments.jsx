import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, CreditCard, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatAUD } from '@/lib/invoiceCalc';
import { formatDisplayDate, today } from '@/lib/dateUtils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'Card', 'PayPal', 'Stripe', 'Wise', 'Cheque', 'Other'];

const emptyPayment = (invoiceId = '', invoiceNumber = '') => ({
  invoice_id: invoiceId,
  invoice_number: invoiceNumber,
  payment_date: today(),
  amount: '',
  method: 'Bank Transfer',
  reference: '',
  notes: '',
});

export default function Payments() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyPayment());
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: payments = [], isLoading } = useQuery({ queryKey: ['payments'], queryFn: () => base44.entities.Payment.list('-payment_date') });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list('-created_date') });

  const saveMut = useMutation({
    mutationFn: d => base44.entities.Payment.create({ ...d, amount: parseFloat(d.amount) || 0 }),
    onSuccess: () => { qc.invalidateQueries(['payments']); setModalOpen(false); toast.success('Payment recorded'); },
  });

  const deleteMut = useMutation({
    mutationFn: id => base44.entities.Payment.delete(id),
    onSuccess: () => { qc.invalidateQueries(['payments']); setDeleteTarget(null); toast.success('Payment deleted'); },
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleInvoiceSelect = (invId) => {
    const inv = invoices.find(i => i.id === invId);
    set('invoice_id', invId);
    set('invoice_number', inv?.invoice_number || '');
  };

  const handleSave = () => {
    if (!form.invoice_id) { toast.error('Please select an invoice'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Amount must be greater than 0'); return; }
    saveMut.mutate(form);
  };

  const openNew = (invId = '', invNum = '') => {
    setForm(emptyPayment(invId, invNum));
    setModalOpen(true);
  };

  // Payment totals by invoice
  const paidByInvoice = useMemo(() => {
    const map = {};
    payments.forEach(p => {
      map[p.invoice_id] = (map[p.invoice_id] || 0) + (p.amount || 0);
    });
    return map;
  }, [payments]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return payments.filter(p =>
      !q || p.invoice_number?.toLowerCase().includes(q) || p.method?.toLowerCase().includes(q) || p.reference?.toLowerCase().includes(q)
    );
  }, [payments, search]);

  // Stats
  const totalRecorded = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const thisMonth = payments.filter(p => {
    if (!p.payment_date) return false;
    const d = new Date(p.payment_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <AppShell>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-heading tracking-tight">Payments</h1>
            <p className="text-muted-foreground text-sm mt-1">Record and track payments against invoices</p>
          </div>
          <Button onClick={() => openNew()} style={{ background: '#16C784', color: '#0F172A' }} className="gap-2">
            <Plus className="w-4 h-4" /> Record Payment
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Total Recorded</div>
            <div className="text-2xl font-bold tabular-nums">{formatAUD(totalRecorded)}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">This Month</div>
            <div className="text-2xl font-bold tabular-nums text-emerald-400">{formatAUD(thisMonth)}</div>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search payments…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {isLoading && <div className="text-muted-foreground text-sm">Loading…</div>}

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {filtered.length === 0 && !isLoading ? (
            <div className="text-center py-20 text-muted-foreground">
              <CreditCard className="w-10 h-10 mx-auto mb-4 opacity-20" />
              <p className="font-medium">{payments.length === 0 ? 'No payments recorded yet' : 'No results'}</p>
              {payments.length === 0 && <Button onClick={() => openNew()} className="mt-4" style={{ background: '#16C784', color: '#0F172A' }}>Record Payment</Button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-left px-6 py-3">Date</th>
                    <th className="text-left px-6 py-3">Invoice</th>
                    <th className="text-left px-6 py-3">Method</th>
                    <th className="text-right px-6 py-3">Amount</th>
                    <th className="text-left px-6 py-3 hidden md:table-cell">Reference</th>
                    <th className="px-6 py-3 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const inv = invoices.find(i => i.id === p.invoice_id);
                    const client = inv?.bill_to?.business_name || inv?.bill_to?.contact_name || '';
                    return (
                      <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                        <td className="px-6 py-4 text-muted-foreground">{formatDisplayDate(p.payment_date)}</td>
                        <td className="px-6 py-4">
                          <div className="font-mono font-medium">{p.invoice_number}</div>
                          {client && <div className="text-xs text-muted-foreground">{client}</div>}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{p.method}</td>
                        <td className="px-6 py-4 text-right font-semibold tabular-nums text-emerald-400">{formatAUD(p.amount)}</td>
                        <td className="px-6 py-4 text-muted-foreground hidden md:table-cell">{p.reference || '—'}</td>
                        <td className="px-6 py-4">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(p)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Invoice *</Label>
              <Select value={form.invoice_id} onValueChange={handleInvoiceSelect}>
                <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                <SelectContent>
                  {invoices.map(inv => {
                    const client = inv.bill_to?.business_name || inv.bill_to?.contact_name || '';
                    const paid = paidByInvoice[inv.id] || 0;
                    const remaining = (inv.total || 0) - paid;
                    return (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoice_number}{client ? ` — ${client}` : ''} ({formatAUD(remaining)} remaining)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Payment Date *</Label>
                <Input type="date" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Amount *</Label>
                <Input type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Payment Method</Label>
              <Select value={form.method} onValueChange={v => set('method', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Reference / Receipt No.</Label>
              <Input value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} className="h-16 resize-none" placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMut.isPending} style={{ background: '#16C784', color: '#0F172A' }}>
              {saveMut.isPending ? 'Saving…' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>Remove this {formatAUD(deleteTarget?.amount)} payment? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteMut.mutate(deleteTarget.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}