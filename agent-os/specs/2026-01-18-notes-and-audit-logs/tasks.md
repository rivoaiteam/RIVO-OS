# Task Breakdown: Notes, Activity & Audit Log

## Overview
Total Tasks: 6 Task Groups

This feature implements a comprehensive audit logging system that tracks all database changes, provides human-readable activity timelines per record, and allows users to create notes with optional reminders.

## Task List

### Database Layer

#### Task Group 1: Audit Log Model
**Dependencies:** None

- [x] 1.0 Complete audit log database layer
  - [x] 1.1 Create AuditLog model
    - Fields: id (UUID), table_name (string), record_id (UUID), action (enum: CREATE/UPDATE/DELETE), user_id (UUID), timestamp (datetime), changes (JSON)
    - Append-only: override save() to block updates, override delete() to block deletes
  - [x] 1.2 Create migration for audit_logs table
    - Indexes on: table_name, record_id, user_id, timestamp
    - Composite index on (table_name, record_id) for activity queries
  - [x] 1.3 Create AuditableModel base class
    - Override save() to create AuditLog entry (CREATE or UPDATE)
    - Override delete() to create AuditLog entry (DELETE)
    - Track changed fields by comparing with DB state
    - New models just inherit: `class Client(AuditableModel)`
  - [x] 1.4 Add AuditableModel to existing tracked models
    - Updated: Client, CoApplicant, Case, Lead, BaseDocument (and subclasses ClientDocument, CaseDocument)
    - **NOT updated (system models)**: Channel, Source, SubSource, User, DocumentType, Bank
    - Note: System models were intentionally excluded as they are rarely modified and auditing them adds noise

**Acceptance Criteria:**
- AuditLog model is append-only
- Any model inheriting AuditableModel auto-logs on save/delete

---

#### Task Group 2: Notes and Reminders Models
**Dependencies:** Task Group 1

- [x] 2.0 Complete notes and reminders database layer
  - [x] 2.1 Create Note model with fields and validations
    - Fields: id (UUID), text (text, max 2000 chars), notable_type (string), notable_id (UUID), author_id (UUID), created_at, updated_at
    - Validations: text required, max 2000 characters
    - Associations: belongs_to author (User), polymorphic belongs_to notable (Client, Case, Lead)
  - [x] 2.2 Create Reminder model with fields and validations
    - Fields: id (UUID), note_id (UUID), reminder_date (date), reminder_time (time), status (enum), completed_at (datetime nullable)
    - Status enum: pending, completed, dismissed
    - Default status: pending
    - Associations: belongs_to Note
  - [x] 2.3 Create migrations for notes and reminders tables
    - Notes table: indexes on notable_type+notable_id, author_id, created_at
    - Reminders table: indexes on note_id, status, reminder_date
    - Foreign keys: note.author_id -> users, reminder.note_id -> notes
  - [x] 2.4 Implement 24-hour edit window logic
    - Add method to check if note is editable: created_at > 24 hours ago returns False
    - Override save() to enforce edit window on existing records
    - Allow deletion by author or admin regardless of edit window
  - [x] 2.5 Implement Note-Reminder relationship
    - When note is created/updated with reminder_date, auto-create/update Reminder
    - When reminder_date is removed, delete associated Reminder
    - Use Django signals or model save() override

**Acceptance Criteria:**
- Note model enforces 2000 character limit
- 24-hour edit window correctly enforced
- Reminders auto-created when note has date/time
- Reminder status transitions work correctly

---

### API Layer

#### Task Group 3: Audit Log and Activity Timeline API Endpoints
**Dependencies:** Task Groups 1, 2

- [x] 3.0 Complete audit log and activity timeline API layer
  - [x] 3.1 Create ActivityTimelineViewSet for user-facing activity view
    - GET /api/clients/{id}/activity/ - Client activity timeline
    - GET /api/cases/{id}/activity/ - Case activity timeline
    - GET /api/leads/{id}/activity/ - Lead activity timeline
    - Filter audit_logs by table_name and record_id
    - Include related record activities (e.g., client's documents, notes)
    - Return human-readable action summaries
  - [x] 3.2 Implement activity timeline response formatting
    - Group entries by day (Today, Yesterday, date format for older)
    - Transform raw audit data to human-readable format
    - Example: "Riyas uploaded Passport" instead of raw JSON
    - Include timestamp, user name, action summary
  - [x] 3.3 Create AuditLogViewSet for admin audit log view
    - GET /api/admin/audit-logs/ - Full audit log with pagination
    - Query parameters: date_from, date_to, table_name, action, user_id
    - Return raw audit data with full JSON changes
    - Columns: timestamp, user, action, table, record_id, changes
  - [x] 3.4 Implement audit log export endpoint
    - POST /api/admin/audit-logs/export/
    - Request body: format (csv/json), filters, reason (required for compliance)
    - Create audit entry for the export action itself
    - Return file download response
  - [x] 3.5 Implement role-based access control
    - MS: Activity timeline only on assigned records
    - Manager: Activity timeline + team members' audit entries
    - Admin: Full audit log access
    - Use Django permissions and custom permission classes

**Acceptance Criteria:**
- Activity timeline returns properly grouped, human-readable entries
- Admin audit log supports all required filters
- Export creates compliance audit entry
- Role-based access correctly enforced

---

#### Task Group 4: Notes and Reminders API Endpoints
**Dependencies:** Task Groups 1, 2, 3

- [x] 4.0 Complete notes and reminders API layer
  - [x] 4.1 Create NoteViewSet with CRUD operations
    - POST /api/clients/{id}/notes/ - Create note for client
    - POST /api/cases/{id}/notes/ - Create note for case
    - POST /api/leads/{id}/notes/ - Create note for lead
    - PUT /api/notes/{id}/ - Update note (if within 24 hours)
    - DELETE /api/notes/{id}/ - Delete note (author or admin only)
    - Automatically create audit log entries via signals
  - [x] 4.2 Implement note serializers with validation
    - NoteCreateSerializer: text (required, max 2000), reminder_date (optional), reminder_time (required when date is set)
    - NoteUpdateSerializer: same fields, add edit window validation
    - NoteReadSerializer: include author info, reminder status, is_editable flag
    - Note: Reminder time is REQUIRED when reminder date is set (validated on both frontend and backend)
  - [x] 4.3 Create ReminderViewSet for reminder actions
    - POST /api/reminders/{id}/complete/ - Mark reminder as completed
    - POST /api/reminders/{id}/dismiss/ - Dismiss reminder
    - Set completed_at timestamp when completing
  - [x] 4.4 Create dashboard reminders endpoint
    - GET /api/dashboard/reminders/ - Get pending reminders for current user
    - Filter: reminder_date <= today AND status = pending
    - Order by: reminder_date ASC, reminder_time ASC
    - Include note text and associated record info
    - Flag overdue reminders (date < today)

**Acceptance Criteria:**
- Notes CRUD operations work with proper validation
- 24-hour edit window enforced via API
- Reminders can be completed/dismissed
- Dashboard endpoint returns due reminders

---

### Frontend Components

#### Task Group 5: Activity Timeline UI Components
**Dependencies:** Task Groups 3, 4

- [x] 5.0 Complete activity timeline UI components
  - [x] 5.1 Create ActivityTimeline component
    - Props: recordType (client/case/lead), recordId
    - Fetch data using React Query from activity endpoint
    - Display loading and empty states
    - Render grouped timeline with day headers
  - [x] 5.2 Create ActivityTimelineGroup component
    - Props: date, entries
    - Display day header with relative/absolute date
    - Render list of ActivityTimelineItem components
  - [x] 5.3 Create ActivityTimelineItem component
    - Props: entry (timestamp, user, action, type)
    - Display formatted time (2:30 PM)
    - Display user name and action summary
    - Style differently for notes vs system activities
  - [x] 5.4 Create AddNoteButton and inline form
    - "+ Add Note" button in Activity tab header
    - Click expands NoteForm inline below button
    - Cancel collapses form
    - On submit, optimistically add to timeline
  - [x] 5.5 Integrate ActivityTimeline into side panels
    - Add Activity tab to ClientSidePanel (shows client activity only)
    - Add Activity tab to CaseSidePanel (shows unified view: client + case activity combined)
    - Add Activity tab to LeadSidePanel
    - Pass correct recordType and recordId props
    - **Unified view**: Case activity includes all client activity to provide complete history context

**Acceptance Criteria:**
- Activity timeline displays grouped entries by day
- Add Note inline form works correctly
- Activity tab integrated into all side panels

---

#### Task Group 6: Notes, Reminders, and Admin Audit UI Components
**Dependencies:** Task Groups 3, 4, 5

- [x] 6.0 Complete notes, reminders, and admin audit UI components
  - [x] 6.1 Create NoteForm component
    - Text area with character counter (max 2000)
    - Optional reminder date picker
    - Optional reminder time picker (enabled when date selected)
    - Submit and Cancel buttons
    - Form validation with error messages
  - [x] 6.2 Create NoteItem component for timeline display
    - Display note text with author and timestamp
    - Show reminder badge if reminder is set
    - Show edit/delete actions if within 24 hours or user is admin
    - Inline edit mode when edit clicked
  - [x] 6.3 Create ReminderCard component for dashboard
    - Display note text preview
    - Show reminder date/time
    - Show associated record link (Client/Case/Lead name)
    - "Mark Complete" button
    - Visual indication for overdue (red styling)
  - [x] 6.4 Create WhatsNextSection component for dashboard
    - Fetch pending reminders using React Query
    - Display list of ReminderCard components
    - Show empty state when no reminders due
    - Section header: "What's Next"
  - [x] 6.5 Create AdminAuditLog page component
    - Data table with columns: Timestamp, User, Action, Table, Record, Changes, View
    - Filter controls: Date range picker, Table dropdown, Action dropdown, User search
    - Pagination controls
    - Export button with modal for reason input
  - [x] 6.6 Create AuditLogExportModal component
    - Format selection: CSV or JSON
    - Reason text area (required for compliance)
    - Export and Cancel buttons
    - Loading state during export

**Acceptance Criteria:**
- NoteForm validates and submits correctly
- Reminders display in dashboard with overdue styling
- Admin audit log table with working filters
- Export modal captures reason for compliance

---

## Execution Order

Recommended implementation sequence:

1. **Task Group 1: Audit Log Model and Auto-Capture System** - Foundation for all tracking
2. **Task Group 2: Notes and Reminders Models** - Data layer for user-created content
3. **Task Group 3: Audit Log and Activity Timeline API** - API for reading audit data
4. **Task Group 4: Notes and Reminders API** - API for creating/managing notes
5. **Task Group 5: Activity Timeline UI Components** - User-facing activity view
6. **Task Group 6: Notes, Reminders, and Admin Audit UI** - Remaining UI components

---

## Technical Notes

### AuditableModel Base Class
Simple approach - override save() and delete() in a base model:
```python
class AuditableModel(models.Model):
    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        AuditLog.objects.create(
            table_name=self._meta.db_table,
            record_id=self.id,
            action='CREATE' if is_new else 'UPDATE',
            changes={...}
        )
```
New models just inherit: `class Client(AuditableModel)` - done.

### Polymorphic Notes Association
Notes can be associated with Client, Case, or Lead. Use either:
- Django ContentTypes framework for true polymorphism
- Separate foreign key fields (client_id, case_id, lead_id) with constraint that only one is set

### Activity Timeline Human-Readable Format
Create a mapping of action types to human-readable templates:
- CREATE + documents: "{user} uploaded {document_name}"
- UPDATE + clients: "{user} updated {changed_fields}"
- CREATE + notes: "{user} added note: {note_preview}"

### Role-Based Access
Leverage existing Django permission system:
- MS role: Filter by assigned records (check ownership/assignment)
- Manager role: Filter by team_id to show team's activities
- Admin role: No filtering, full access

---

## Implementation Notes

### Changes from Original Spec

1. **AuditableModel Limited to Business Models**: Only Client, CoApplicant, Case, Lead, and Document models inherit AuditableModel. System models (Channel, Source, SubSource, User, DocumentType, Bank) were excluded as they're rarely modified and add noise to audit logs.

2. **Reminder Time Required**: When a reminder date is set, the time is now required (not optional). This ensures reminders have specific due times for dashboard display.

3. **Unified Case Activity View**: Case activity shows a combined view of both case AND client activity. This provides complete context of what happened to a client throughout their journey. Client activity shows only client-specific activity.

4. **Note with Reminder Display**: Notes with reminders show as a single combined entry in the activity timeline: `"{user} added a note: "{note_preview}" (Reminder: {date})"` instead of separate note and reminder entries.

5. **Theme Consistency**: All activity components use the theme color (#1e3a5f) for visual consistency with the rest of the application.

6. **Add Note Button Style**: The "Add Note" button uses the same solid button style as other primary actions (e.g., "Create Client") - full width, solid background, centered with Plus icon.
