import React from "react";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import StatusBadge from "./StatusBadge";

export default function InvoiceRow({ invoice, onEdit, onDelete, onStatusChange }) {
  const formattedDate = invoice.due_date
    ? format(new Date(invoice.due_date), "MMM d, yyyy")
    : "—";

  return (
    <tr className="group border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors">
      <td className="py-4 px-4">
        <span className="font-mono text-sm font-medium">{invoice.invoice_number}</span>
      </td>
      <td className="py-4 px-4">
        <span className="font-medium text-sm">{invoice.client_name}</span>
        {invoice.notes && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{invoice.notes}</p>
        )}
      </td>
      <td className="py-4 px-4 text-right">
        <span className="font-semibold text-sm tabular-nums">
          ${(invoice.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      </td>
      <td className="py-4 px-4 text-sm text-muted-foreground">{formattedDate}</td>
      <td className="py-4 px-4">
        <Select
          value={invoice.status}
          onValueChange={(val) => onStatusChange(invoice, val)}
        >
          <SelectTrigger className="w-[120px] h-8 border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>span]:p-0">
            <StatusBadge status={invoice.status} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Sent">Sent</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="py-4 px-4">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onEdit(invoice)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:text-destructive" onClick={() => onDelete(invoice)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </td>
    </tr>
  );
}