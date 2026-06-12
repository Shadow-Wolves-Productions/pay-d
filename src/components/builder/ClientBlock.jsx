import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UserCheck } from 'lucide-react';

function ClientFields({ value, onChange, prefix }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {[['contact_name','Contact Name'],['business_name','Business Name'],['abn','ABN'],['email','Email'],['phone','Phone']].map(([k, l]) => (
        <div key={k} className="space-y-1">
          <Label className="text-xs text-muted-foreground">{l}</Label>
          <Input value={value?.[k] || ''} onChange={e => set(k, e.target.value)} className="h-8 bg-secondary border-0" />
        </div>
      ))}
      <div className="sm:col-span-2 space-y-1">
        <Label className="text-xs text-muted-foreground">Address</Label>
        <Input value={value?.address || ''} onChange={e => set('address', e.target.value)} className="h-8 bg-secondary border-0" />
      </div>
    </div>
  );
}

export default function ClientBlock({ value, onChange, clients, onSaveAsClient }) {
  const [selectedClientId, setSelectedClientId] = useState('');

  const pickClient = (id) => {
    setSelectedClientId(id);
    if (id === '__manual__') { onChange({}); return; }
    const c = clients.find(c => c.id === id);
    if (c) onChange({ contact_name: c.contact_name, business_name: c.business_name, abn: c.abn, address: c.address, email: c.email, phone: c.phone });
  };

  return (
    <div className="space-y-4">
      {clients?.length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={selectedClientId} onValueChange={pickClient}>
            <SelectTrigger className="flex-1 h-8 bg-secondary border-0 text-sm">
              <SelectValue placeholder="Pick a saved client…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__manual__">— Enter manually —</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.business_name || c.contact_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {onSaveAsClient && (
            <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8 shrink-0" onClick={() => onSaveAsClient(value)}>
              <UserCheck className="w-3.5 h-3.5" /> Save Client
            </Button>
          )}
        </div>
      )}
      <ClientFields value={value} onChange={onChange} />
      {(!clients || clients.length === 0) && onSaveAsClient && (
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => onSaveAsClient(value)}>
          <UserCheck className="w-3.5 h-3.5" /> Save as Client
        </Button>
      )}
    </div>
  );
}