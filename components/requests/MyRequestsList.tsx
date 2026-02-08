import Link from "next/link";
import type { RequestListItem } from "@/lib/queries/requests";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatMessageTime } from "@/lib/time/messageTime";
import {
  getRequestStatusLabel,
  getRequestTypeLabel,
  REQUEST_STATUS_TONES
} from "@/lib/requests/utils";

export default function MyRequestsList({ requests }: { requests: RequestListItem[] }) {
  if (!requests.length) {
    return (
      <Card>
        <CardTitle>No requests yet</CardTitle>
        <CardDescription>
          When you submit a request, updates will show up here.
        </CardDescription>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <Link
          key={request.id}
          href={`/requests/${request.id}`}
          className="block rounded-card focus-ring"
        >
          <Card className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">{request.title}</CardTitle>
              <Badge tone={REQUEST_STATUS_TONES[request.status]}>
                {getRequestStatusLabel(request.status)}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
              <span>{getRequestTypeLabel(request.type)}</span>
              <span aria-hidden="true">•</span>
              <span>Submitted {formatMessageTime(request.createdAt)}</span>
              <span aria-hidden="true">•</span>
              <span>Updated {formatMessageTime(request.updatedAt)}</span>
              {request.assignedTo?.name ? (
                <>
                  <span aria-hidden="true">•</span>
                  <span>Assigned to {request.assignedTo.name}</span>
                </>
              ) : null}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
