import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { formatAUD, effectiveStatus } from '@/lib/invoiceCalc';
import { startOfMonth, startOfQuarter, parseISO, isWithinInterval, endOfMonth, endOfQuarter } from 'date-fns';
import { TrendingUp, DollarSign, Clock, AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

function StatCard({ label, value, sub, icon: Icon, colour }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className="p-2 rounded-lg" style={{ background: colour + '22' }}>
          <Icon className="w-4 h-4" style={{ color: colour }} />
        </div>
      </div>
      <div className="text-2xl font-bold font-display tabular-nums tracking-tight">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list('-created_date') });

  const now = new Date();

  const stats = useMemo(() => {
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const qStart = startOfQuarter(now);
    const qEnd = endOfQuarter(now);

    let totalOutstanding = 0, totalPaid = 0;
    let monthOutstanding = 0, monthPaid = 0;
    let qOutstanding = 0, qPaid = 0;
    let overdue = 0, sent = 0, draft = 0;

    invoices.forEach(inv => {
      const status = effectiveStatus(inv);
      const total = inv.total || 0;
      const inMonth = inv.issue_date && isWithinInterval(parseISO(inv.issue_date), { start: monthStart, end: monthEnd });
      const inQ = inv.issue_date && isWithinInterval(parseISO(inv.issue_date), { start: qStart, end: qEnd });

      if (status === 'Paid') {
        totalPaid += total;
        if (inMonth) monthPaid += total;
        if (inQ) qPaid += total;
      } else {
        totalOutstanding += total;
        if (inMonth) monthOutstanding += total;
        if (inQ) qOutstanding += total;
      }

      if (status === 'Overdue') overdue++;
      if (status === 'Sent') sent++;
      if (status === 'Draft') draft++;
    });

    return { totalOutstanding, totalPaid, monthOutstanding, monthPaid, qOutstanding, qPaid, overdue, sent, draft };
  }, [invoices]);

  const recentInvoices = invoices.slice(0, 6);

  return (
    <AppShell>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-heading tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Overview of your invoicing activity</p>
          </div>
          <Link to="/builder">
            <Button className="gap-2" style={{ background: '#f59e0b', color: '#000' }}>
              <Plus className="w-4 h-4" /> New Invoice
            </Button>
          </Link>
        </div>

        {/* Main stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Outstanding" value={formatAUD(stats.totalOutstanding)} icon={Clock} colour="#f59e0b" sub={`${invoices.filter(i => effectiveStatus(i) !== 'Paid').length} unpaid`} />
          <StatCard label="Total Paid" value={formatAUD(stats.totalPaid)} icon={CheckCircle} colour="#10b981" sub={`${invoices.filter(i => effectiveStatus(i) === 'Paid').length} invoices`} />
          <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} colour="#ef4444" sub="Requires attention" />
          <StatCard label="Total Invoices" value={invoices.length} icon={TrendingUp} colour="#3b82f6" sub={`${stats.draft} draft · ${stats.sent} sent`} />
        </div>

        {/* Month / Quarter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">This Month</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold tabular-nums">{formatAUD(stats.monthPaid)}</div>
                <div className="text-xs text-emerald-400 mt-1">Paid</div>
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{formatAUD(stats.monthOutstanding)}</div>
                <div className="text-xs text-yellow-400 mt-1">Outstanding</div>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">This Quarter (BAS)</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold tabular-nums">{formatAUD(stats.qPaid)}</div>
                <div className="text-xs text-emerald-400 mt-1">Paid</div>
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{formatAUD(stats.qOutstanding)}</div>
                <div className="text-xs text-yellow-400 mt-1">Outstanding</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Invoices */}
        {recentInvoices.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Recent Invoices</h2>
              <Link to="/invoices" className="text-xs text-muted-foreground hover:text-foreground transition-colors">View all →</Link>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="text-left px-6 py-3">Invoice</th>
                  <th className="text-left px-6 py-3">Client</th>
                  <th className="text-right px-6 py-3">Amount</th>
                  <th className="text-left px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map(inv => {
                  const status = effectiveStatus(inv);
                  const statusCol = { Paid: '#10b981', Overdue: '#ef4444', Sent: '#3b82f6', Draft: '#9ca3af' }[status];
                  return (
                    <tr key={inv.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                      <td className="px-6 py-3 font-mono font-medium">{inv.invoice_number}</td>
                      <td className="px-6 py-3 text-muted-foreground">{inv.bill_to?.business_name || inv.bill_to?.contact_name || '—'}</td>
                      <td className="px-6 py-3 text-right tabular-nums font-medium">{formatAUD(inv.total)}</td>
                      <td className="px-6 py-3">
                        <span className="text-xs font-medium" style={{ color: statusCol }}>{status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {invoices.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <DollarSign className="w-10 h-10 mx-auto mb-4 opacity-20" />
            <p className="font-medium">No invoices yet</p>
            <p className="text-sm mt-1">Create a template and start invoicing</p>
            <div className="flex gap-3 justify-center mt-6">
              <Link to="/templates"><Button variant="outline">Create Template</Button></Link>
              <Link to="/builder"><Button style={{ background: '#f59e0b', color: '#000' }}>New Invoice</Button></Link>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}