import { Badge } from "@/components/ui/badge";

const statusStyles = {
  Draft: "bg-muted text-muted-foreground border-border",
  Sent: "bg-blue-50 text-blue-700 border-blue-200",
  Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Overdue: "bg-red-50 text-red-600 border-red-200",
};

export default function StatusBadge({ status }) {
  return (
    <Badge variant="outline" className={`${statusStyles[status] || ""} text-xs font-medium px-2.5 py-0.5`}>
      {status}
    </Badge>
  );
}