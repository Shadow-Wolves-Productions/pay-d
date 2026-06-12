import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import ColourPicker from './ColourPicker';

const empty = {
  name: '', business_name: '', tagline: '', abn: '', address: '', email: '', phone: '', website: '',
  logo_url: '', logo_size: 80, accent_colour: '#f59e0b', gst_enabled: true,
  bank_name: '', account_name: '', bsb: '', account_number: '',
  paypal_email: '', pay_id: '', other_payment: '',
  invoice_prefix: 'INV', default_title: 'Tax Invoice',
  default_payment_terms: 'Payment due within 14 days of invoice date.',
  default_notes: '',
};

function FieldGroup({ title, children }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export default function TemplateForm({ template, onSave, onCancel }) {
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setForm(template ? { ...empty, ...template } : empty);
  }, [template]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('logo_url', file_url);
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <FieldGroup title="Template Identity">
        <Field label="Template Name *">
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="My Business" required />
        </Field>
      </FieldGroup>

      <FieldGroup title="Business Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Business Name"><Input value={form.business_name} onChange={e => set('business_name', e.target.value)} /></Field>
          <Field label="Tagline"><Input value={form.tagline} onChange={e => set('tagline', e.target.value)} /></Field>
          <Field label="ABN"><Input value={form.abn} onChange={e => set('abn', e.target.value)} placeholder="12 345 678 901" /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={e => set('phone', e.target.value)} /></Field>
          <Field label="Email"><Input value={form.email} onChange={e => set('email', e.target.value)} type="email" /></Field>
          <Field label="Website"><Input value={form.website} onChange={e => set('website', e.target.value)} /></Field>
        </div>
        <Field label="Address">
          <Textarea value={form.address} onChange={e => set('address', e.target.value)} className="h-16 resize-none" />
        </Field>
      </FieldGroup>

      <FieldGroup title="Logo">
        <div className="flex items-start gap-4">
          {form.logo_url && <img src={form.logo_url} alt="logo" style={{ width: form.logo_size }} className="rounded" />}
          <div className="flex-1 space-y-3">
            <label className="block">
              <span className="sr-only">Upload logo</span>
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-secondary file:text-sm file:font-medium file:text-foreground cursor-pointer" />
            </label>
            {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
            {form.logo_url && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Size: {form.logo_size}px</Label>
                <Slider min={28} max={160} step={4} value={[form.logo_size]} onValueChange={([v]) => set('logo_size', v)} className="w-48" />
              </div>
            )}
          </div>
        </div>
      </FieldGroup>

      <FieldGroup title="Accent Colour">
        <ColourPicker value={form.accent_colour} onChange={v => set('accent_colour', v)} />
      </FieldGroup>

      <FieldGroup title="GST & Invoice Defaults">
        <div className="flex items-center gap-3">
          <Switch checked={form.gst_enabled} onCheckedChange={v => set('gst_enabled', v)} />
          <span className="text-sm">GST Registered (10%)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Invoice Number Prefix">
            <Input value={form.invoice_prefix} onChange={e => set('invoice_prefix', e.target.value)} placeholder="INV" />
          </Field>
          <Field label="Default Title">
            <Select value={form.default_title} onValueChange={v => set('default_title', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Tax Invoice','Invoice','Pro Forma','Quote','Receipt'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Default Payment Terms">
          <Textarea value={form.default_payment_terms} onChange={e => set('default_payment_terms', e.target.value)} className="h-16 resize-none" />
        </Field>
        <Field label="Default Notes">
          <Textarea value={form.default_notes} onChange={e => set('default_notes', e.target.value)} className="h-16 resize-none" />
        </Field>
      </FieldGroup>

      <FieldGroup title="Bank Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Bank Name"><Input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} /></Field>
          <Field label="Account Name"><Input value={form.account_name} onChange={e => set('account_name', e.target.value)} /></Field>
          <Field label="BSB"><Input value={form.bsb} onChange={e => set('bsb', e.target.value)} placeholder="000-000" /></Field>
          <Field label="Account Number"><Input value={form.account_number} onChange={e => set('account_number', e.target.value)} /></Field>
        </div>
      </FieldGroup>

      <FieldGroup title="Extra Payment Options">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="PayPal Email"><Input value={form.paypal_email} onChange={e => set('paypal_email', e.target.value)} /></Field>
          <Field label="PayID"><Input value={form.pay_id} onChange={e => set('pay_id', e.target.value)} /></Field>
        </div>
        <Field label="Other (e.g. Stripe link)">
          <Input value={form.other_payment} onChange={e => set('other_payment', e.target.value)} />
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" style={{ background: form.accent_colour, color: '#000' }}>
          Save Template
        </Button>
      </div>
    </form>
  );
}