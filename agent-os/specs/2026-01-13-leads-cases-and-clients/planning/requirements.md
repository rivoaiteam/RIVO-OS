# Rivo OS - Lead → Client → Case Specification

Version 1.4 • January 2025

## Overview

Rivo OS uses three entities to manage the mortgage journey. Each builds on the previous.

**Core Principle:** It's a funnel, not a pipeline. "Not now" doesn't mean "never." Track the WHY so we can win them back.

---

## Lead

**Purpose:** Verify this is a real person who wants a mortgage. Quick qualification before investing MS time.

### Fields

| Field | Type | Notes |
|-------|------|-------|
| Name | Text | Required |
| Phone | Text | Required |
| Email | Text | Optional |
| Channel/Source/Sub-source | Reference | Untrusted sources only |
| Intent | Text | What they're looking for |
| Created At | Timestamp | Auto |
| SLA Timer | Calculated | From channel config |

### Channel (Untrusted Sources Only)

Leads can only be created from untrusted sources that require verification:
- Performance Marketing — Meta ads, Google ads
- WhatsApp Campaigns
- Email Campaigns

Example: "Meta Refinance Q1 (Performance Marketing)"

### SLA Timer Display

Countdown format while active. Overdue format when breached:

**Countdown:** "9 min left", "2 hrs left", "1 day left"

**Overdue:** "Overdue 1 min", "Overdue 5 mins", "Overdue 10 mins", "Overdue 30 mins", "Overdue 1 hr", "Overdue 5 hrs", "Overdue 1 day", "Overdue 3 days"

### Status

| Status | Description | User Selectable |
|--------|-------------|-----------------|
| Active | Being worked on | Yes |
| Converted | Became a Client (system-set when converted) | No |
| Declined | Not interested | Yes |
| Not Proceeding | Interested but not now (track reason) | Yes |

**Note:** "Converted" status is set automatically when user clicks "Convert to Client" button. Users can only manually select: Active, Declined, Not Proceeding.

### Quick Actions

- **Edit** — modify lead details (50% side panel)
- **Change Status** — set to Active, Declined, or Not Proceeding
- **Convert to Client** — creates a Client with lead's basic info (name, phone, email, source)

**Note:** Delete action available for cleanup of test data.

---

## Client

**Purpose:** Collect identity, calculate eligibility. Know if they CAN get a mortgage before creating a Case.

### Side Panel

Single tab: **Profile**

### Status

| Status | Description | User Selectable |
|--------|-------------|-----------------|
| Active | Being qualified | Yes |
| Converted | Case created (system-set when case created) | No |
| Declined | Not eligible | Yes |
| Not Proceeding | Eligible but not now (track reason) | Yes |

**Note:** "Converted" status is set automatically when user clicks "Create Case" button. Users can only manually select: Active, Declined, Not Proceeding.

### Source (Trusted Sources Only)

Clients can only be created from trusted sources that don't require Lead verification:
- Partner Hub
- Freelance Network
- BH Mortgage Team
- AskRivo

Example: "Dubai Properties (Partner Hub)", "Moin Khan (Saqib)"

### Create Client Form Fields

All fields required unless marked optional.

#### Personal Information

| Field | Type | Options/Notes |
|-------|------|---------------|
| First Name | Text | Required |
| Last Name | Text | Optional |
| Email | Text | Optional |
| Phone Number | Text | Required |
| Date of Birth | Date | Required, cannot be in future |
| Nationality | Dropdown | Comprehensive list (Emirati, Indian, British, etc.) |
| Residency Status | Dropdown | UAE National / UAE Resident / Non-Resident |
| Employment Status | Dropdown | Salaried / Self-Employed |
| Source | Dropdown | Sub-sources from trusted channels only |

#### Application Type

| Type | Description |
|------|-------------|
| Individual | One applicant |
| Co-borrower | Two applicants (Co-borrower section appears) |

If Co-borrower selected, additional fields appear:

| Field | Type | Notes |
|-------|------|-------|
| Co-borrower First Name | Text | Required |
| Co-borrower Last Name | Text | Optional |
| Co-borrower Phone | Text | Required |
| Co-borrower Email | Text | Optional |
| Co-borrower Monthly Salary | Currency (AED) | Required |

#### Financial Information

| Field | Type | Notes |
|-------|------|-------|
| Monthly Salary | Currency (AED) | Required |

#### Liabilities (Optional, up to 10)

Dynamic list - user can add/remove liability entries.

| Liability Type | Fields | Notes |
|----------------|--------|-------|
| Credit Card Limit | Bank (dropdown), Limit Amount | Shows 5% calculation beside each entry |
| Auto Loan EMI | EMI Amount | |
| Personal Loan EMI | EMI Amount | |
| Existing Mortgage EMI | EMI Amount | |

**Bank Dropdown Options:** ADCB, ADIB, CBD, CBI, DIB, Emirates NBD, FAB, Mashreq, RAKBANK, Standard Chartered, HSBC, Citibank, Other

**Total Liabilities** displayed below entries = Sum of (5% × CC Limits) + Sum of EMIs

#### Property Interest

| Field | Type | Notes |
|-------|------|-------|
| Property Value | Currency (AED) | Required |
| Loan Amount | Currency (AED) | Required |

#### Real-time Calculations

Displayed in gray box at bottom of form:

| Calculation | Formula | Display |
|-------------|---------|---------|
| DBR Available | (Total Income ÷ 2) − Total Liabilities | Green if ≥ 0, Red if < 0 |
| LTV | (Loan Amount ÷ Property Value) × 100 | Green if within limit, Red if over |
| Max Loan | Total Income × 68 | Always shown |

#### Validations

- Date of Birth cannot be in the future
- All amount fields must be valid numbers
- Amount fields cannot be negative
- Required field checks on submission
- Co-borrower fields required when Co-borrower type selected

### Edit Client (Side Panel)

Single tab: **Profile** - same fields as create, with auto-save on blur.

### Intent (Edit Mode Only)

| Field | Type |
|-------|------|
| Notes | Text area |
| Timeline | Dropdown: Immediate / 1-3 months / 3-6 months / Exploring |

### Auto-Calculated Fields

#### DBR (Debt Burden Ratio)

DBR shows how much capacity remains for a new mortgage EMI.

**Formula:**
```
Total Existing Liabilities = Sum of Loan EMIs + (5% × each CC Limit)
DBR = (Salary ÷ 2) − Total Existing Liabilities
```

Result is the available AED amount for new mortgage EMI. Must be positive.

**Example:**
- Salary: AED 35,000
- Salary ÷ 2 = AED 17,500 (max allowed)
- Auto Loan EMI: AED 2,500
- Personal Loan EMI: AED 1,500
- CC 1 Limit: AED 50,000 → 5% = AED 2,500
- CC 2 Limit: AED 30,000 → 5% = AED 1,500
- Total Existing = 2,500 + 1,500 + 2,500 + 1,500 = AED 8,000
- **DBR = 17,500 − 8,000 = AED 9,500 available ✓**

#### Joint Application DBR

```
DBR = (Combined Salary ÷ 2) − Combined Liabilities
```

#### LTV (Loan to Value)

```
LTV = Loan Amount / Property Value × 100
```

Also show: 80% of Property Value (max loan for residents)

#### LTV Limits by Profile

| Profile | Ready Property | Off-Plan |
|---------|---------------|----------|
| UAE Resident - First Property | 80% | 50% |
| UAE Resident - Second Property | 65% | 50% |
| Non-Resident | 60% | 50% |

Joint applications: Use more restrictive limit (if one applicant is Non-Resident, cap at 60%).

#### Max Loan Amount

```
Max Loan = Monthly Salary × 68
```

### Create Case — Enabled When

- All identity fields complete
- Income and liabilities entered
- DBR > 0 (has capacity for new EMI)
- LTV within limits
- If Joint: Co-Applicant fields also complete

---

## Case

**Purpose:** Bank application — lock deal details, submit, track to disbursement.

### Deal Information

| Field | Type |
|-------|------|
| Client | Reference (linked) |
| Application Type | Single / Joint |
| Created At | Timestamp |

### Property

| Field | Type |
|-------|------|
| Property Type | Ready / Off-Plan |
| Transaction Type | Purchase / Refinance / Equity Release |
| Property Value | Currency (AED) |
| Developer | Text (if Off-Plan) |
| Project Name | Text |
| Location | Text |

### Loan

| Field | Type |
|-------|------|
| Loan Amount | Currency (AED) |
| LTV | Percentage (calculated) |
| Tenure | Years (5-25) |

### Bank Product

| Field | Type |
|-------|------|
| Bank | Custom dropdown with icons (43 UAE banks) |
| Product | Text input |
| Rate Type | Fixed / Variable |
| Rate | Percentage |

#### Bank Dropdown
- Custom dropdown component (not native select) to support bank icons
- Max height: 240px (max-h-60) - shows ~6 items at a time
- Each option shows bank icon (24x24) with gray background container + bank name
- Icons have onError handler to gracefully hide broken images
- 43 banks populated via migration with full metadata (icon, logo, limits, fees)

### Case Stages

PO moves case through stages. Status mirrors bank/aggregator updates.

#### Active Stages

| Stage | Description |
|-------|-------------|
| Processing | Initial review |
| Document Collection | Gathering required docs |
| Bank Submission | Submitted to bank |
| Bank Processing | Bank reviewing |
| Offer Issued | Bank approved, offer out |
| Offer Accepted | Client accepted offer |
| Property Valuation | Valuation in progress |
| Final Approval | Bank final approval |
| Property Transfer | Ownership transfer in progress |
| Property Transferred | Complete - disbursed |

#### Hold Stage

| Stage | Description |
|-------|-------------|
| On Hold | Temporarily paused (track reason) |

#### Terminal Stages

| Stage | Description |
|-------|-------------|
| Property Transferred | Success - complete |
| Declined | Bank rejected |
| Not Proceeding | Client chose not to proceed (track reason) |

---

## The Flow

```
LEAD  →  verify: real person? real intent?
      Status: Active → Converted / Declined / Not Proceeding
      ↓
CLIENT  →  collect identity, calculate eligibility
      Status: Active → Converted / Declined / Not Proceeding
      ↓
CASE  →  fill deal details, submit, track
      Stages: Processing → ... → Property Transferred / Declined / Not Proceeding
```

---

## Conversion Flow

### Lead → Client Conversion

When user clicks "Convert to Client" button:
1. Creates a new Client with basic info copied from Lead:
   - Name
   - Phone
   - Email
   - Source (sub_source)
2. Sets Lead status to "Converted" (system-set)
3. Links Lead to newly created Client via `converted_client` field
4. New Client starts with status "Active" for further qualification

### Client → Case Conversion

When user clicks "Create Case" button:
1. Creates a new Case linked to the Client:
   - Client reference
   - Property details (from client)
   - Loan amount (from client)
2. Sets Client status to "Converted" (system-set)
3. New Case starts at "Processing" stage

---

## Key Rules

1. **Leads are temporary. Clients are permanent. Cases are per-transaction.**
2. One Client can have many Cases (refinance, second property, retry bank).
3. Every drop-off has a reason.
4. "Not now" never means "never."

---

## Calculation Summary

| Calculation | Formula |
|-------------|---------|
| CC Liability | 5% × Credit Card Limit |
| Total Liabilities | Sum of Loan EMIs + CC Liabilities |
| DBR | (Salary ÷ 2) − Total Liabilities |
| LTV | (Loan Amount ÷ Property Value) × 100 |
| Max Loan | Salary × 68 |

---

## UI Requirements

### Structure
- Same table/list structure as Users and Channels pages
- 50% width side panels for editing (NOT inline editing)
- Delete action available (with confirmation) for cleanup

### Leads Page
- Table columns: Name, Phone, Source, SLA, Created, Actions
- **No Status column** - status filtering handled by tabs
- Status Tabs: All | Active | Declined | Not Proceeding (inline with search bar)
- "New Lead" button (prominent, filled background `bg-[#1e3a5f]`)

### Clients Page
- Table columns: Name, Source, SLA, DBR/LTV, Created, Actions
- **No Status column** - status filtering handled by tabs
- Status Tabs: All | Active | Declined | Not Proceeding (inline with search bar)
- "New Client" button (prominent, filled background `bg-[#1e3a5f]`)
- DBR column shows available amount with color coding:
  - Green (`text-green-600`): >= 5000 AED available
  - Amber (`text-amber-600`): 1000-5000 AED available
  - Red (`text-red-600`): < 1000 AED available

### Cases Page
- Table columns: Bank (icon + name), ID, Client, Stage, Loan Amount, Created, Actions
- Bank column shows icon in gray container + bank name
- Bank filter dropdown with icons (custom component, max-h-60)
- Stage filter dropdown with optgroups (Active, Hold, Terminal)
- "New Case" button (prominent, filled background `bg-[#1e3a5f]`)

### Side Panel Edit
- Status dropdown in header (not in form body)
- Status changes available: Active, Declined, Not Proceeding
- "Converted" status is read-only (system-set)

### Design Consistency
- Match existing Rivo design system
- Same font sizes (text-xs, text-sm)
- Same dropdown styles (h-6, h-8)
- Same table header styling
- Same pagination controls
- Tabs styled with border-b-2 indicator on active tab
- Search bar and status tabs on same row
- Custom dropdowns with icons use max-h-60 (240px) for controlled height
- Icons wrapped in gray background container (bg-gray-100) for visibility
- Side panels use card sections: `bg-white border border-gray-100 rounded-xl p-4`
- Sticky headers and footers in side panels

### Input Validation
- All amount fields validated to prevent negative values
- Date of Birth cannot be in future
- Phone numbers validated (7-12 digits)
- Email format validated

### Backend Notes
- Client update endpoint (`PATCH /clients/{id}/`) must properly save all fields including:
  - `date_of_birth`
  - `nationality`
- After `serializer.save()`, refresh client from DB before returning response

---

*Rivo OS • January 2025*
