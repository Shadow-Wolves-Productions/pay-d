import { FileText, Send, CheckCircle, AlertTriangle } from "lucide-react";

const statConfig = [
  { key: "Draft", label: "Drafts", icon: FileText, color: "text-muted-foreground", bg: "bg-muted" },
  { key: "Sent", label: "Sent", icon: Send, color: "text-blue-600", bg: "bg-blue-50" },
  { key: "Paid", label: "Paid", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  { key: "Overdue", label: "Overdue", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
];

export default function StatsBar({ invoices }) {
  const counts = invoices.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {});

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <div className="col-span-2 lg:col-span-1 bg-card rounded-xl border p-5 flex flex-col justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Revenue</span>
        <span className="text-2xl font-bold font-display mt-1 tracking-tight">
          ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <span className="text-xs text-muted-foreground mt-1">{invoices.length} invoices</span>
      </div>
      {statConfig.map(({ key, label, icon: Icon, color, bg }) => (
        <div key={key} className="bg-card rounded-xl border p-5 flex items-center gap-4">
          <div className={`${bg} rounded-lg p-2.5`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold font-display tracking-tight">{counts[key] || 0}</p>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}