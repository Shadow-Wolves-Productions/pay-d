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
      {items.map((item, idx) => (
        <div key={idx} className="bg-secondary/30 rounded-lg p-3 space-y-2">
          {/* Description row - full width */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Description"
              value={item.description}
              onChange={e => update(idx, 'description', e.target.value)}
              className="bg-secondary border-0 h-8 flex-1"
            />
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => remove(idx)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          {/* Qty / Unit / Price / GST / Total row */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="space-y-0.5">
              <div className="text-xs text-muted-foreground px-1">Qty</div>
              <Input
                type="number" min="0" step="any"
                value={item.quantity}
                onChange={e => update(idx, 'quantity', e.target.value)}
                className="bg-secondary border-0 h-8 w-20 text-right"
              />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs text-muted-foreground px-1">Unit</div>
              <Select value={item.unit} onValueChange={v => update(idx, 'unit', v)}>
                <SelectTrigger className="bg-secondary border-0 h-8 w-24"><SelectValue /></SelectTrigger>
                <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs text-muted-foreground px-1">Unit Price</div>
              <Input
                type="number" min="0" step="0.01"
                value={item.unit_price}
                onChange={e => update(idx, 'unit_price', e.target.value)}
                className="bg-secondary border-0 h-8 w-28 text-right"
              />
            </div>
            {gstEnabled && (
              <div className="space-y-0.5">
                <div className="text-xs text-muted-foreground px-1">GST</div>
                <div className="flex items-center h-8 px-1">
                  <Switch checked={item.gst} onCheckedChange={v => update(idx, 'gst', v)} />
                </div>
              </div>
            )}
            <div className="space-y-0.5 ml-auto">
              <div className="text-xs text-muted-foreground px-1 text-right">Total</div>
              <div className="h-8 flex items-center px-2 text-sm font-semibold tabular-nums text-right min-w-[80px]">
                {formatAUD((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))}
              </div>
            </div>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={add} className="gap-2 border-dashed">
        <Plus className="w-3.5 h-3.5" /> Add Line Item
      </Button>
    </div>
  );
}