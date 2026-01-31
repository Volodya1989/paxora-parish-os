# Parish Hub Grid (v1)

## 1) v1 Design & Technical Doc

### Feature overview
The Parish Hub Grid is a lightweight, icon-forward launchpad for parish resources (e.g., bulletin, Mass times, giving). It is intentionally distinct from Paxora OS workflows and remains read-only, low-risk, and configurable by parish admins. It acts as the parish “front door” while Paxora OS remains the “engine room.”

### User types
- **Parishioner (logged-in):** Views and taps tiles to access parish resources.
- **Public visitor (optional):** Views and taps tiles if the parish enables public visibility.
- **Parish Admin:** Configures tile set (enable/disable, order, icon, destination, visibility).
- **Staff (non-admin):** Same as parishioner; no configuration access.

### Navigation placement
- **Top-level tab:** “Parish”
- **Route:** `/parish`
- **Visibility:**
  - Always visible to logged-in users.
  - Optionally visible to logged-out users (parish setting).

### UI structure
**Page layout (Parish Hub Grid):**
- Header: “Parish” (simple title, no action buttons).
- Body: Responsive tile grid.
- Empty states:
  - If 0 enabled tiles: show friendly message (“No parish resources yet. Please check back soon.”) with no actions.

**Grid behavior:**
- Mobile-first layout with 2 columns.
- Desktop auto-fit with 3–4 columns, depending on width.
- Min 4 tiles, max 12 tiles (enforced in admin configuration).
- Tile content:
  - Icon from predefined enum.
  - Label (max 2 lines).
  - Clickable card with subtle hover/tap feedback.
  - No badges, counters, or status indicators.

**Visual intent:**
- Uses Paxora tokens (typography, spacing, colors, radius).
- Calmer density than OS pages; icon-forward.
- Neutral background (no heavy imagery).
- “Narthex” feel: welcoming, quiet, informational.

### Data model
```ts
type ParishHubItem = {
  id: string;
  label: string;
  icon: ParishIcon; // enum
  targetType: "external" | "internal";
  targetUrl?: string;
  internalRoute?: string;
  visibility: "public" | "logged-in";
  order: number;
  enabled: boolean;
};
```

**Parish-level settings:**
- `parish.hubGridPublicEnabled: boolean` (controls visibility for logged-out users).
- `parish.hubGridEnabled: boolean` (optional global on/off; default true).

### Permissions
- **Read:**
  - Logged-in users: may view all `enabled` tiles with `visibility: logged-in` or `public`.
  - Logged-out users: may view tiles only if `hubGridPublicEnabled` and tile `visibility: public`.
- **Write:**
  - Parish Admins only.
  - Admins can enable/disable tiles, reorder, select icon, set destination, and set visibility.

### Known tradeoffs
- **No dynamic content:** Keeps the hub lightweight and avoids CMS behaviors.
- **Single tile model:** No nested tiles or collections to avoid complexity.
- **Limited icon set:** Ensures consistent brand and reduces design variance.
- **No analytics/personalization:** Lower complexity and privacy risk.

### Explicit v1 limitations
- No tasks, chat, or messaging.
- No bulletin uploads or hosting.
- No custom icons or HTML.
- No counters, badges, or status indicators.
- No personalization or analytics.
- No diocese-level feeds.

### Default tile set (on parish creation)
1. Bulletin
2. Mass Times
3. Confession
4. Parish Website
5. Calendar (read-only)
6. Readings
7. Giving
8. Contact

Each uses an approved icon and can be reordered, disabled, or removed by admins.

---

## 2) Implementation Plan

### High-level architecture impact
- **Frontend:** New `/parish` route and tile grid UI; admin configuration screens within existing parish admin area.
- **Backend:** CRUD endpoints for hub items and parish-level settings; validation for tile limits and allowed icons.
- **Data:** New `ParishHubItem` table + optional parish settings fields.

### Prisma schema changes
- Add `ParishHubItem` model linked to `Parish`.
- Add parish flags:
  - `hubGridPublicEnabled` (boolean, default false)
  - `hubGridEnabled` (boolean, default true)
- Add enum `ParishIcon` with approved icon set.

### Backend API shape
- **Public/Authenticated read:**
  - `GET /api/parish/:parishId/hub-items`
    - Filters by `enabled` and `visibility` based on session.
    - Orders by `order`.
- **Admin write:**
  - `PATCH /api/parish/:parishId/hub-items/reorder`
  - `POST /api/parish/:parishId/hub-items`
  - `PATCH /api/parish/:parishId/hub-items/:itemId`
  - `DELETE /api/parish/:parishId/hub-items/:itemId`
- **Parish settings:**
  - `PATCH /api/parish/:parishId/settings/hub-grid`

### Frontend components list
- `ParishHubPage`
- `ParishHubGrid`
- `ParishHubTile`
- `ParishHubEmptyState`
- `ParishHubAdminPanel`
- `ParishHubItemForm` (icon picker, label, target type, URL/route, visibility)
- `ParishHubReorderList`

### Admin UI plan
- Location: existing parish admin settings area (new section “Parish Hub”).
- Controls:
  - Toggle hub visibility for public users.
  - Add/edit/remove items (max 12, min 4 enforced).
  - Reorder via drag-and-drop or up/down controls.
  - Icon picker from enum.
  - Destination config (external URL or internal route).
  - Visibility toggle (public vs logged-in).
- Validation:
  - `label` length (max 2 lines in UI).
  - Require destination fields per `targetType`.
  - Enforce unique `order` and tile count constraints.

### Routing updates
- Add top-level “Parish” tab.
- Route `/parish`:
  - Server-side fetch of hub items.
  - Enforce visibility based on auth and parish settings.

### Rollout strategy
- **Phase 1:** Feature flag `parishHubGridEnabled` per parish (default on for new parishes, off for existing unless opted in).
- **Phase 2:** Enable for existing parishes after admin communication.
- **Optional:** Soft launch for staff-only visibility before public.

### Sequencing (implementation steps)
1. **Data layer**
   - Add Prisma model + migrations.
   - Seed default tiles for new parishes.
2. **Backend**
   - Implement read endpoints with visibility rules.
   - Implement admin CRUD + reorder endpoints.
3. **Frontend**
   - Build `/parish` grid UI with responsive layout.
   - Add empty state and subtle hover/tap feedback.
4. **Admin UI**
   - Add configuration section in admin settings.
   - Implement tile form + reorder UI.
5. **Permissions + validation**
   - Enforce admin-only writes.
   - Enforce min/max tiles and allowed icon enum.
6. **Rollout**
   - Toggle flag per parish.
   - Documentation and admin training.

### Risks + mitigations
- **Risk:** Overlap with Paxora OS workflows.
  - **Mitigation:** Keep the hub read-only and icon-forward; no action buttons or workflows.
- **Risk:** Admin misconfiguration (too few tiles, broken URLs).
  - **Mitigation:** Enforce min 4 tiles and validate URLs/routes; provide sensible defaults.
- **Risk:** Public access confusion.
  - **Mitigation:** Parish-level toggle for public visibility; default off.
