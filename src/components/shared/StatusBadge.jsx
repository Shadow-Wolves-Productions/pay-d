const styles = {
  Draft:   'bg-zinc-800 text-zinc-300 border-zinc-700',
  Sent:    'bg-blue-900/50 text-blue-300 border-blue-700',
  Paid:    'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  Overdue: 'bg-red-900/50 text-red-300 border-red-700',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.Draft}`}>
      {status}
    </span>
  );
}