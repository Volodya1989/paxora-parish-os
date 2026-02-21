# IOS-C3 — In-app “Report content” flow

## Feature summary
IOS-C3 adds an explicit, in-app report flow for user-generated content across chat, announcements, and groups. Reports are persisted with parish/user context and surfaced in an admin moderation queue for triage.

This implementation is intentionally minimal and safe:
- users can flag content for review,
- no immediate destructive action occurs,
- admins/shepherds can review and transition report status.

## Where report buttons exist
- **Chat**: message context menu now includes **Report content**.
- **Announcements**: parishioner/read-only announcement rows include **Report content**.
- **Groups**: joined group overflow menu includes **Report content**.

## Data model + API contract
### Prisma model
`ContentReport` persisted fields:
- `reporterUserId` (required)
- `parishId` (required)
- `contentType` (`CHAT_MESSAGE | ANNOUNCEMENT | GROUP_CONTENT`)
- `contentId` (required)
- `reason` (optional)
- `details` (optional)
- `createdAt` timestamp
- `status` (`OPEN | REVIEWED | DISMISSED`)
- `reviewerUserId` (optional, set on moderation action)

Dedupe/idempotency is enforced by unique index:
- `(parishId, reporterUserId, contentType, contentId)`

### Server actions
- `submitContentReport(input)`
  - Auth required.
  - Enforces parish/visibility checks by content type.
  - Creates report or reopens existing deduped report.
- `updateContentReportStatus({ reportId, status })`
  - Admin/shepherd only.
  - Updates status + reviewer attribution.
- `listParishContentReports()`
  - Admin/shepherd only.
  - Returns queue rows for admin UI.

## Admin review path
- Route: `/admin/reports`
- Access: admin/shepherd only.
- Queue columns:
  - type
  - target id
  - reporter
  - created time
  - status
- Status actions:
  - **Mark reviewed**
  - **Dismiss**

## Manual QA checklist (TestFlight evidence)
1. **Chat report path**
   - Open a chat message action menu.
   - Tap **Report content**.
   - Verify success toast appears.
   - Verify item appears in `/admin/reports`.
2. **Announcement report path**
   - As non-leader user, open announcements list.
   - Tap **Report content** on a published announcement.
   - Verify item appears in `/admin/reports`.
3. **Groups report path**
   - Open joined groups menu.
   - Tap **Report content**.
   - Verify item appears in `/admin/reports`.
4. **Access control**
   - Confirm non-admin user cannot access `/admin/reports`.
   - Confirm non-admin cannot invoke moderation status update action.
5. **Moderation transitions**
   - As admin/shepherd, set one report to **Reviewed**.
   - Set another to **Dismissed**.
   - Verify status updates persist after refresh.
6. **Duplicate handling**
   - Submit same report twice from same user/content.
   - Verify no duplicate row; user gets “already submitted” confirmation.

## Evidence artifacts to capture
- Screenshot/video of report action in chat.
- Screenshot/video of report action in announcements.
- Screenshot/video of report action in groups.
- Screenshot of `/admin/reports` showing queued entries.
- Screenshot of status transition result.
