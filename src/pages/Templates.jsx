import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppShell from '@/components/layout/AppShell';
import TemplateForm from '@/components/templates/TemplateForm';
import SectionHeader from '@/components/shared/SectionHeader';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function Templates() {
  const [mode, setMode] = useState('list'); // list | new | edit
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const qc = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => base44.entities.Template.list('-created_date'),
  });

  const createMut = useMutation({
    mutationFn: d => base44.entities.Template.create(d),
    onSuccess: () => { qc.invalidateQueries(['templates']); setMode('list'); toast.success('Template created'); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }) => base44.entities.Template.update(id, d),
    onSuccess: () => { qc.invalidateQueries(['templates']); setMode('list'); setEditing(null); toast.success('Template saved'); },
  });
  const deleteMut = useMutation({
    mutationFn: id => base44.entities.Template.delete(id),
    onSuccess: () => { qc.invalidateQueries(['templates']); setDeleteTarget(null); toast.success('Deleted'); },
  });

  const handleSave = (form) => {
    if (editing) updateMut.mutate({ id: editing.id, d: form });
    else createMut.mutate(form);
  };

  const clone = (t) => {
    const { id, created_date, updated_date, created_by_id, ...rest } = t;
    createMut.mutate({ ...rest, name: rest.name + ' (Copy)' });
  };

  if (mode !== 'list') {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <SectionHeader title={editing ? 'Edit Template' : 'New Template'} />
          <div className="bg-card border border-border rounded-xl p-6">
            <TemplateForm
              template={editing}
              onSave={handleSave}
              onCancel={() => { setMode('list'); setEditing(null); }}
            />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
        <SectionHeader
          title="Templates"
          subtitle="Reusable business profiles for your invoices"
          action={
            <Button onClick={() => { setEditing(null); setMode('new'); }} className="gap-2" style={{ background: '#f59e0b', color: '#000' }}>
              <Plus className="w-4 h-4" /> New Template
            </Button>
          }
        />

        {isLoading && <div className="text-muted-foreground text-sm">Loading…</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <div key={t.id} className="bg-card border border-border rounded-xl overflow-hidden hover:border-foreground/20 transition-colors">
              <div className="h-2" style={{ background: t.accent_colour || '#f59e0b' }} />
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-sm text-muted-foreground">{t.business_name}</div>
                  </div>
                  {t.logo_url && <img src={t.logo_url} alt="" style={{ height: 36, objectFit: 'contain' }} />}
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {t.abn && <div>ABN: {t.abn}</div>}
                  {t.email && <div>{t.email}</div>}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: t.accent_colour + '22', color: t.accent_colour }}>{t.invoice_prefix}</span>
                    <span className="text-muted-foreground">{t.gst_enabled ? 'GST On' : 'No GST'}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => { setEditing(t); setMode('edit'); }}>
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => clone(t)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(t)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {templates.length === 0 && !isLoading && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="font-medium">No templates yet</p>
            <p className="text-sm mt-1">Create a template to get started</p>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</AlertDialogDescription>
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