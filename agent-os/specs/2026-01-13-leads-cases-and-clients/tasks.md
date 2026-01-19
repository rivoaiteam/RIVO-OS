# Task Breakdown: Leads, Cases, and Clients

## Overview
Total Tasks: 40

This feature implements the core mortgage journey management system with three entities:
- **Lead**: Verify real person with real intent (from untrusted channels)
- **Client**: Collect identity, calculate eligibility (from trusted channels)
- **Case**: Bank application tracking and workflow management

## Task List

### Database Layer

#### Task Group 1: Lead Model and Migration
**Dependencies:** None

- [x] 1.0 Complete Lead database layer
  - [x] 1.1 Create Lead model with fields and validations
  - [x] 1.2 Create migration for leads table
  - [x] 1.3 Set up associations
  - [x] 1.4 Add SLA timer computed property

**Acceptance Criteria:**
- Lead model validates channel trust correctly
- SLA timer calculates from channel config
- Status transitions work correctly

---

#### Task Group 2: Client Model and Migration
**Dependencies:** Task Group 1

- [x] 2.0 Complete Client database layer
  - [x] 2.1 Create Client model with all field sections
  - [x] 2.2 Create Co-Applicant model for Joint applications
  - [x] 2.3 Create migration for clients and co_applicants tables
  - [x] 2.4 Add computed properties for calculations (DBR, LTV, max_loan, can_create_case)

**Acceptance Criteria:**
- DBR calculation matches spec formula
- LTV limits enforce residency and property type rules
- Joint application combines both applicants' financials
- can_create_case validates all requirements

---

#### Task Group 3: Case Model and Migration
**Dependencies:** Task Group 2

- [x] 3.0 Complete Case database layer
  - [x] 3.1 Create Case model with all field sections
  - [x] 3.2 Create migration for cases table
  - [x] 3.3 Add computed property for LTV
  - [x] 3.4 Add stage transition validation

**Acceptance Criteria:**
- Stage transitions follow defined workflow
- Terminal stages are enforced
- LTV calculated correctly

---

### API Layer

#### Task Group 4: Lead API Endpoints
**Dependencies:** Task Group 1

- [x] 4.0 Complete Lead API layer
  - [x] 4.1 Create LeadSerializer classes
  - [x] 4.2 Create LeadViewSet with CRUD operations
  - [x] 4.3 Create LeadPagination class
  - [x] 4.4 Configure URL routing

**Acceptance Criteria:**
- List endpoint returns paginated results with SLA display
- Create validates untrusted channel requirement
- Status change endpoint handles transitions
- Convert to client creates proper Client record

---

#### Task Group 5: Client API Endpoints
**Dependencies:** Task Groups 2, 4

- [x] 5.0 Complete Client API layer
  - [x] 5.1 Create ClientSerializer classes
  - [x] 5.2 Create ClientViewSet with CRUD operations
  - [x] 5.3 Create ClientPagination class
  - [x] 5.4 Configure URL routing

**Acceptance Criteria:**
- Calculated fields (DBR, LTV, etc.) returned correctly
- Co-applicant management works for joint applications
- Create case validates eligibility requirements
- Source validation allows trusted channels or lead conversion

---

#### Task Group 6: Case API Endpoints
**Dependencies:** Task Groups 3, 5

- [x] 6.0 Complete Case API layer
  - [x] 6.1 Create CaseSerializer classes
  - [x] 6.2 Create CaseViewSet with CRUD operations
  - [x] 6.3 Create CasePagination class
  - [x] 6.4 Configure URL routing
  - [x] 6.5 Add banks endpoint for dropdown selection
  - [x] 6.6 Create Bank model with full metadata (icon, logo, limits, fees)
  - [x] 6.7 Create migration with 43 UAE banks data

**Acceptance Criteria:**
- Stage transitions enforce workflow rules
- Terminal cases cannot be modified
- Case creation validates client eligibility
- LTV calculated and returned correctly
- Banks list endpoint returns id, name, icon
- 43 banks populated with icons and metadata

---

### Frontend Hooks Layer

#### Task Group 7: React Query Hooks
**Dependencies:** Task Groups 4, 5, 6

- [x] 7.0 Complete frontend hooks layer
  - [x] 7.1 Create useLeads.ts hook file
  - [x] 7.2 Create useClients.ts hook file
  - [x] 7.3 Create useCases.ts hook file
  - [x] 7.4 Add TypeScript types file

**Acceptance Criteria:**
- All hooks follow existing React Query patterns
- Types are properly exported and reusable
- Query invalidation works correctly on mutations

---

### Frontend Pages Layer

#### Task Group 8: LeadsPage Component
**Dependencies:** Task Group 7

- [x] 8.0 Complete LeadsPage UI
  - [x] 8.1 Create LeadsPage.tsx main component
  - [x] 8.2 Create LeadsTable component
  - [x] 8.3 Create LeadRow component
  - [x] 8.4 Add status color mappings

**Acceptance Criteria:**
- Table displays all lead fields correctly
- SLA timer shows countdown/overdue format
- Filters work with URL state
- Status changes update immediately

---

#### Task Group 9: ClientsPage Component
**Dependencies:** Task Group 7

- [x] 9.0 Complete ClientsPage UI
  - [x] 9.1 Create ClientsPage.tsx main component
  - [x] 9.2 Create ClientsTable component
  - [x] 9.3 Create ClientRow component

**Acceptance Criteria:**
- Table displays all client summary fields
- DBR shows with appropriate color coding
- Application type clearly indicated

---

#### Task Group 10: CasesPage Component
**Dependencies:** Task Group 7

- [x] 10.0 Complete CasesPage UI
  - [x] 10.1 Create CasesPage.tsx main component
  - [x] 10.2 Create CasesTable component
  - [x] 10.3 Create CaseRow component
  - [x] 10.4 Add stage color mappings
  - [x] 10.5 Add bank icon display in table rows
  - [x] 10.6 Create custom BankFilterDropdown with icons (max-h-60)

**Acceptance Criteria:**
- Table displays all case summary fields
- Stage badges use correct colors by category
- Currency formatting consistent
- Bank column shows icon alongside name
- Bank filter dropdown shows icons with controlled height

---

### Side Panels Layer

#### Task Group 11: LeadSidePanel Component
**Dependencies:** Task Group 8

- [x] 11.0 Complete LeadSidePanel UI
  - [x] 11.1 Create LeadSidePanel.tsx component
  - [x] 11.2 Create LeadEditForm component
  - [x] 11.3 Add Convert to Client button
  - [x] 11.4 Implement auto-save on field blur

**Acceptance Criteria:**
- Panel is exactly 50% viewport width
- Form updates lead on save
- Convert to Client flow works correctly

---

#### Task Group 12: ClientSidePanel Component
**Dependencies:** Task Group 9

- [x] 12.0 Complete ClientSidePanel UI
  - [x] 12.1 Create ClientSidePanel.tsx component
  - [x] 12.2 Create ClientProfileForm component with sections
  - [x] 12.3 Create CoApplicantSection component
  - [x] 12.4 Create CalculationsSummary component (DBR, LTV, Max Loan)
  - [x] 12.5 Add Create Case button (Convert to Case)

**Acceptance Criteria:**
- All form sections render and save correctly
- Co-applicant section shows/hides based on application type
- Calculations update live as fields change
- Create Case button validates all requirements

---

#### Task Group 13: CaseSidePanel Component
**Dependencies:** Task Group 10

- [x] 13.0 Complete CaseSidePanel UI
  - [x] 13.1 Create CaseSidePanel.tsx component
  - [x] 13.2 Create CaseEditForm component with sections
  - [x] 13.3 Create StageSelector component
  - [x] 13.4 Add custom BankDropdown with icons (max-h-60)
  - [x] 13.5 Make design consistent with ClientSidePanel (card sections, sticky footer)
  - [x] 13.6 Add eligible clients dropdown (active + positive DBR)

**Acceptance Criteria:**
- All case sections render and save correctly
- Stage selector enforces workflow rules
- Terminal stage changes require confirmation
- LTV displays correctly as calculated field
- Design matches ClientSidePanel pattern
- Bank dropdown shows icons with controlled height
- Client dropdown filters to eligible clients only

---

### Integration Layer

#### Task Group 14: Navigation and Routing
**Dependencies:** Task Groups 8, 9, 10

- [x] 14.0 Complete navigation integration
  - [x] 14.1 Add routes to router configuration
  - [x] 14.2 Add navigation items to sidebar
  - [x] 14.3 Implement URL state for filters
  - [x] 14.4 Add breadcrumb navigation

**Acceptance Criteria:**
- All three pages accessible via sidebar navigation
- URL filters persist on page refresh
- Navigation between related entities works

---

## Execution Order

Recommended implementation sequence:

### Phase 1: Database Foundation
1. **Task Group 1**: Lead Model and Migration
2. **Task Group 2**: Client Model and Migration (depends on Lead for conversion FK)
3. **Task Group 3**: Case Model and Migration (depends on Client for FK)

### Phase 2: API Layer
4. **Task Group 4**: Lead API Endpoints
5. **Task Group 5**: Client API Endpoints (depends on Lead API for conversion)
6. **Task Group 6**: Case API Endpoints (depends on Client API for case creation)

### Phase 3: Frontend Foundation
7. **Task Group 7**: React Query Hooks (depends on all APIs)

### Phase 4: Frontend Pages
8. **Task Group 8**: LeadsPage Component
9. **Task Group 9**: ClientsPage Component
10. **Task Group 10**: CasesPage Component

### Phase 5: Side Panels
11. **Task Group 11**: LeadSidePanel Component
12. **Task Group 12**: ClientSidePanel Component
13. **Task Group 13**: CaseSidePanel Component

### Phase 6: Integration
14. **Task Group 14**: Navigation and Routing

---

## Technical Notes

### Calculation Formulas (from spec)

**DBR (Debt Burden Ratio):**
```
Total CC Liability = Sum of (5% x each CC Limit)
Total Loan EMIs = Auto EMI + Personal EMI + Mortgage EMI
DBR Available = (Monthly Salary / 2) - Total Liabilities
// For Joint: Use combined salary and combined liabilities
```

**LTV (Loan to Value):**
```
LTV = (Loan Amount / Property Value) * 100
```

**LTV Limits:**
| Profile | Ready Property | Off-Plan |
|---------|---------------|----------|
| UAE Resident - First Property | 80% | 50% |
| UAE Resident - Second Property | 65% | 50% |
| Non-Resident | 60% | 50% |
// Joint: Use more restrictive limit

**Max Loan:**
```
Max Loan = Monthly Salary x 68
// For Joint: Use combined salary
```

### Status/Stage Definitions

**Lead Status:** Active, Converted, Declined, Not Proceeding

**Client Status:** Active, Converted, Declined, Not Proceeding

**Case Stages:**
- Active: Processing, Document Collection, Bank Submission, Bank Processing, Offer Issued, Offer Accepted, Property Valuation, Final Approval, Property Transfer, Property Transferred
- Hold: On Hold
- Terminal: Property Transferred, Declined, Not Proceeding

### Design Consistency

- Follow existing Rivo design system
- Use text-xs for table content, text-sm for headers
- Use h-6 for compact dropdowns, h-8 for form inputs
- 50% width side panels (not full-screen modals)
- No delete actions on any entity
- Card sections with `bg-white border border-gray-100 rounded-xl p-4`
- Sticky headers and footers in side panels
- Custom dropdowns with icons use max-h-60 (240px) for controlled height
- Bank icons wrapped in gray background container for visibility
- Use onError handler to gracefully hide broken images

---

*Rivo OS - Leads, Cases, and Clients Feature*