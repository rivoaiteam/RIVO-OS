# Client Extra Details - Implementation Tasks

## Task Group 1: Backend - Model & Migration

- [ ] Add `MaritalStatus` enum to `/backend/clients/models.py`
- [ ] Add extra details fields to `Client` model in `/backend/clients/models.py`:
  - Personal: marital_status, spouse_name, spouse_contact, dependents, children_count, children_in_school, qualification, mailing_address, mother_maiden_name
  - Work: years_in_occupation, years_in_current_company, years_in_business, company_employee_count, office_address, office_po_box, office_landline
  - UAE Address: years_in_uae, uae_residence_address, uae_residence_po_box, uae_residence_landline
  - Home Country: home_country_address, home_country_contact
  - UAE References: uae_ref_1_name, uae_ref_1_relationship, uae_ref_1_address, uae_ref_1_mobile, uae_ref_2_name, uae_ref_2_relationship, uae_ref_2_address, uae_ref_2_mobile
  - Home References: home_ref_1_name, home_ref_1_relationship, home_ref_1_mobile, home_ref_2_name, home_ref_2_relationship, home_ref_2_mobile
- [ ] Create migration file `0007_add_client_extra_details.py`
- [ ] Run migration

## Task Group 2: Backend - Serializers

- [ ] Update `ClientSerializer` in `/backend/clients/serializers.py` to include all new fields
- [ ] Update `ClientDetailSerializer` to include all new fields
- [ ] Update `ClientUpdateSerializer` to accept all new fields as optional
- [ ] Test API returns new fields

## Task Group 3: Frontend - Types

- [ ] Add `MaritalStatus` type to `/frontend/src/types/mortgage.ts`
- [ ] Update `ClientData` interface with all new extra details fields
- [ ] Update `UpdateClientData` interface with all new fields as optional

## Task Group 4: Frontend - Extra Details Tab Component

- [ ] Create `/frontend/src/components/ClientExtraDetailsTab.tsx`:
  - Accept clientId, residency, employmentType props
  - Fetch client data using existing hook
  - Implement Personal Information section (always visible)
  - Implement Work Details section with conditional fields based on employmentType
  - Implement UAE Address section (hide for non_resident)
  - Implement Home Country section (hide for uae_national)
  - Implement References section with conditional home country refs
  - Handle save with debounce or explicit save button
  - Show loading and error states

## Task Group 5: Frontend - ClientSidePanel Updates

- [ ] Add 'extra_details' to TabType in `/frontend/src/components/ClientSidePanel.tsx`
- [ ] Add "Extra Details" tab button between Details and Documents
- [ ] Render `ClientExtraDetailsTab` when activeTab is 'extra_details'
- [ ] Reorganize Details tab sections:
  1. Personal Information (name, phone, email, DOB, nationality)
  2. Profile (residency, employment, source)
  3. Application Type (single/joint, co-borrower)
  4. Income & Liabilities
  5. Property Details
  6. Loan Details
  7. Eligibility (calculations)

## Task Group 6: Testing & Verification

- [ ] Test model fields save correctly via Django shell
- [ ] Test API returns all fields
- [ ] Test Extra Details tab renders all sections
- [ ] Test conditional visibility based on residency type
- [ ] Test conditional visibility based on employment type
- [ ] Test save functionality
- [ ] Test read-only mode for managers
