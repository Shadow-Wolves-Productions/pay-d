import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { formatAUD } from '@/lib/invoiceCalc';

const UNITS = ['Hour', 'Day', 'Half Day', 'Week', 'Item', 'Project', 'Fixed Fee', 'Kilometre', 'Mile', 'Session', 'Shoot Day', 'Edit Day'];

const PRESETS = [
  'Day Rate', 'Half Day Rate', 'Hourly Rate', 'Overtime', 'Kit Fee',
  'Mileage / Travel', 'Per Diem', 'Buyout', 'Deposit', 'Final Payment',
  'Rush Fee', 'Cancellation / Kill Fee', 'Editing Services', 'Production Services',
  'Acting Services', 'Camera Hire', 'Sound Kit Hire', 'Wardrobe / Props',
  'Location Fee', 'Usage / Licensing', 'Other',
];

const emptyItem = () => ({ description: '', quantity: 1, unit: 'Day', unit_price: 0, gst: true, total: 0 });

export default function LineItemsTable({ items, onChange, gstEnabled }) {
  const [showPreset, setShowPreset] = useState(null);

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

  const applyPreset = (idx, preset) => {
    update(idx, 'description', preset);
    setShowPreset(null);
  };

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="bg-secondary/30 rounded-lg p-3 space-y-2">
          {/* Description row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Description"
                value={item.description}
                onChange={e => update(idx, 'description', e.target.value)}
                className="bg-secondary border-0 h-8 pr-8"
              />
              <button
                type="button"
                onClick={() => setShowPreset(showPreset === idx ? null : idx)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title="Choose preset"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showPreset === idx && (
                <div className="absolute left-0 top-9 z-50 w-full max-h-60 overflow-y-auto bg-popover border border-border rounded-lg shadow-xl">
                  {PRESETS.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => applyPreset(idx, p)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => remove(idx)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Qty / Unit / Price / GST / Total */}
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
                <SelectTrigger className="bg-secondary border-0 h-8 w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs text-muted-foreground px-1">Rate</div>
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