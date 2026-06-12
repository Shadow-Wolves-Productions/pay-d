import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppShell from '@/components/layout/AppShell';
import SectionHeader from '@/components/shared/SectionHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const empty = { contact_name: '', business_name: '', abn: '', address: '', email: '', phone: '' };

function ClientForm({ client, onSave, onCancel }) {
  const [form, setForm] = useState(client || empty);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[['contact_name','Contact Name *'],['business_name','Business Name'],['abn','ABN'],['email','Email'],['phone','Phone']].map(([k, l]) => (
          <div key={k} className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{l}</Label>
            <Input value={form[k]} onChange={e => set(k, e.target.value)} required={k === 'contact_name'} className="bg-secondary border-0" />
          </div>
        ))}
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Address</Label>
          <Input value={form.address} onChange={e => set('address', e.target.value)} className="bg-secondary border-0" />
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" style={{ background: '#f59e0b', color: '#000' }}>Save Client</Button>
      </div>
    </form>
  );
}

export default function Clients() {
  const [mode, setMode] = useState('list');
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const qc = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
  });

  const createMut = useMutation({
    mutationFn: d => base44.entities.Client.create(d),
    onSuccess: () => { qc.invalidateQueries(['clients']); setMode('list'); toast.success('Client saved'); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }) => base44.entities.Client.update(id, d),
    onSuccess: () => { qc.invalidateQueries(['clients']); setMode('list'); setEditing(null); toast.success('Client updated'); },
  });
  const deleteMut = useMutation({
    mutationFn: id => base44.entities.Client.delete(id),
    onSuccess: () => { qc.invalidateQueries(['clients']); setDeleteTarget(null); toast.success('Deleted'); },
  });

  const handleSave = (form) => {
    if (editing) updateMut.mutate({ id: editing.id, d: form });
    else createMut.mutate(form);
  };

  if (mode !== 'list') {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
          <SectionHeader title={editing ? 'Edit Client' : 'New Client'} />
          <div className="bg-card border border-border rounded-xl p-6">
            <ClientForm client={editing} onSave={handleSave} onCancel={() => { setMode('list'); setEditing(null); }} />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
        <SectionHeader
          title="Clients"
          subtitle="Saved client profiles for quick invoice filling"
          action={
            <Button onClick={() => { setEditing(null); setMode('new'); }} className="gap-2" style={{ background: '#f59e0b', color: '#000' }}>
              <Plus className="w-4 h-4" /> Add Client
            </Button>
          }
        />

        {isLoading && <div className="text-muted-foreground text-sm">Loading…</div>}

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {clients.length === 0 && !isLoading ? (
            <div className="text-center py-20 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-4 opacity-20" />
              <p className="font-medium">No clients yet</p>
              <p className="text-sm mt-1">Add clients to speed up invoice creation</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="text-left px-6 py-3">Client</th>
                  <th className="text-left px-6 py-3 hidden md:table-cell">ABN</th>
                  <th className="text-left px-6 py-3 hidden lg:table-cell">Email</th>
                  <th className="text-left px-6 py-3 hidden lg:table-cell">Phone</th>
                  <th className="px-6 py-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                    <td className="px-6 py-4">
                      <div className="font-medium">{c.contact_name}</div>
                      {c.business_name && <div className="text-xs text-muted-foreground">{c.business_name}</div>}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground hidden md:table-cell">{c.abn || '—'}</td>
                    <td className="px-6 py-4 text-muted-foreground hidden lg:table-cell">{c.email || '—'}</td>
                    <td className="px-6 py-4 text-muted-foreground hidden lg:table-cell">{c.phone || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(c); setMode('edit'); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(c)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>Delete <strong>{deleteTarget?.contact_name}</strong>? This cannot be undone.</AlertDialogDescription>
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