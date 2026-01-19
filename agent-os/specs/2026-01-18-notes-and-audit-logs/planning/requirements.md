# Spec Requirements: Notes and Audit Logs

## Initial Description
Build a Notes, Activity & Audit Log system for Rivo OS that tracks all database changes, provides human-readable activity timelines per record, and allows users to create notes with optional reminders.

## Requirements Discussion

### User-Provided Specification

The user provided a comprehensive specification document (Version 1.0, January 2025) covering the complete feature design.

---

## 1. Audit Log

### 1.1 Core Principle
- Any DB action from the dashboard = Audit Log entry
- Activity Log = filtered view of Audit Log (human-readable, shown on Client/Case page)
- Audit Log = raw DB log (admin-only, full history)
- Same data, different views. No separate systems.

### 1.2 Schema
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| table_name | string | Target table (clients, cases, leads, notes, documents, etc.) |
| record_id | UUID | ID of the affected record |
| action | enum | CREATE, UPDATE, DELETE |
| user_id | UUID | Who performed the action |
| timestamp | datetime | When action occurred |
| changes | JSON | Before/after values |
| metadata | JSON | IP, user agent, etc. |

### 1.3 Examples
```
CREATE | documents | doc_123 | riyas | Jan 18 10:30 | { name: "passport.pdf" }
UPDATE | clients | client_456 | riyas | Jan 18 11:00 | { phone: "055xxx" -> "056xxx" }
DELETE | notes | note_789 | riyas | Jan 18 11:30 | { text: "Call tomorrow" }
```

### 1.4 Tables to Track
- clients
- cases
- leads
- notes
- documents
- document_types
- channels
- sources
- sub_sources
- users

### 1.5 Rules
- **Append-only**: No updates or deletes to audit log. Ever.
- **Auto-captured**: System writes on every DB mutation. No manual triggers.
- **Immutable**: Even Admin cannot modify audit entries.
- **Export logged**: Every export creates its own audit entry.

### 1.6 What NOT to Log
- Read-only views (opening a record)
- Search queries
- Filter/sort changes
- Draft saves before submission
- WhatsApp message content (stored separately for privacy)
- Document file content (stored separately)

---

## 2. Two Views

### 2.1 Activity Timeline (User View)
- Shown on Client/Case detail page
- Filtered to that record only
- Human-readable format
- Grouped by day (Today, Yesterday, Jan 15)
- Shows: Time | Action summary
- Hides: technical details, system events

**Example on Client page:**
```
Today
- 2:30 PM - Riyas uploaded Passport
- 11:00 AM - Riyas updated phone number
- 9:15 AM - Riyas added note: "Client prefers..."

Yesterday
- 4:00 PM - Riyas created case #ABC123
- 10:30 AM - System assigned to Riyas
```

### 2.2 Audit Log (Admin View)
- Full system view: All records, all users, all actions
- **Filters**: Date range, Table, Action type, User
- Shows raw data with full JSON changes
- **Columns**: Timestamp | User | Action | Table | Record | Changes | [View]
- **Export**: CSV or JSON (requires reason, logged for compliance)

### 2.3 Access Control
| Role | Access |
|------|--------|
| MS (Mortgage Specialist) | Activity Timeline only (on assigned records) |
| Manager | Activity Timeline + Team audit log |
| Admin | Full Audit Log access |

### 2.4 Where Activity Shows
- Client Side Panel: Activity tab
- Case Side Panel: Activity tab
- Lead Side Panel: Activity tab

---

## 3. Notes

User-created entries via "+ Add Note" button in the Activity section.

### 3.1 Add Note Form
| Field | Type | Validation |
|-------|------|------------|
| Text | textarea | Required, max 2000 chars |
| Reminder Date | date picker | Optional |
| Reminder Time | time picker | Optional, requires date |

### 3.2 Note Behavior
- Saved immediately on submit
- Appears in Activity timeline
- Cannot be edited after 24 hours
- Can be deleted by author or Admin
- If reminder set -> becomes a Reminder

### 3.3 Add Note UI
- "+ Add Note" button in Activity tab header
- Inline form expands below button
- Submit creates note + audit entry
- Cancel collapses form

---

## 4. Reminders

A reminder is simply a note with date and time set.

### 4.1 Reminder Lifecycle
1. MS adds note with date/time (e.g., "Call Ahmed" -> Jan 20, 3:00 PM)
2. Reminder saved -> shows in Activity timeline as "Reminder set"
3. When due -> appears on Dashboard in "What's Next" section
4. MS clicks "Mark Complete" -> moves to Activity as completed

### 4.2 Dashboard Display
- Reminders appear in Dashboard "What's Next" section when:
  - Date is today or past (overdue)
  - Status is Pending (not completed)
- Overdue reminders shown in red

### 4.3 Reminder Data
| Field | Type | Description |
|-------|------|-------------|
| note_id | UUID | Reference to note |
| reminder_date | date | Due date |
| reminder_time | time | Due time |
| status | enum | pending, completed, dismissed |
| completed_at | datetime | Nullable, when completed |

---

## 5. Summary

| Component | Description |
|-----------|-------------|
| Notes | User-created, editable for 24h, can have reminders |
| Activity | Filtered audit log, human-readable, per-record |
| Audit Log | Full DB history, admin-only, immutable |
| Reminders | Notes with dates, shown in Dashboard when due |

**One table. Two views. Every DB change tracked.**

---

## Existing Code to Reference

No similar existing features identified for reference. (User did not specify any existing code patterns to follow.)

## Visual Assets

### Files Provided:
No visual assets provided.

---

## Requirements Summary

### Functional Requirements

**Audit Log System:**
- Automatic logging of all CREATE, UPDATE, DELETE operations on tracked tables
- Immutable, append-only storage
- JSON storage for before/after changes and metadata
- Export functionality with compliance logging

**Activity Timeline:**
- Filtered view of audit log per record (Client/Case/Lead)
- Human-readable action summaries
- Grouped by day with relative date labels
- Accessible from side panel Activity tab

**Notes:**
- Create notes with text (max 2000 chars)
- Optional reminder date/time
- 24-hour edit window
- Delete by author or Admin only

**Reminders:**
- Notes with date/time become reminders
- Dashboard "What's Next" section for due/overdue items
- Mark complete workflow
- Visual indication for overdue (red)

### Scope Boundaries

**In Scope:**
- Audit log database schema and automatic logging
- Activity timeline view on Client/Case/Lead side panels
- Admin audit log view with filters and export
- Notes CRUD with 24-hour edit restriction
- Reminders with Dashboard integration
- Role-based access control for audit views

**Out of Scope:**
- Logging of read-only operations
- Search/filter activity logging
- WhatsApp message content logging
- Document file content logging
- Draft save logging

### Technical Considerations
- JSON columns for flexible change tracking
- Enum types for action and status fields
- Role-based access control integration
- Dashboard integration for reminders
- Side panel Activity tab integration

---

## Status

**Requirements Research: COMPLETE**

All clarifying questions answered. Specification confirmed by user. Ready for spec writing phase.
