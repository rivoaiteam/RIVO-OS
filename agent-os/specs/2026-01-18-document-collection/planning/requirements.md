# Spec Requirements: Document Collection

## Initial Description
Documents in Rivo OS are uploaded at two levels:
- **Client Level (Atom B)** — KYC and financial documents that persist across all Cases
- **Case Level (Bank Forms)** — Bank-specific forms required for each application

This separation ensures that when a Client creates multiple Cases (refinance, second property, retry with different bank), their core documents don't need to be re-collected unless expired.

## Requirements Discussion

### First Round Questions

**Q1:** What are the standard document requirements for Client-level documents?
**Answer:** Document requirements vary based on client's **Employment Type** and **Residency Status**:

**Categories (6 main + 1 conditional):**
1. **Salaried - UAE National** (6 docs): Passport, Emirates ID, Family Book, Salary Certificate, Payslips (6 months), Personal Bank Statements (6 months)
2. **Self-Employed - UAE National** (10 docs): Passport, Emirates ID, Family Book, Trade License, MOA with Amendments, Company Bank Statements (12 months), Personal Bank Statements (6 months), VAT Certificate, Audit Report, VAT Returns (4 quarters)
3. **Salaried - UAE Resident** (6 docs): Passport, Emirates ID, Visa, Salary Certificate, Payslips (6 months), Personal Bank Statements (6 months)
4. **Self-Employed - UAE Resident** (10 docs): Passport, Emirates ID, Visa, Trade License, MOA with Amendments, Company Bank Statements (12 months), Personal Bank Statements (6 months), VAT Certificate, Audit Report, VAT Returns (4 quarters)
5. **Salaried - Non-Resident** (7 docs): Passport, National ID Card, Salary Certificate, Payslips (6 months), Personal Bank Statements (6 months), Credit Report, Utility Bill
6. **Self-Employed - Non-Resident** (8 docs): Passport, National ID Card, Company Ownership Documents, Company Bank Statements (12 months), Personal Bank Statements (6 months), Credit Report, Utility Bill, Office Utility Bill

**Conditional Documents** (14 docs - shown for all categories):
- Credit Card Statements (If has credit cards)
- Loan Statements (If has existing loans)
- Educational Allowance Proof (If claiming allowance)
- Rental Income Proof (If claiming rental income)
- Ejari (If claiming rental income - UAE)
- Labor Card (If bank requests)
- Labor Contract (If bank requests)
- Tenancy Contract (Current residence proof)
- Title Deed (Resale/Buyout/Equity - case level)
- MOU (Purchase/Resale - case level)
- Valuation Report (Bank orders - case level)
- PDC Cheques (Bank requirement - case level)
- MC Cheque (Down payment proof - case level)
- Payment Receipt (Payments made - case level)

**Q2:** What additional documents can be added?
**Answer:** MS can add any additional documents via "+ Add Document" button as custom document types.

**Q3:** What are the requirements for Joint Applications?
**Answer:** When Application Type = Joint:
- All identity documents required from BOTH Primary and Co-Applicant
- All income documents required from both
- Documents stored with clear labels (Primary/Co-Applicant prefix)

**Q4:** What are the Case-level (Bank Forms) requirements?
**Answer:** Required Bank Forms:
- Application Form - Bank-specific, must sign
- Salary Transfer Letter (STL) - Must sign
- Liability Letter - For bank submission

Custom forms can be added via "+ Add Form". Common examples: Account Opening Form, Undertakings, Bank Checklist, DDA, Valuation Authorization, Insurance Declaration.

**Q5:** What file formats and sizes are supported?
**Answer:**
- Supported formats: JPG, JPEG, PNG, HEIC (images), PDF (documents)
- Maximum size: 10 MB per file
- Recommended resolution: 150 DPI minimum

**Q6:** What are the upload sources for V1?
**Answer:**
- Direct upload via Rivo web interface
- WhatsApp document capture (client sends → MS saves)

**Q7:** How should document viewing work?
**Answer:**
- Clicking on a document should open a preview in the side panel
- Image files (JPG, JPEG, PNG, HEIC) displayed in side panel viewer
- PDF files displayed in side panel viewer
- Simple view only - no zoom or advanced controls needed

**Q8:** How should adding custom documents work?
**Answer:**
- Inline add - no modal required
- User types document name in text input
- User clicks Upload button to select file
- Document type is created and file is uploaded in one flow

**Q9:** What happens when a custom document is deleted?
**Answer:**
- When a custom (non-system) document is deleted, the document type is also deleted
- System document types cannot be deleted, only the uploaded file is removed
- This keeps the document list clean and prevents orphaned custom types

**Q10:** What file storage system is used?
**Answer:**
- Supabase Storage with bucket named "documents"
- Files are organized by folder: `clients/{client_id}/` or `cases/{case_id}/`
- Files are stored with unique UUID names to prevent collisions
- Public URLs are generated for file access

### Existing Code to Reference

No similar existing features identified for reference.

### Follow-up Questions

**Q11:** What happens when a client changes their employment type or residency status after uploading documents?
**Answer:** The system implements **Option A - Keep all docs, update requirements**:
- Existing uploaded documents are preserved
- Common documents (Passport, Emirates ID, Bank Statements) are matched by **name** across categories
- Category-specific documents that no longer apply appear in `other_documents` section
- New category requirements show as "not uploaded" in the checklist
- No documents are lost or require re-upload

**Example flow:**
1. Client is Salaried UAE Resident → uploads Passport, Emirates ID, Salary Certificate, Payslips
2. Client changes to Self-Employed UAE Resident
3. Result:
   - Passport, Emirates ID, Bank Statements → **Reused** (matched by name)
   - Salary Certificate, Payslips → **other_documents** (not required for self-employed)
   - Trade License, MOA, VAT Certificate → **Not uploaded** (new requirements)

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A

## Requirements Summary

### Functional Requirements
- Two-tier document system: Client Documents (Atom B) and Case Documents (Bank Forms)
- Client Documents persist across all Cases for that Client
- Bank Forms are Case-specific (not shared between Cases)
- **Document categorization by employment type and residency** (6 main categories + conditional)
- **61 seeded document types** across all categories
- **Dynamic checklist** based on client's employment_type and residency fields
- **Cross-category document matching** by name when client profile changes
- **other_documents section** for docs from previous profile that no longer apply
- Standard document checklist with required/optional designations
- Conditional documents section shown for all categories
- Inline add custom documents (no modal) - type name and upload in one flow
- Support for Joint Applications with Primary/Co-Applicant document separation
- File upload with format validation (JPG, JPEG, PNG, HEIC, PDF)
- File size limit enforcement (10 MB max)
- Upload via Rivo web interface and WhatsApp document capture
- Document preview in side panel when clicking on uploaded documents (simple view)
- Custom document deletion removes both document and document type
- File storage via Supabase Storage with organized folder structure

### Reusability Opportunities
- Existing file upload components in the application
- Checklist UI patterns from other features
- Side panel tab navigation patterns

### Scope Boundaries

**In Scope:**
- Client-level document collection (Atom B)
- Case-level bank form collection
- Document TAB in Client side panel
- Document TAB in Case side panel
- Checklist view with upload status
- "+ Add Document" and "+ Add Form" functionality
- Joint application document handling
- File format and size validation
- Direct upload and WhatsApp capture workflows

**Out of Scope:**
- Per-bank dynamic form sets (V2)
- Mobile camera capture (V1.5+)
- Document OCR/extraction
- Automatic validation
- Expiry date tracking

### Technical Considerations
- Document persistence rules differ by level (Client vs Case)
- Joint applications require duplicate document sets with clear labeling
- WhatsApp integration for document capture
- File storage must support specified formats and size limits
- V2 consideration: Per-bank dynamic form sets when MS selects bank
