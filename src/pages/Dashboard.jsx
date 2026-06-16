import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { formatAUD } from '@/lib/invoiceCalc';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { DollarSign, Clock, AlertTriangle, CheckCircle, Plus, FolderOpen, CreditCard, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDisplayDate } from '@/lib/dateUtils';

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

const STATUS_COLOURS = { Paid: '#10b981', Overdue: '#ef4444', Sent: '#3b82f6', Draft: '#9ca3af', 'Part Paid': '#f59e0b' };

export default function Dashboard() {
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list('-created_date') });
  const { data: payments = [] } = useQuery({ queryKey: ['payments'], queryFn: () => base44.entities.Payment.list('-payment_date') });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date') });

  const now = new Date();

  const paidByInvoice = useMemo(() => {
    const map = {};
    payments.forEach(p => { map[p.invoice_id] = (map[p.invoice_id] || 0) + (p.amount || 0); });
    return map;
  }, [payments]);

  const getStatus = (inv) => {
    const total = inv.total || 0;
    const paid = paidByInvoice[inv.id] || 0;
    if (paid >= total && total > 0) return 'Paid';
    const overdue = inv.due_date && new Date(inv.due_date) < now && inv.status !== 'Paid';
    if (overdue && paid < total) return 'Overdue';
    if (paid > 0 && paid < total) return 'Part Paid';
    return inv.status || 'Draft';
  };

  const stats = useMemo(() => {
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    let totalOutstanding = 0, paidThisMonth = 0, overdueAmt = 0, partPaidCount = 0;

    invoices.forEach(inv => {
      const total = inv.total || 0;
      const paid = paidByInvoice[inv.id] || 0;
      const remaining = total - paid;
      const status = getStatus(inv);
      if (status !== 'Paid') totalOutstanding += remaining;
      if (status === 'Overdue') overdueAmt += remaining;
      if (status === 'Part Paid') partPaidCount++;
    });

    payments.forEach(p => {
      if (p.payment_date && isWithinInterval(parseISO(p.payment_date), { start: monthStart, end: monthEnd })) {
        paidThisMonth += p.amount || 0;
      }
    });

    const activeProjects = projects.filter(p => p.status === 'Active').length;
    return { totalOutstanding, paidThisMonth, overdueAmt, partPaidCount, activeProjects };
  }, [invoices, payments, projects, paidByInvoice]);

  const recentInvoices = invoices.slice(0, 5);
  const recentPayments = payments.slice(0, 5);

  return (
    <AppShell>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold font-heading tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Simple invoicing for freelancers, actors, crew, creatives, and indie productions.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/projects">
              <Button variant="outline" className="gap-2"><FolderOpen className="w-4 h-4" /> New Project</Button>
            </Link>
            <Link to="/builder">
              <Button className="gap-2" style={{ background: '#16C784', color: '#0F172A' }}>
                <Plus className="w-4 h-4" /> Create Invoice
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Outstanding" value={formatAUD(stats.totalOutstanding)} icon={Clock} colour="#0D9488" sub="Awaiting payment" />
          <StatCard label="Paid This Month" value={formatAUD(stats.paidThisMonth)} icon={CheckCircle} colour="#16C784" sub="Payments received" />
          <StatCard label="Overdue" value={formatAUD(stats.overdueAmt)} icon={AlertTriangle} colour="#ef4444" sub="Requires attention" />
          <StatCard label="Part Paid" value={stats.partPaidCount} icon={Zap} colour="#f59e0b" sub={`${stats.activeProjects} active projects`} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/builder" className="bg-card border border-border rounded-xl p-5 hover:border-accent/50 transition-colors block">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10"><Plus className="w-5 h-5 text-accent" /></div>
              <div>
                <div className="font-semibold">Create Invoice</div>
                <div className="text-xs text-muted-foreground mt-0.5">Bill a client or production</div>
              </div>
            </div>
          </Link>
          <Link to="/payments" className="bg-card border border-border rounded-xl p-5 hover:border-accent/50 transition-colors block">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: '#16C78422' }}><CreditCard className="w-5 h-5" style={{ color: '#16C784' }} /></div>
              <div>
                <div className="font-semibold">Record Payment</div>
                <div className="text-xs text-muted-foreground mt-0.5">Log full or partial payments</div>
              </div>
            </div>
          </Link>
          <Link to="/projects" className="bg-card border border-border rounded-xl p-5 hover:border-accent/50 transition-colors block">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: '#0D948822' }}><FolderOpen className="w-5 h-5" style={{ color: '#0D9488' }} /></div>
              <div>
                <div className="font-semibold">Manage Projects</div>
                <div className="text-xs text-muted-foreground mt-0.5">Group invoices by job or production</div>
              </div>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Recent Invoices</h2>
              <Link to="/invoices" className="text-xs text-muted-foreground hover:text-foreground transition-colors">View all →</Link>
            </div>
            {recentInvoices.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>No invoices yet</p>
                <Link to="/builder"><Button size="sm" className="mt-3" style={{ background: '#16C784', color: '#0F172A' }}>Create Invoice</Button></Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {recentInvoices.map(inv => {
                    const status = getStatus(inv);
                    const client = inv.bill_to?.business_name || inv.bill_to?.contact_name || '—';
                    return (
                      <tr key={inv.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                        <td className="px-6 py-3">
                          <div className="font-mono font-medium text-xs">{inv.invoice_number}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[140px]">{client}</div>
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums font-medium">{formatAUD(inv.total)}</td>
                        <td className="px-6 py-3">
                          <span className="text-xs font-medium" style={{ color: STATUS_COLOURS[status] }}>{status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Recent Payments</h2>
              <Link to="/payments" className="text-xs text-muted-foreground hover:text-foreground transition-colors">View all →</Link>
            </div>
            {recentPayments.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>No payments recorded</p>
                <Link to="/payments"><Button size="sm" className="mt-3" style={{ background: '#16C784', color: '#0F172A' }}>Record Payment</Button></Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {recentPayments.map(p => {
                    const inv = invoices.find(i => i.id === p.invoice_id);
                    const client = inv?.bill_to?.business_name || inv?.bill_to?.contact_name || '';
                    return (
                      <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                        <td className="px-6 py-3">
                          <div className="font-mono font-medium text-xs">{p.invoice_number}</div>
                          <div className="text-xs text-muted-foreground">{p.method}</div>
                        </td>
                        <td className="px-6 py-3 text-xs text-muted-foreground">{formatDisplayDate(p.payment_date)}</td>
                        <td className="px-6 py-3 text-right font-semibold tabular-nums text-emerald-400">{formatAUD(p.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {projects.filter(p => p.status === 'Active').length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Active Projects</h2>
              <Link to="/projects" className="text-xs text-muted-foreground hover:text-foreground transition-colors">View all →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-px bg-border">
              {projects.filter(p => p.status === 'Active').slice(0, 6).map(p => (
                <div key={p.id} className="bg-card px-6 py-4">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.project_type}</div>
                  {p.client_name && <div className="text-xs text-muted-foreground">{p.client_name}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}