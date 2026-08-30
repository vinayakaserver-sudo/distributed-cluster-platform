import { Badge } from "@/components/ui/badge"

interface NodeStatusBadgeProps {
  status: string
}

export function NodeStatusBadge({ status }: NodeStatusBadgeProps) {
  let colorClass = "bg-gray-500"
  
  switch (status.toLowerCase()) {
    case "online": colorClass = "bg-green-500 hover:bg-green-600"; break;
    case "offline": colorClass = "bg-red-500 hover:bg-red-600"; break;
    case "degraded": colorClass = "bg-yellow-500 hover:bg-yellow-600"; break;
    case "starting": colorClass = "bg-blue-500 hover:bg-blue-600"; break;
    case "disabled": colorClass = "bg-gray-500 hover:bg-gray-600"; break;
  }

  return (
    <Badge className={`${colorClass} text-white capitalize`}>
      {status}
    </Badge>
  )
}
