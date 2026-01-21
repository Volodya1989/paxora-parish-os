import { AlertCircle, UserPlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Alert {
  id: string
  type: "access-request" | "approval-needed" | "general"
  message: string
  action: string
}

interface AdminAlertBannerProps {
  alerts: Alert[]
}

export function AdminAlertBanner({ alerts }: AdminAlertBannerProps) {
  if (alerts.length === 0) return null

  const getIcon = (type: Alert["type"]) => {
    switch (type) {
      case "access-request":
        return <UserPlus className="size-4" />
      case "approval-needed":
        return <AlertCircle className="size-4" />
      default:
        return <AlertCircle className="size-4" />
    }
  }

  return (
    <div className="mb-4 space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              {getIcon(alert.type)}
            </div>
            <span className="text-sm font-medium text-amber-800">{alert.message}</span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              size="sm"
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {alert.action}
            </Button>
            <Button variant="ghost" size="icon-sm" className="text-amber-600 hover:bg-amber-100">
              <X className="size-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
