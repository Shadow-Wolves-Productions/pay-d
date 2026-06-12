import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { motion } from "framer-motion";

const empty = {
  invoice_number: "",
  client_name: "",
  amount: "",
  due_date: "",
  status: "Draft",
  notes: "",
};

export default function InvoiceForm({ invoice, onSubmit, onCancel }) {
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (invoice) {
      setForm({
        invoice_number: invoice.invoice_number || "",
        client_name: invoice.client_name || "",
        amount: invoice.amount ?? "",
        due_date: invoice.due_date || "",
        status: invoice.status || "Draft",
        notes: invoice.notes || "",
      });
    } else {
      setForm(empty);
    }
  }, [invoice]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      amount: parseFloat(form.amount) || 0,
    });
  };

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="bg-card border rounded-xl p-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold font-heading">
          {invoice ? "Edit Invoice" : "New Invoice"}
        </h2>
        <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Invoice Number</Label>
            <Input
              placeholder="INV-001"
              value={form.invoice_number}
              onChange={(e) => set("invoice_number", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Client Name</Label>
            <Input
              placeholder="Acme Corp"
              value={form.client_name}
              onChange={(e) => set("client_name", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Amount ($)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Due Date</Label>
            <Input
              type="date"
              value={form.due_date}
              onChange={(e) => set("due_date", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-medium text-muted-foreground">Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Sent">Sent</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Notes (optional)</Label>
          <Textarea
            placeholder="Additional details..."
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="h-20 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
            {invoice ? "Save Changes" : "Create Invoice"}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}