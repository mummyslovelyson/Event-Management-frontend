# UserManagementPage Full Redesign Plan

## Current State
- Table-based layout with checkbox selection
- 6 separate modals for profile/edit/suspend/delete/reject/reset
- Basic filters (search, status, sort)
- Basic bulk actions (suspend/unsuspend only)

## Redesign Vision: Card Grid + Slide-Out Panel

### Layout Structure (top to bottom)

```
┌─────────────────────────────────────────────────┐
│  PageHeader: "Users" + Export CSV button         │
├─────────────────────────────────────────────────┤
│  StatCard grid (4 cols):                         │
│  [Total Users] [Active] [Suspended] [Pending]   │
├─────────────────────────────────────────────────┤
│  Filter bar: Search | Role | Status | Sort | ... │
├─────────────────────────────────────────────────┤
│  Tab bar: All | Attendees | Organizers | Susp.   │
├─────────────────────────────────────────────────┤
│  Bulk action floating bar (when selected)        │
├─────────────────────────────────────────────────┤
│  Card grid (responsive):                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ User Card│ │ User Card│ │ User Card│        │
│  └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐                      │
│  │ User Card│ │ User Card│                      │
│  └──────────┘ └──────────┘                      │
├─────────────────────────────────────────────────┤
│  Pagination                                      │
└─────────────────────────────────────────────────┘

When a card is clicked → Slide-out detail panel from right:

┌──────────────────────────┬──────────────────────┐
│                          │  Slide-out Panel      │
│  (dimmed background)     │  ┌──────────────────┐ │
│                          │  │ Avatar + Name     │ │
│                          │  │ Role + Status     │ │
│                          │  │ Quick Actions     │ │
│                          │  ├──────────────────┤ │
│                          │  │ Tabs:             │ │
│                          │  │ Overview|Activity │ │
│                          │  │ Sessions|Notes    │ │
│                          │  ├──────────────────┤ │
│                          │  │ (tab content)     │ │
│                          │  └──────────────────┘ │
└──────────────────────────┴──────────────────────┘
```

### 1. Stats Bar (NEW)
- 4 StatCard components in `grid grid-cols-2 lg:grid-cols-4 gap-4`
- Total Users, Active, Suspended, Pending Organizers
- Data from `GET /admin/users/stats`
- Animated count-up on mount

### 2. Filter Bar (ENHANCED)
- Search input with icon (existing)
- Role dropdown (All, Attendee, Organizer, Admin)
- Status dropdown (All, Active, Suspended, Pending)
- Email Verified toggle (All, Verified, Unverified)
- Sort dropdown (Newest, Oldest, Name A-Z, Last Active)
- Clear all filters button
- Compact horizontal layout in a card

### 3. Tab Bar (EXISTING, minor update)
- Same pill-style tabs: All, Attendees, Organizers, Suspended
- Count badges on each tab

### 4. Bulk Action Floating Bar (ENHANCED)
- Appears as a sticky bottom bar when items are selected
- Shows count of selected
- Actions: Change Role (dropdown), Suspend, Unsuspend, Delete, Clear
- Animated slide-up with framer-motion

### 5. View Toggle (NEW)
- Toggle buttons in the filter bar: [Cards icon] [Table icon]
- State persisted in component state
- Cards view: responsive grid of user cards
- Table view: existing table layout (polished with same data)
- Both share the same data, filters, bulk actions, and detail panel

### 6. User Cards (NEW — replaces table)
- `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`
- Each card:
  - Checkbox (top-left corner)
  - Avatar circle with initials (large, 48px)
  - Name (bold) + ShieldCheck icon if admin
  - Email (secondary text, truncated)
  - Role badge + Status badge (side by side)
  - Stats row: Events count | Tickets count | Joined date
  - Hover: border brightens, subtle lift
  - Click: opens slide-out detail panel
  - Quick action icons on hover (top-right): Edit, Suspend, Delete

### 7. Slide-Out Detail Panel (NEW — replaces all modals)
- Fixed right panel, width `w-[480px]` on desktop, full-width on mobile
- Animated slide-in from right with backdrop dim
- Close button + Escape key
- **Header section:**
  - Large avatar (64px)
  - Name, email, role badge, status badge
  - Join date, last active
  - Quick action buttons row: Edit, Reset Password, Suspend/Unsuspend, Force Logout, Delete
- **Tabbed content area:**
  - **Overview tab:** Detail grid (phone, location, DOB, email verified, org info), password hash viewer
  - **Activity tab:** Timeline of recent actions from audit log (login, register, orders, etc.)
  - **Sessions tab:** List of active sessions with IP, device, last active, revoke button per session
  - **Notes tab:** Admin notes list + add note form

### 7. Edit Modal (KEPT but simplified)
- Same form fields: name, email, phone, role
- Cleaner layout
- No longer handles approve/reject (those are inline)

### 8. Reset Password Modal (KEPT)
- Same UX: auto-generate or custom password, copy to clipboard

### 9. Delete Confirmation (KEPT)
- Same warning with user name and consequences

### 10. Export CSV (NEW)
- Button in PageHeader actions area
- Downloads CSV of currently filtered users
- Shows toast with download count

### Backend Endpoints Already Built
- `GET /admin/users/stats` — overview stats
- `GET /admin/users/:id/activity` — activity feed
- `GET /admin/users/:id/sessions` — active sessions
- `GET /admin/users/:id/stats` — per-user stats
- `POST /admin/users/:id/force-logout` — revoke all sessions
- `POST /admin/users/:id/notes` — add admin note
- `GET /admin/users/:id/notes` — get admin notes
- `DELETE /admin/users/notes/:noteId` — delete note
- `GET /admin/users/export/csv` — export filtered users
- `POST /admin/users/bulk/role` — bulk role change
- `POST /admin/users/bulk/delete` — bulk delete

### Components to Use
- `StatCard` — stats bar
- `Badge` — role/status badges
- `Modal` — edit, reset password, delete confirm
- `EmptyState` — empty grid state
- `LoadingSpinner` — loading states
- `Pagination` — bottom pagination
- `PageHeader` — header with export action

### Key Design Decisions
1. Cards instead of table — more visual, shows more info at a glance
2. Slide-out panel instead of modals — keeps context visible, feels faster
3. Tabs in the panel — organized detail without overwhelming
4. Floating bulk bar — always accessible, doesn't take permanent space
5. Inline quick actions on hover — fast without opening anything
6. Stats bar — immediate overview of user base health
