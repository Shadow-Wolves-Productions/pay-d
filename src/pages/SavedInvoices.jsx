import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import SectionHeader from '@/components/shared/SectionHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Copy, Trash2, ExternalLink, Search, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { formatAUD, effectiveStatus } from '@/lib/invoiceCalc';
import { formatDisplayDate, today } from '@/lib/dateUtils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function SavedInvoices() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date'),
  });

  const deleteMut = useMutation({
    mutationFn: id => base44.entities.Invoice.delete(id),
    onSuccess: () => { qc.invalidateQueries(['invoices']); setDeleteTarget(null); toast.success('Invoice deleted'); },
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status, sent_date, paid_date }) => base44.entities.Invoice.update(id, { status, sent_date, paid_date }),
    onSuccess: () => { qc.invalidateQueries(['invoices']); toast.success('Status updated'); },
  });

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const status = effectiveStatus(inv);
      const matchStatus = statusFilter === 'all' || status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.bill_to?.business_name?.toLowerCase().includes(q) ||
        inv.bill_to?.contact_name?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [invoices, search, statusFilter]);

  return (
    <AppShell>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <SectionHeader
          title="Saved Invoices"
          subtitle="All your invoices in one place"
          action={
            <Button onClick={() => navigate('/builder')} className="gap-2" style={{ background: '#f59e0b', color: '#000' }}>
              <Plus className="w-4 h-4" /> New Invoice
            </Button>
          }
        />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search invoice or client…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {['Draft','Sent','Paid','Overdue'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading && <div className="text-muted-foreground text-sm">Loading…</div>}

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {filtered.length === 0 && !isLoading ? (
            <div className="text-center py-20 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-4 opacity-20" />
              <p className="font-medium">{invoices.length === 0 ? 'No invoices yet' : 'No results'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-left px-6 py-3">Invoice</th>
                    <th className="text-left px-6 py-3">Client</th>
                    <th className="text-right px-6 py-3">Total</th>
                    <th className="text-left px-6 py-3 hidden md:table-cell">Items</th>
                    <th className="text-left px-6 py-3 hidden lg:table-cell">Due</th>
                    <th className="text-left px-6 py-3 hidden xl:table-cell">Sent</th>
                    <th className="text-left px-6 py-3 hidden xl:table-cell">Paid</th>
                    <th className="text-left px-6 py-3">Status</th>
                    <th className="px-6 py-3 w-36 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => {
                    const status = effectiveStatus(inv);
                    return (
                      <tr key={inv.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                        <td className="px-6 py-4">
                          <span className="font-mono font-medium">{inv.invoice_number}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium">{inv.bill_to?.business_name || inv.bill_to?.contact_name || '—'}</div>
                          {inv.bill_to?.business_name && inv.bill_to?.contact_name && (
                            <div className="text-xs text-muted-foreground">{inv.bill_to.contact_name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold tabular-nums">{formatAUD(inv.total)}</td>
                        <td className="px-6 py-4 text-muted-foreground hidden md:table-cell">{inv.line_items?.length || 0}</td>
                        <td className="px-6 py-4 text-muted-foreground hidden lg:table-cell">{formatDisplayDate(inv.due_date)}</td>
                        <td className="px-6 py-4 text-muted-foreground hidden xl:table-cell">{inv.sent_date ? formatDisplayDate(inv.sent_date) : <span className="text-muted-foreground/40">—</span>}</td>
                        <td className="px-6 py-4 text-muted-foreground hidden xl:table-cell">{inv.paid_date ? formatDisplayDate(inv.paid_date) : <span className="text-muted-foreground/40">—</span>}</td>
                        <td className="px-6 py-4">
                          <Select value={status} onValueChange={s => {
                            const updates = { id: inv.id, status: s, sent_date: inv.sent_date, paid_date: inv.paid_date };
                            if (s === 'Sent' && !inv.sent_date) updates.sent_date = today();
                            if (s === 'Paid' && !inv.paid_date) updates.paid_date = today();
                            updateStatusMut.mutate(updates);
                          }}>
                            <SelectTrigger className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 w-auto [&>svg]:hidden">
                              <StatusBadge status={status} />
                            </SelectTrigger>
                            <SelectContent>
                              {['Draft','Sent','Paid','Overdue'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/builder?edit=${inv.id}`)} title="Open">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/builder?clone=${inv.id}`)} title="Clone">
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(inv)} title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>Delete invoice <strong>{deleteTarget?.invoice_number}</strong>? This cannot be undone.</AlertDialogDescription>
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