# SLA Countdown & Breach Management Dashboard

## Raw Feature Description

**SLA Countdown & Breach Management Dashboard**

Description from user:
- First Contact SLA: Shows countdown when a sub-source is selected. Countdown stops when any document is collected OR a note is entered on that client
- Client to Case SLA: Starts after first contact SLA is satisfied, countdown until case is created
- Stage SLA: On cases, shows countdown for stage-level SLA transitions
- All countdowns show overdue status (hours first, then days - no micro-management needed)
- Manager Dashboard for SLA Breaches with:
  - Filters: All SLA Types, All Owners, This Week
  - Table showing: Client/Case, SLA Type, Owner, Overdue By, Last Activity
  - Actions: View, Reassign (allows reassigning client/case to someone else)

## Example Table Layout

```
Filter: [All SLA Types ▼] [All Owners ▼] [This Week ▼]

┌────────────────────────────────────────────────────────────────────────────────┐
│ CLIENT/CASE    │ SLA TYPE        │ OWNER      │ OVERDUE BY │ LAST ACTIVITY    │
├────────────────────────────────────────────────────────────────────────────────┤
│ Ahmed Khan     │ First Contact   │ Sarah M.   │ 2h 15m     │ No activity      │
│ Client #1042   │                 │            │            │                  │
│                │                 │            │            │ [View] [Reassign]│
├────────────────────────────────────────────────────────────────────────────────┤
│ Mohammed Ali   │ Client → Case   │ Sarah M.   │ 1d 4h      │ Call logged 3d ago│
│ Client #1038   │                 │            │            │                  │
│                │                 │            │            │ [View] [Reassign]│
├────────────────────────────────────────────────────────────────────────────────┤
│ Sara Ahmed     │ Under Review →  │ Khalid P.  │ 6h         │ Note added 1d ago│
│ Case #2055     │ Submitted Credit│            │            │                  │
│                │                 │            │            │ [View] [Reassign]│
└────────────────────────────────────────────────────────────────────────────────┘
```

## Date Initialized
2026-01-18
