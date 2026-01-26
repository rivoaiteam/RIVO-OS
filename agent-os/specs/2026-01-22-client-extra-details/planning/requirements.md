# Spec Requirements: Client Extra Details

## Initial Description

Add an "Extra Details" tab to the ClientSidePanel that captures additional client information required for bank mortgage application form submissions. These fields describe the person (not per-bank variations) and are needed to complete information sheets for various banks. Fields should show/hide based on client's residency type and employment type.

## Requirements Discussion

### First Round Questions

**Q1:** What fields are needed for the Extra Details tab?
**Answer:** Based on analysis of bank information sheets from `/Users/sanjana/Desktop/rivo_os/docs/` folder, the fields are organized into 5 sections:

1. **Personal Information**: marital status, spouse name (if married), number of dependents, number of children, qualification/education level, mother's maiden name, mailing address (if different from residence)
2. **Work Details**: years in occupation, years in current company (salaried) OR years in business (self-employed), company employee count, office address, office PO box, office landline
3. **UAE Address**: residence address, residence PO box, residence landline, years in UAE
4. **Home Country**: home country address, home country contact number
5. **References**: UAE references (2 contacts with name + phone), Home country references (2 contacts with name + phone)

**Q2:** How should field visibility work based on residency type?
**Answer:**
- **UAE National**: Hide all Home Country fields (Section 4) and Home Country References. They don't need home country information since UAE is their home.
- **UAE Resident**: Show all fields - they need both UAE residence details and home country details.
- **Non-Resident**: Hide UAE Address section (Section 3) - they don't have UAE residence. Show Home Country fields.

**Q3:** How should field visibility work based on employment type?
**Answer:**
- **Salaried**: Show `years_in_occupation` and `years_in_current_company` fields
- **Self-Employed**: Show `years_in_business` field instead

**Q4:** Where should this tab be placed in the ClientSidePanel?
**Answer:** Add as a new tab called "Extra Details" in the existing tab bar, alongside "Details", "Documents", and "Activity" tabs.

**Q5:** Should these fields be required or optional?
**Answer:** All fields should be optional. They're supplementary information needed for bank forms but not blocking for client/case creation.

**Q6:** Should co-applicants also have these extra details?
**Answer:** Not in scope for this feature. Focus on primary client only first.

### Existing Code to Reference

**Similar Features Identified:**
- Feature: ClientSidePanel (existing) - Path: `/Users/sanjana/Desktop/rivo_os/frontend/src/components/ClientSidePanel.tsx`
  - Tab structure pattern (Details, Documents, Activity tabs)
  - Form section layout with collapsible cards
  - Field styling and validation patterns
  - Phone input with country code pattern
  - Address field patterns

- Feature: Client model - Path: `/Users/sanjana/Desktop/rivo_os/backend/clients/models.py`
  - Existing residency choices: `ResidencyType` (uae_national, uae_resident, non_resident)
  - Existing employment choices: `EmploymentType` (salaried, self_employed)
  - Model field patterns (CharField, IntegerField with null/blank)

- Feature: Bank information sheets - Path: `/Users/sanjana/Desktop/rivo_os/docs/`
  - Contains exact field requirements per client type
  - Files: Information Sheet - Salaried, Self Employed, UAE National, NR Salaried, NR Self Employed

### Follow-up Questions

**Follow-up 1:** What marital status options should be available?
**Answer:** Standard options: Single, Married, Divorced, Widowed

**Follow-up 2:** What qualification/education options should be available?
**Answer:** Standard options: High School, Diploma, Bachelor's Degree, Master's Degree, Doctorate, Professional Certification, Other

**Follow-up 3:** Should address fields be structured or free-text?
**Answer:** Use free-text textarea for addresses (building/street/area format), separate fields for PO Box and landline phone.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A - Follow existing ClientSidePanel styling patterns.

## Requirements Summary

### Functional Requirements

1. **New Tab in ClientSidePanel**
   - Add "Extra Details" tab between "Details" and "Documents" tabs
   - Only visible in edit mode (not create mode), same as other tabs

2. **Section 1: Personal Information**
   - Marital Status (dropdown: Single, Married, Divorced, Widowed)
   - Spouse Name (text, show only if marital_status = Married)
   - Number of Dependents (integer)
   - Number of Children (integer)
   - Qualification (dropdown: High School, Diploma, Bachelor's, Master's, Doctorate, Professional Certification, Other)
   - Mother's Maiden Name (text)
   - Mailing Address (textarea, optional - "if different from residence")

3. **Section 2: Work Details**
   - Years in Occupation (integer) - show for salaried only
   - Years in Current Company (integer) - show for salaried only
   - Years in Business (integer) - show for self_employed only
   - Company Employee Count (integer)
   - Office Address (textarea)
   - Office PO Box (text)
   - Office Landline (phone input with country code)

4. **Section 3: UAE Address** - HIDE for non_resident
   - Residence Address (textarea)
   - Residence PO Box (text)
   - Residence Landline (phone input with country code)
   - Years in UAE (integer)

5. **Section 4: Home Country** - HIDE for uae_national
   - Home Country Address (textarea)
   - Home Country Contact Number (phone input with country code)

6. **Section 5: References**
   - UAE Reference 1: Name (text) + Phone (phone input)
   - UAE Reference 2: Name (text) + Phone (phone input)
   - Home Country Reference 1: Name (text) + Phone (phone input) - HIDE for uae_national
   - Home Country Reference 2: Name (text) + Phone (phone input) - HIDE for uae_national

7. **Conditional Visibility Logic**
   - Based on `client.residency`:
     - `uae_national`: Hide Section 4 (Home Country) and Home Country References
     - `uae_resident`: Show all sections
     - `non_resident`: Hide Section 3 (UAE Address)
   - Based on `client.employment_type`:
     - `salaried`: Show years_in_occupation, years_in_current_company
     - `self_employed`: Show years_in_business

8. **Data Persistence**
   - Add new fields to Client model
   - Create API endpoint for updating extra details
   - Auto-save or explicit save button (follow existing pattern)

### Reusability Opportunities

- Reuse existing `FormField` component from ClientSidePanel
- Reuse phone input with country code pattern from ClientSidePanel (COUNTRY_CODES constant)
- Reuse section card styling (bg-white border border-gray-100 rounded-xl p-4)
- Reuse the sanitize helpers for input validation
- Follow existing ClientSerializer pattern for API

### Scope Boundaries

**In Scope:**
- Extra Details tab UI in ClientSidePanel
- New fields on Client model (backend)
- API endpoints for CRUD operations on extra details
- Conditional field visibility based on residency and employment type
- References section (UAE and Home Country)

**Out of Scope:**
- Co-applicant extra details (future enhancement)
- Prefilling data from other sources
- Bank-specific form generation/export
- Document upload within this tab
- Visa-type based conditional fields

### Technical Considerations

- **Backend**: Extend Client model with new nullable fields
- **Migration**: Add new fields with null=True, blank=True for backward compatibility
- **Frontend**: New tab component, conditional rendering based on client residency/employment
- **API**: Extend ClientSerializer or create dedicated endpoint for extra details
- **Validation**: All fields optional, no blocking validation
- **Existing patterns**:
  - ResidencyType and EmploymentType enums already exist in models.py
  - Tab switching pattern exists in ClientSidePanel
  - Form section card pattern exists in ClientSidePanel
