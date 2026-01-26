# Client Extra Details Feature Specification

## Overview

Add an "Extra Details" tab to the Client side panel containing additional fields needed for bank application forms. These fields are supplementary information that varies based on residency type and employment type.

## Data Model

### New Fields on Client Model

All fields are **optional** (blank=True, null=True where appropriate).

#### Personal Information (All Clients)
| Field | Type | Notes |
|-------|------|-------|
| `marital_status` | CharField(20) | Choices: single, married, divorced, widowed |
| `spouse_name` | CharField(255) | Required if married |
| `spouse_contact` | CharField(50) | Phone/contact for spouse |
| `dependents` | PositiveIntegerField | Number of dependents |
| `children_count` | PositiveIntegerField | Number of children |
| `children_in_school` | PositiveIntegerField | Number of children in school |
| `qualification` | CharField(100) | Education level |
| `mailing_address` | TextField | Correspondence address |
| `mother_maiden_name` | CharField(100) | Security question for banks |

#### Work Details (All Clients)
| Field | Type | Notes |
|-------|------|-------|
| `years_in_occupation` | PositiveIntegerField | Salaried: years in current profession |
| `years_in_current_company` | PositiveIntegerField | Salaried only |
| `years_in_business` | PositiveIntegerField | Self-employed only |
| `company_employee_count` | PositiveIntegerField | Organization size |
| `office_address` | TextField | Office address |
| `office_po_box` | CharField(20) | Office PO Box |
| `office_landline` | CharField(20) | Office phone |

#### UAE Address (UAE Resident + UAE National only)
| Field | Type | Notes |
|-------|------|-------|
| `years_in_uae` | PositiveIntegerField | Years residing in UAE |
| `uae_residence_address` | TextField | UAE home address |
| `uae_residence_po_box` | CharField(20) | UAE PO Box |
| `uae_residence_landline` | CharField(20) | UAE home phone |

#### Home Country (UAE Resident + Non-Resident only, NOT UAE National)
| Field | Type | Notes |
|-------|------|-------|
| `home_country_address` | TextField | Address in home country |
| `home_country_contact` | CharField(50) | Home country phone |

#### References - UAE (All Clients)
| Field | Type | Notes |
|-------|------|-------|
| `uae_ref_1_name` | CharField(255) | Reference 1 name |
| `uae_ref_1_relationship` | CharField(100) | Relationship to client |
| `uae_ref_1_address` | TextField | Reference 1 address |
| `uae_ref_1_mobile` | CharField(20) | Reference 1 phone |
| `uae_ref_2_name` | CharField(255) | Reference 2 name |
| `uae_ref_2_relationship` | CharField(100) | Relationship to client |
| `uae_ref_2_address` | TextField | Reference 2 address |
| `uae_ref_2_mobile` | CharField(20) | Reference 2 phone |

#### References - Home Country (UAE Resident + Non-Resident only)
| Field | Type | Notes |
|-------|------|-------|
| `home_ref_1_name` | CharField(255) | Home reference 1 name |
| `home_ref_1_relationship` | CharField(100) | Relationship |
| `home_ref_1_mobile` | CharField(20) | Phone |
| `home_ref_2_name` | CharField(255) | Home reference 2 name |
| `home_ref_2_relationship` | CharField(100) | Relationship |
| `home_ref_2_mobile` | CharField(20) | Phone |

### MaritalStatus Enum
```python
class MaritalStatus(models.TextChoices):
    SINGLE = 'single', 'Single'
    MARRIED = 'married', 'Married'
    DIVORCED = 'divorced', 'Divorced'
    WIDOWED = 'widowed', 'Widowed'
```

## UI Design

### Tab Structure
```
[ Details ] [ Extra Details ] [ Documents ] [ Activity ]
```

### Details Tab Reorganization

Current sections reordered for better logical grouping:

1. **Personal Information** - Name, Phone, Email, DOB, Nationality
2. **Profile** - Residency, Employment Type, Source
3. **Application Type** - Single/Joint, Co-borrower details
4. **Income & Liabilities** - Salary, Addbacks, Credit Cards, Loans
5. **Property Details** - Category, Type, Emirate, Transaction, Value, First Property
6. **Loan Details** - Amount, Tenure
7. **Eligibility** - DBR Available, Max Loan, LTV (read-only calculations)

### Extra Details Tab Sections

All sections are collapsible. Sections show/hide based on residency and employment type.

#### 1. Personal Information (Always visible)
```
┌─────────────────────────────────────────────────────────┐
│ PERSONAL INFORMATION                                     │
├─────────────────────────────────────────────────────────┤
│ Marital Status: [Dropdown]   Spouse Name: [________]    │
│ Spouse Contact: [________]                               │
│ Dependents: [__]  Children: [__]  In School: [__]       │
│ Qualification: [________]                                │
│ Mother's Maiden Name: [________]                         │
│ Mailing Address: [________________________]              │
└─────────────────────────────────────────────────────────┘
```
- Spouse fields only editable when marital_status = 'married'

#### 2. Work Details (Always visible)
```
┌─────────────────────────────────────────────────────────┐
│ WORK DETAILS                                             │
├─────────────────────────────────────────────────────────┤
│ [If Salaried]                                            │
│ Years in Occupation: [__]  Years in Company: [__]       │
│                                                          │
│ [If Self-Employed]                                       │
│ Years in Business: [__]                                  │
│                                                          │
│ Company Employee Count: [________]                       │
│ Office Address: [________________________]               │
│ Office PO Box: [________]  Office Landline: [________]  │
└─────────────────────────────────────────────────────────┘
```

#### 3. UAE Address (Hide for Non-Resident)
```
┌─────────────────────────────────────────────────────────┐
│ UAE ADDRESS                                              │
├─────────────────────────────────────────────────────────┤
│ Years in UAE: [__]                                       │
│ Residence Address: [________________________]            │
│ PO Box: [________]  Landline: [________]                │
└─────────────────────────────────────────────────────────┘
```
- Visible for: `uae_national`, `uae_resident`
- Hidden for: `non_resident`

#### 4. Home Country (Hide for UAE National)
```
┌─────────────────────────────────────────────────────────┐
│ HOME COUNTRY                                             │
├─────────────────────────────────────────────────────────┤
│ Address: [________________________]                      │
│ Contact Number: [________]                               │
└─────────────────────────────────────────────────────────┘
```
- Visible for: `uae_resident`, `non_resident`
- Hidden for: `uae_national`

#### 5. References (Always visible, sub-sections conditional)
```
┌─────────────────────────────────────────────────────────┐
│ REFERENCES                                               │
├─────────────────────────────────────────────────────────┤
│ UAE Reference 1                                          │
│ Name: [________]  Relationship: [________]              │
│ Address: [________________________]                      │
│ Mobile: [________]                                       │
│                                                          │
│ UAE Reference 2                                          │
│ Name: [________]  Relationship: [________]              │
│ Address: [________________________]                      │
│ Mobile: [________]                                       │
│                                                          │
│ [If not UAE National - show Home Country References]     │
│ Home Country Reference 1                                 │
│ Name: [________]  Relationship: [________]              │
│ Mobile: [________]                                       │
│                                                          │
│ Home Country Reference 2                                 │
│ Name: [________]  Relationship: [________]              │
│ Mobile: [________]                                       │
└─────────────────────────────────────────────────────────┘
```

## Conditional Visibility Matrix

| Section | UAE National | UAE Resident | Non-Resident |
|---------|:------------:|:------------:|:------------:|
| Personal Information | ✓ | ✓ | ✓ |
| Work Details | ✓ | ✓ | ✓ |
| UAE Address | ✓ | ✓ | ✗ |
| Home Country | ✗ | ✓ | ✓ |
| UAE References | ✓ | ✓ | ✓ |
| Home Country References | ✗ | ✓ | ✓ |

| Work Sub-fields | Salaried | Self-Employed |
|-----------------|:--------:|:-------------:|
| Years in Occupation | ✓ | ✗ |
| Years in Current Company | ✓ | ✗ |
| Years in Business | ✗ | ✓ |

## API Changes

### Client Serializers

Update `ClientSerializer` and `ClientDetailSerializer` to include all new fields.

Update `ClientCreateSerializer` and `ClientUpdateSerializer` to accept all new fields as optional.

### Endpoints

No new endpoints needed. Existing endpoints handle extra fields:
- `GET /api/clients/{id}/` - Returns all fields including extra details
- `PATCH /api/clients/{id}/` - Updates any fields including extra details

## Implementation Notes

1. **All fields optional** - Extra details are supplementary, not required for client creation or case creation
2. **Progressive save** - Save on blur or explicit save button in Extra Details tab
3. **No validation dependencies** - Extra details don't affect eligibility calculations
4. **Read-only for managers** - Consistent with existing behavior

## Out of Scope

- Co-applicant extra details (may be added later)
- Document auto-population from extra details
- Form validation rules (e.g., spouse required if married)
