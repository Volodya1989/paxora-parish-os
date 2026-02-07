# Multi-parish + Paxora Super Admin

## Overview
Paxora Parish OS now supports multiple parishes (multi-tenant) with a single app experience. Every parish-owned record stays scoped to a `parishId`, and users operate within a resolved **active parish context**. A Paxora Super Admin can manage parishes globally without using a separate platform tool.

## Schema changes
### Core entities
- **Parish**
  - `id`, `name`, `slug`
  - `timezone`, `contactEmail`, `contactPhone`
  - Existing email/hub settings remain untouched
- **Membership**
  - Existing membership model continues to represent parish roles (`ADMIN`, `SHEPHERD`, `MEMBER`).
- **User**
  - `activeParishId` persists the active parish context.
  - `isPaxoraSuperAdmin` marks global super admins.

## Active parish resolution
Active parish resolution is centralized in `server/auth/parish-context.ts`:
1. **If `activeParishId` is valid** and the user is a member, use it.
2. **If the user is a Super Admin**, allow any valid parish and default to the earliest parish if none is set.
3. **If the user has memberships**, use the earliest membership and update `activeParishId`.
4. **If no memberships exist**, bootstrap a parish and membership via `ensureParishBootstrap`.

UI behavior:
- The parish switcher only shows when the user is a Super Admin or belongs to more than one parish.
- Switching updates `activeParishId` and refreshes the app context.

## Super Admin capabilities
Super Admins can:
- View all parishes in `/super-admin`.
- Create new parishes with basic settings.
- Update parish details (name, slug, timezone, contact info).
- Switch into a parish context to assist local leaders.

## Migration strategy
1. **Default parish**
   - Existing deployments already contain a parish record. If not, `ensureParishBootstrap` creates one.
2. **Backfill & membership**
   - Existing records already have `parishId` fields. User memberships are preserved.
3. **Super Admin flag**
   - New `isPaxoraSuperAdmin` column defaults to `false`.

## Adding a new parish
1. Navigate to `/super-admin`.
2. Use **Create a parish** to set name, slug, timezone, and contact details.
3. Default parish hub items are created automatically.
4. Use the **Enter parish** button to switch context and continue management.
