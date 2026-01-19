# Rivo OS — IAM Spec (v1.0)

Identity & Access Management

---

## 1. Authentication

Users log in with username + password.

---

## 2. Roles

Each user gets exactly one role.

| Role | Primary Job |
| --- | --- |
| **Admin** | System config. Manages users, channels, bank products, templates. |
| **Manager** | Operations oversight. Sees all clients/cases. Reassigns work. |
| **Channel Owner** | Manages Performance Marketing campaigns. Budget, quality, kill switch. |
| **Marketing Owner** | Verifies incubation leads. Marks Valid or Dead. |
| **Relationship Manager** | Manages Partner Hub & Freelance Network. Agencies, agents, commissions. |
| **Mortgage Specialist** | Works clients to cases. Collects data/docs, creates cases. |
| **Process Owner** | Works cases to disbursement. Verifies docs, submits to bank. |

---

## 3. User Management (Admin Only)

system password, editable

### Add User

- Admin enters: Username, Name, Role

### Edit User

- Can change: Name, Role

### Deactivate User

- User cannot log in
- Data preserved — can reactivate anytime
- Cannot deactivate the last Admin

---

## 4. Module Access by Role

### Settings Modules

| Module | Admin | Manager | MS | PO |
| --- | --- | --- | --- | --- |
| Users & Roles | CRUD | — | — | — |
| Channels | CRUD | — | — | — |
| Bank Products | CRUD | Read | Read | Read |
| Templates | CRUD | — | Use | Use |
| SLA Config | CRUD | — | — | — |

### Workspace Modules

| Module | Admin | Manager | MS | PO |
| --- | --- | --- | --- | --- |
| Dashboard | — | Team view | Own | Own |
| Clients | — | Read + Reassign | CRUD own | Read linked |
| Cases | — | Read + Reassign | Read own | CRUD own |
| Documents | — | — | CRUD own | Read + Request |
| Notes | — | — | CRUD own | CRUD linked |
| Audit Logs | Read | Read | — | — |

---

## 5. Key Rules

- **MS owns Clients:** Create, edit, close. Cannot see other MS's clients.
- **PO owns Cases:** Edit, move stages, close. Cannot edit linked Client.
- **Manager sees all:** Read-only + reassign. No edit.
- **Admin configures:** No operational access. Just setup.
- **Handoff locks:** After MS hands off to PO, MS gets read-only on that Case.
- **Documents follow entity:** MS uploads to Client, PO reads from linked Client.
- **Notes persist:** Notes on Client visible to PO when working linked Case.
- **Audit immutable:** No one can edit or delete audit logs.

---

## 6. Data Visibility

### What MS Can See

- Own clients only (assigned to them)
- Own cases (read-only after handoff)
- Documents uploaded to own clients
- Bank products and templates (read/use)

### What PO Can See

- Own cases only (assigned to them)
- Linked client for each case (read-only)
- Documents and notes from linked client
- Bank products and templates (read/use)

### What Manager Can See

- All clients across all MS
- All cases across all PO
- Team workload and SLA health
- Cannot see: Settings, User management
