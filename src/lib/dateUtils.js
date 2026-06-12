import { format, addDays, parseISO } from 'date-fns';

export function today() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function in14Days() {
  return format(addDays(new Date(), 14), 'yyyy-MM-dd');
}

export function formatDisplayDate(dateStr) {
  if (!dateStr) return '—';
  try { return format(parseISO(dateStr), 'd MMM yyyy'); }
  catch { return dateStr; }
}