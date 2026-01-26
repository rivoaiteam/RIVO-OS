# Raw Idea: Client Extra Details

Add an "Extra Details" tab to the Client side panel with additional fields needed for bank application forms. These fields are organized into sections based on the information sheets for different client types (UAE National, UAE Resident, Non-Resident × Salaried, Self-Employed).

**New Fields to Add:**

**Personal Information (all clients):**
- marital_status (choices: single, married, divorced, widowed)
- spouse_name (text, if married)
- spouse_contact (text, if married)
- dependents (integer)
- children_count (integer)
- children_in_school (integer)
- qualification (text)
- mailing_address (text)
- mother_maiden_name (text)

**Work Details (all clients):**
- years_in_occupation (integer, salaried only)
- years_in_current_company (integer, salaried only)
- years_in_business (integer, self-employed only)
- company_employee_count (integer)
- office_address (text)
- office_po_box (text)
- office_landline (text)

**UAE Address (UAE Resident + UAE National only):**
- years_in_uae (integer)
- uae_residence_address (text)
- uae_residence_po_box (text)
- uae_residence_landline (text)

**Home Country (UAE Resident + Non-Resident only, NOT UAE National):**
- home_country_address (text)
- home_country_contact (text)

**References - UAE (all clients):**
- uae_ref_1_name, uae_ref_1_relationship, uae_ref_1_address, uae_ref_1_mobile
- uae_ref_2_name, uae_ref_2_relationship, uae_ref_2_address, uae_ref_2_mobile

**References - Home Country (UAE Resident + Non-Resident only):**
- home_ref_1_name, home_ref_1_relationship, home_ref_1_mobile
- home_ref_2_name, home_ref_2_relationship, home_ref_2_mobile

**UI Structure:**
- Add new "Extra Details" tab to ClientSidePanel (between Details and Documents)
- Show/hide sections based on residency and employment_type
- Collapsible sections for organization

**Backend:**
- Add fields to Client model
- Create migration
- Update serializers

Create the spec folder at: agent-os/specs/client-extra-details/
