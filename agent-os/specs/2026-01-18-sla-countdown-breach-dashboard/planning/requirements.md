# SLA Countdown & Breach Management Dashboard - Requirements

## Overview

This feature adds real-time SLA countdown tracking across Clients and Cases, with a Manager Dashboard to view and manage SLA breaches.

---

## SLA Types

### 1. First Contact SLA (Channel-level)
- **Source**: Uses existing `sla_timer` on Client model (configured per Channel/Source/SubSource)
- **Starts**: When client is created with a sub-source selected
- **Stops when ANY of these occur**:
  - Any document is uploaded
  - Any note is added
  - Any state change (e.g., closed, rejected)
  - Client moves to Case
- **Display**: Countdown on Client detail/side panel

### 2. Client to Case SLA
- **Source**: `ClientToCaseSLAConfig` model (default: 7 days / 168 hours)
- **Starts**: AFTER First Contact SLA is satisfied
- **Stops**: When a Case is created from the Client
- **Display**: Countdown on Client detail/side panel (only shows after First Contact is done)

### 3. Stage SLA (Case-level)
- **Source**: `StageSLAConfig` model (per stage transition)
- **Starts**: When case enters a stage (`stage_changed_at`)
- **Stops**: When case moves to next stage
- **Display**: Countdown on Case detail/side panel

---

## Existing SLA Configuration (Already Implemented)

### Channel First Contact SLA
- Configured at Channel > Source > SubSource level
- Field: `sla_minutes` (inherits from parent if not set)
- Location: Settings > Channels

### Client to Case SLA Config
- Model: `ClientToCaseSLAConfig`
- Fields: `sla_hours` (default 168 = 7 days), `breach_percent` (default 120%)
- Location: Settings > SLA Config

### Stage SLA Config
- Model: `StageSLAConfig`
- Fields: `from_stage`, `to_stage`, `sla_hours`, `breach_percent`
- Default transitions configured (Processing → Submitted to Bank = 1 day, etc.)
- Location: Settings > SLA Config

---

## Countdown Display Rules

### Format
- **Non-overdue**: Hours only (e.g., "12h remaining", "48h remaining")
- **Overdue**: Simple hours OR days
  - Under 24h overdue: "6h overdue"
  - 24h+ overdue: "2d overdue"

### Visual Indicators
- Green: Plenty of time remaining (> 50% of SLA)
- Yellow/Orange: Warning (< 50% remaining)
- Red: Overdue

---

## Owner Assignment

### New Field: `assigned_to`
- Add `assigned_to` ForeignKey to User on:
  - `Client` model
  - `Case` model
- **Default**: User who creates the record
- **Nullable**: Yes (for existing records migration)

---

## Manager Breach Dashboard

### Access
- **Manager role ONLY** (not Admin, not MS, not PE)

### Location
- New page/section in Manager area

### Filters (MVP)
- **SLA Type**: All, First Contact, Client → Case, Stage (dropdown)
- **Owner**: All, or select specific user (dropdown)
- **Time**: All (no date filtering for MVP)

### Table Columns
| Column | Description |
|--------|-------------|
| Client/Case | Name + ID (e.g., "Ahmed Khan - Client #1042") |
| SLA Type | First Contact, Client → Case, or Stage transition name |
| Owner | Assigned user name |
| Overdue By | Hours or days (e.g., "6h", "2d") |
| Last Activity | Brief description + time ago (e.g., "Note added 1d ago") |
| Actions | [View] [Reassign] buttons |

### Actions
- **View**: Opens Client/Case side panel
- **Reassign**: Modal to select new owner, updates `assigned_to`

---

## NOT Included (MVP Scope)

- No push notifications
- No email alerts
- No automatic escalation
- No Slack/webhook integrations
- No custom date range filters
- No breach percentage threshold alerts (just overdue/not overdue)

---

## Technical Notes

### Models to Modify
- `Client`: Add `assigned_to`, track first contact completion
- `Case`: Add `assigned_to`

### New Fields Needed
- `Client.first_contact_completed_at` - Timestamp when First Contact SLA was satisfied
- `Client.assigned_to` - ForeignKey to User
- `Case.assigned_to` - ForeignKey to User

### Computed Properties
- `Client.first_contact_sla_status` - remaining time or overdue
- `Client.client_to_case_sla_status` - remaining time or overdue (only if first contact done)
- `Case.stage_sla_status` - remaining time or overdue for current stage

### API Endpoints
- `GET /api/sla-breaches/` - List all breached SLAs (for Manager Dashboard)
- `PATCH /api/clients/{id}/reassign/` - Reassign client owner
- `PATCH /api/cases/{id}/reassign/` - Reassign case owner
