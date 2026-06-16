import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, FolderOpen, Trash2, ExternalLink, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { formatAUD, effectiveStatus } from '@/lib/invoiceCalc';
import { formatDisplayDate } from '@/lib/dateUtils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const PROJECT_TYPES = ['Film / TV Production', 'Acting Job', 'Crew Job', 'Editing Job', 'Photography / Videography', 'Design / Creative', 'Trade / Service Job', 'Consulting', 'Other'];
const PROJECT_STATUSES = ['Active', 'Completed', 'On Hold', 'Cancelled'];

const statusStyle = {
  Active: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  Completed: 'bg-blue-900/50 text-blue-300 border-blue-700',
  'On Hold': 'bg-amber-900/50 text-amber-300 border-amber-700',
  Cancelled: 'bg-red-900/50 text-red-300 border-red-700',
};

const emptyProject = () => ({ name: '', client_id: '', client_name: '', project_type: 'Film / TV Production', status: 'Active', start_date: '', end_date: '', notes: '' });

export default function Projects() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProject());
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: projects = [], isLoading } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date') });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list('-created_date') });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list('-created_date') });
  const { data: payments = [] } = useQuery({ queryKey: ['payments'], queryFn: () => base44.entities.Payment.list() });

  const saveMut = useMutation({
    mutationFn: d => editing ? base44.entities.Project.update(editing.id, d) : base44.entities.Project.create(d),
    onSuccess: () => { qc.invalidateQueries(['projects']); setModalOpen(false); toast.success(editing ? 'Project updated' : 'Project created'); },
  });

  const deleteMut = useMutation({
    mutationFn: id => base44.entities.Project.delete(id),
    onSuccess: () => { qc.invalidateQueries(['projects']); setDeleteTarget(null); toast.success('Project deleted'); },
  });

  const openNew = () => { setEditing(null); setForm(emptyProject()); setModalOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...p }); setModalOpen(true); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleClientChange = (clientId) => {
    const c = clients.find(c => c.id === clientId);
    set('client_id', clientId);
    set('client_name', c ? (c.business_name || c.contact_name) : '');
  };

  const handleSave = () => {
    if (!form.name) { toast.error('Project name is required'); return; }
    saveMut.mutate(form);
  };

  const projectStats = useMemo(() => {
    const byProject = {};
    invoices.forEach(inv => {
      if (!inv.project_id) return;
      if (!byProject[inv.project_id]) byProject[inv.project_id] = { invoiced: 0, paid: 0 };
      byProject[inv.project_id].invoiced += inv.total || 0;
    });
    payments.forEach(p => {
      const inv = invoices.find(i => i.id === p.invoice_id);
      if (!inv?.project_id) return;
      if (!byProject[inv.project_id]) byProject[inv.project_id] = { invoiced: 0, paid: 0 };
      byProject[inv.project_id].paid += p.amount || 0;
    });
    return byProject;
  }, [invoices, payments]);

  const filtered = useMemo(() =>
    projects.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.client_name?.toLowerCase().includes(search.toLowerCase())),
    [projects, search]
  );

  return (
    <AppShell>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-heading tracking-tight">Projects</h1>
            <p className="text-muted-foreground text-sm mt-1">Group invoices by job or production</p>
          </div>
          <Button onClick={openNew} style={{ background: '#16C784', color: '#0F172A' }} className="gap-2">
            <Plus className="w-4 h-4" /> New Project
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {isLoading && <div className="text-muted-foreground text-sm">Loading…</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <FolderOpen className="w-10 h-10 mx-auto mb-4 opacity-20" />
            <p className="font-medium">{projects.length === 0 ? 'No projects yet' : 'No results'}</p>
            <p className="text-sm mt-1">{projects.length === 0 ? 'Create a project to group your invoices by job or production.' : ''}</p>
            {projects.length === 0 && <Button onClick={openNew} className="mt-4" style={{ background: '#16C784', color: '#0F172A' }}>Create Project</Button>}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => {
            const stats = projectStats[p.id] || { invoiced: 0, paid: 0 };
            const outstanding = stats.invoiced - stats.paid;
            const projectInvoices = invoices.filter(i => i.project_id === p.id);
            return (
              <div key={p.id} className="bg-card border border-border rounded-xl p-5 space-y-4 hover:border-accent/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{p.name}</h3>
                    {p.client_name && <p className="text-sm text-muted-foreground truncate">{p.client_name}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">{p.project_type}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${statusStyle[p.status] || ''}`}>{p.status}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center border-t border-border pt-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Invoiced</div>
                    <div className="text-sm font-semibold tabular-nums">{formatAUD(stats.invoiced)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Paid</div>
                    <div className="text-sm font-semibold tabular-nums text-emerald-400">{formatAUD(stats.paid)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Outstanding</div>
                    <div className="text-sm font-semibold tabular-nums" style={{ color: outstanding > 0 ? '#0D9488' : '#6b7280' }}>{formatAUD(outstanding)}</div>
                  </div>
                </div>

                {(p.start_date || p.end_date) && (
                  <div className="text-xs text-muted-foreground">
                    {p.start_date && <span>{formatDisplayDate(p.start_date)}</span>}
                    {p.start_date && p.end_date && <span> → </span>}
                    {p.end_date && <span>{formatDisplayDate(p.end_date)}</span>}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => openEdit(p)}>Edit</Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/invoices?project=${p.id}`)} title="View invoices">
                    <FileText className="w-3.5 h-3.5" /> {projectInvoices.length}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(p)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Project Form Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Project' : 'New Project'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Project Name *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Shadow Wolves Production" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Client</Label>
                <Select value={form.client_id || ''} onValueChange={handleClientChange}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.business_name || c.contact_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROJECT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Project Type</Label>
              <Select value={form.project_type} onValueChange={v => set('project_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROJECT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Start Date</Label>
                <Input type="date" value={form.start_date || ''} onChange={e => set('start_date', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">End Date</Label>
                <Input type="date" value={form.end_date || ''} onChange={e => set('end_date', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} className="h-20 resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMut.isPending} style={{ background: '#16C784', color: '#0F172A' }}>
              {saveMut.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>Delete <strong>{deleteTarget?.name}</strong>? This will not delete linked invoices.</AlertDialogDescription>
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