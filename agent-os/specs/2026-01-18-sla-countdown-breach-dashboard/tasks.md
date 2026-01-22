# Task Breakdown: SLA Countdown & Breach Management Dashboard

## Overview
Total Tasks: 4 Task Groups, 20 Sub-tasks

This feature adds real-time SLA countdown tracking across Clients and Cases, with a Manager-only Dashboard to view and manage SLA breaches.

## Task List

---

### Database Layer

#### Task Group 1: Data Models and Migrations
**Dependencies:** None

- [x] 1.0 Complete database layer for SLA tracking
  - [x] 1.1 Add `assigned_to` ForeignKey to Client model
    - Field: `assigned_to` ForeignKey to User
    - Nullable: Yes (for existing records)
    - Default: Set to `created_by` user on save if not provided
    - Related name: `assigned_clients`
  - [x] 1.2 Add `first_contact_completed_at` to Client model
    - Field: `first_contact_completed_at` DateTimeField
    - Nullable: Yes
    - Auto-populated when First Contact SLA is satisfied
  - [x] 1.3 Add `assigned_to` ForeignKey to Case model
    - Field: `assigned_to` ForeignKey to User
    - Nullable: Yes (for existing records)
    - Default: Set to `created_by` user on save if not provided
    - Related name: `assigned_cases`
  - [x] 1.4 Create migration for Client model changes
    - Add `assigned_to` foreign key with index
    - Add `first_contact_completed_at` timestamp field
    - Data migration: Set `assigned_to` = `created_by` for existing records where null
  - [x] 1.5 Create migration for Case model changes
    - Add `assigned_to` foreign key with index
    - Data migration: Set `assigned_to` = `created_by` for existing records where null
  - [x] 1.6 Implement computed property `first_contact_sla_status` on Client
    - Use existing `sla_timer` from Channel/Source/SubSource
    - Calculate remaining time from `created_at`
    - Return dict: `{status: 'ok'|'warning'|'overdue', remaining_hours: int, display: str}`
    - Status thresholds: ok (>50%), warning (<50%), overdue (<0)
  - [x] 1.7 Implement computed property `client_to_case_sla_status` on Client
    - Only compute if `first_contact_completed_at` is set
    - Use `ClientToCaseSLAConfig` for SLA hours (default 168h)
    - Calculate from `first_contact_completed_at` timestamp
    - Return dict: `{status: 'ok'|'warning'|'overdue', remaining_hours: int, display: str}`
  - [x] 1.8 Implement computed property `stage_sla_status` on Case
    - Use `StageSLAConfig` for current stage transition
    - Calculate from `stage_changed_at` timestamp
    - Return dict: `{status: 'ok'|'warning'|'overdue', remaining_hours: int, display: str}`
  - [x] 1.9 Implement signal to auto-populate `first_contact_completed_at`
    - Listen for: Document upload, Note added, State change, Case created
    - Set timestamp on first qualifying event if not already set

**Acceptance Criteria:**
- `assigned_to` fields default correctly on new records
- `first_contact_completed_at` auto-populates on qualifying events
- All three SLA status computed properties return correct values
- Migrations run successfully with data backfill

---

### API Layer

#### Task Group 2: SLA Breach API Endpoints
**Dependencies:** Task Group 1

- [x] 2.0 Complete API layer for SLA breach management
  - [x] 2.1 Create SLA Breaches list endpoint
    - Endpoint: `GET /api/sla-breaches/`
    - Permission: Manager role only
    - Query params: `sla_type` (all|first_contact|client_to_case|stage), `owner` (user_id|all)
    - Response: List of breached items with client/case info, SLA type, owner, overdue_by, last_activity
  - [x] 2.2 Implement SLA breach queryset logic
    - Query Clients with overdue First Contact SLA
    - Query Clients with overdue Client-to-Case SLA (where first_contact_completed_at is set)
    - Query Cases with overdue Stage SLA
    - Combine and sort by most overdue first
  - [x] 2.3 Create Client reassign endpoint
    - Endpoint: `PATCH /api/clients/{id}/reassign/`
    - Permission: Manager role only
    - Request body: `{assigned_to: user_id}`
    - Validate user exists and is active
    - Response: Updated client with new owner
  - [x] 2.4 Create Case reassign endpoint
    - Endpoint: `PATCH /api/cases/{id}/reassign/`
    - Permission: Manager role only
    - Request body: `{assigned_to: user_id}`
    - Validate user exists and is active
    - Response: Updated case with new owner
  - [x] 2.5 Add SLA status fields to existing Client serializer
    - Add `first_contact_sla_status` to Client detail response
    - Add `client_to_case_sla_status` to Client detail response
    - Add `assigned_to` with user name to response
  - [x] 2.6 Add SLA status fields to existing Case serializer
    - Add `stage_sla_status` to Case detail response
    - Add `assigned_to` with user name to response

**Acceptance Criteria:**
- Manager role can access breach dashboard endpoint
- Non-managers receive 403 Forbidden
- Filters work correctly for SLA type and owner
- Reassign endpoints update ownership successfully

---

### Frontend Components

#### Task Group 3: SLA Countdown Display Components
**Dependencies:** Task Group 2

- [x] 3.0 Complete SLA countdown display on Client/Case panels
  - [x] 3.1 Create SLACountdown component
    - Props: `status` (ok|warning|overdue), `remainingHours`, `displayText`
    - Visual: Green (>50%), Yellow (<50%), Red (overdue)
    - Format non-overdue: "Xh remaining"
    - Format overdue <24h: "Xh overdue"
    - Format overdue >=24h: "Xd overdue"
  - [x] 3.2 Create SLAStatusBadge component
    - Compact badge variant of countdown for list views
    - Props: same as SLACountdown
    - Tooltip on hover with full details
  - [x] 3.3 Integrate SLA countdown into Client detail/side panel
    - Display First Contact SLA countdown (always visible)
    - Display Client-to-Case SLA countdown (only when first contact completed)
    - Position: Near top of panel in status section
  - [x] 3.4 Integrate SLA countdown into Case detail/side panel
    - Display Stage SLA countdown
    - Show current stage name with countdown
    - Position: Near top of panel in status section

**Acceptance Criteria:**
- Countdown displays correct time format
- Colors match status thresholds (green/yellow/red)
- Client panel shows both SLA countdowns appropriately
- Case panel shows stage SLA countdown

---

#### Task Group 4: Manager Breach Dashboard UI
**Dependencies:** Task Groups 2, 3

- [x] 4.0 Complete SLA Breaches in Team Performance page
  - [x] 4.1 Integrate SLA Breaches section into Team Performance page
    - Route: `/analytics/team` (Manager role only)
    - Layout: Stats cards at top, SLA Breaches section below with filters
    - Empty state: "No SLA breaches found"
  - [x] 4.2 Create SLA type filter dropdown
    - Options: All, First Contact, Client to Case, Stage
    - Default: All
    - Updates table on change
  - [x] 4.3 Create Owner filter dropdown
    - Options: All, plus list of users with assigned items
    - Default: All
    - Updates table on change
  - [x] 4.4 Create BreachTable component
    - Columns: Client/Case, SLA Type, Owner, Overdue By, Last Activity, Actions
    - Client/Case: Name + ID (e.g., "Ahmed Khan - Client #1042")
    - SLA Type: Badge with type name
    - Overdue By: Red text with hours/days
    - Last Activity: Description + time ago (e.g., "Note added 1d ago")
    - Actions: View and Reassign buttons
  - [x] 4.5 Implement View action
    - Click opens Client or Case side panel
    - Reuse existing side panel components
  - [ ] 4.6 Create ReassignModal component *(DEFERRED - requires notifications and SLA handling)*
    - Modal with user selection dropdown
    - Shows current owner
    - Dropdown of active users
    - Confirm/Cancel buttons
    - On confirm: PATCH to reassign endpoint, refresh table
    - **Note:** Reassign endpoints removed from ClientViewSet and CaseViewSet; will be added later with notifications
  - [x] 4.7 Team Performance accessible via existing navigation
    - Uses existing "Team Performance" link in Analytics section
    - Shows real Active Users and SLA Breaches count from backend

**Acceptance Criteria:**
- Team Performance page accessible only to Manager role
- Filters correctly filter displayed breaches
- View action opens appropriate side panel
- Reassign modal successfully updates owner

---

## Execution Order

Recommended implementation sequence:

1. **Database Layer (Task Group 1)** - Foundation models and computed properties
2. **API Layer (Task Group 2)** - Endpoints for breach data and reassignment
3. **SLA Countdown Components (Task Group 3)** - Display components for Client/Case panels
4. **Manager Breach Dashboard (Task Group 4)** - Full dashboard page with filters and actions

---

## Technical Notes

### Models Modified
- `Client`: Add `assigned_to`, `first_contact_completed_at`
- `Case`: Add `assigned_to`

### Existing Models Used (Read-Only)
- `ClientToCaseSLAConfig`: For Client-to-Case SLA hours
- `StageSLAConfig`: For Stage SLA hours per transition
- Channel/Source/SubSource: For First Contact SLA (`sla_minutes`)

### Key Computed Properties
- `Client.first_contact_sla_status`
- `Client.client_to_case_sla_status`
- `Case.stage_sla_status`

### API Endpoints Summary
| Method | Endpoint | Permission | Purpose |
|--------|----------|------------|---------|
| GET | `/api/sla-breaches/` | Manager | List all breached SLAs |
| PATCH | `/api/clients/{id}/reassign/` | Manager | Reassign client owner |
| PATCH | `/api/cases/{id}/reassign/` | Manager | Reassign case owner |

### Display Format Reference
| Condition | Format | Color |
|-----------|--------|-------|
| >50% time remaining | "Xh remaining" | Green |
| <50% time remaining | "Xh remaining" | Yellow |
| <24h overdue | "Xh overdue" | Red |
| >=24h overdue | "Xd overdue" | Red |

### SLA Filter on List Pages
All three list pages (Leads, Clients, Cases) have an SLA status dropdown filter:
- **All SLA** - Show all items
- **Completed** - Items with `display == 'Completed'`
- **Overdue** - Items with `is_overdue == true` or `status == 'overdue'`
- **Remaining** - Items with time remaining (not overdue, not completed)

Filter logic uses the actual SLA status values from the model properties (`sla_timer`, `first_contact_sla_status`, `client_to_case_sla_status`, `stage_sla_status`).

### Out of Scope (MVP)
- No notifications or email alerts
- No automatic escalation
- No Slack/webhook integrations
- No custom date range filters
- No breach percentage threshold alerts
