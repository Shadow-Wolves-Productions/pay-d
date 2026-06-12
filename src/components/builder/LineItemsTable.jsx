import React from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { formatAUD } from '@/lib/invoiceCalc';

const UNITS = ['hrs', 'days', 'items', 'words', 'pages', 'sessions', 'flat'];

const emptyItem = () => ({ description: '', quantity: 1, unit: 'items', unit_price: 0, gst: true, total: 0 });

export default function LineItemsTable({ items, onChange, gstEnabled }) {
  const update = (idx, field, value) => {
    const next = items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      updated.total = (parseFloat(updated.quantity) || 0) * (parseFloat(updated.unit_price) || 0);
      return updated;
    });
    onChange(next);
  };

  const add = () => onChange([...items, emptyItem()]);
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="hidden md:grid grid-cols-[2fr_80px_100px_110px_60px_80px_32px] gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider px-1">
        <span>Description</span>
        <span>Qty</span>
        <span>Unit</span>
        <span className="text-right">Unit Price</span>
        {gstEnabled && <span className="text-center">GST</span>}
        <span className="text-right">Total</span>
        <span />
      </div>

      {items.map((item, idx) => (
        <div key={idx} className="grid grid-cols-1 md:grid-cols-[2fr_80px_100px_110px_60px_80px_32px] gap-2 items-center bg-secondary/30 rounded-lg p-3 md:p-2">
          <Input
            placeholder="Description"
            value={item.description}
            onChange={e => update(idx, 'description', e.target.value)}
            className="bg-secondary border-0 h-8"
          />
          <Input
            type="number" min="0" step="any"
            value={item.quantity}
            onChange={e => update(idx, 'quantity', e.target.value)}
            className="bg-secondary border-0 h-8 text-right"
          />
          <Select value={item.unit} onValueChange={v => update(idx, 'unit', v)}>
            <SelectTrigger className="bg-secondary border-0 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
          <Input
            type="number" min="0" step="0.01"
            value={item.unit_price}
            onChange={e => update(idx, 'unit_price', e.target.value)}
            className="bg-secondary border-0 h-8 text-right"
          />
          {gstEnabled && (
            <div className="flex justify-center">
              <Switch checked={item.gst} onCheckedChange={v => update(idx, 'gst', v)} />
            </div>
          )}
          <div className="text-right text-sm font-medium tabular-nums">
            {formatAUD((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))}
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(idx)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={add} className="gap-2 border-dashed">
        <Plus className="w-3.5 h-3.5" /> Add Line Item
      </Button>
    </div>
  );
}