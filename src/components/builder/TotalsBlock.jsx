import React from 'react';
import { formatAUD } from '@/lib/invoiceCalc';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TotalsBlock({ subtotal, discountAmount, gstAmount, total, discountType, discountValue, onDiscountTypeChange, onDiscountValueChange, gstEnabled, accentColour }) {
  return (
    <div className="flex justify-end">
      <div className="w-full max-w-xs space-y-2 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span className="font-mono">{formatAUD(subtotal)}</span>
        </div>

        {/* Discount */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Discount</span>
          <div className="flex items-center gap-1">
            <Select value={discountType} onValueChange={onDiscountTypeChange}>
              <SelectTrigger className="h-7 w-20 text-xs bg-secondary border-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">%</SelectItem>
                <SelectItem value="flat">$</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number" min="0" step="any"
              value={discountValue}
              onChange={e => onDiscountValueChange(e.target.value)}
              className="h-7 w-20 text-xs text-right bg-secondary border-0"
            />
          </div>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-muted-foreground text-xs">
            <span>Discount amount</span>
            <span className="font-mono">-{formatAUD(discountAmount)}</span>
          </div>
        )}

        {gstEnabled && (
          <div className="flex justify-between text-muted-foreground">
            <span>GST (10%)</span>
            <span className="font-mono">{formatAUD(gstAmount)}</span>
          </div>
        )}

        <div className="border-t border-border pt-2 flex justify-between font-bold text-base">
          <span>Total Due</span>
          <span className="font-mono" style={{ color: accentColour }}>{formatAUD(total)}</span>
        </div>

        {gstEnabled && gstAmount > 0 && (
          <div className="text-xs text-muted-foreground text-right">Includes {formatAUD(gstAmount)} GST</div>
        )}
      </div>
    </div>
  );
}