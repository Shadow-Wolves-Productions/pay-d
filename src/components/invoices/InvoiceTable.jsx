import React from "react";
import InvoiceRow from "./InvoiceRow";
import { FileText } from "lucide-react";

export default function InvoiceTable({ invoices, onEdit, onDelete, onStatusChange }) {
  if (invoices.length === 0) {
    return (
      <div className="bg-card border rounded-xl flex flex-col items-center justify-center py-20 px-6">
        <div className="bg-muted rounded-full p-4 mb-4">
          <FileText className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No invoices yet</p>
        <p className="text-xs text-muted-foreground mt-1">Create your first invoice to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">Invoice</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">Client</th>
              <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">Amount</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">Due Date</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">Status</th>
              <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <InvoiceRow
                key={inv.id}
                invoice={inv}
                onEdit={onEdit}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}