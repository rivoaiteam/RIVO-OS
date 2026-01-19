# Spec Requirements: Document Collection

## Initial Description
Documents in Rivo OS are uploaded at two levels:
- **Client Level (Atom B)** — KYC and financial documents that persist across all Cases
- **Case Level (Bank Forms)** — Bank-specific forms required for each application

This separation ensures that when a Client creates multiple Cases (refinance, second property, retry with different bank), their core documents don't need to be re-collected unless expired.

## Requirements Discussion

### First Round Questions

**Q1:** What are the standard document requirements for Client-level documents?
**Answer:** The following documents are required:
- Passport (Required) - Identity verification
- Emirates ID (Required) - UAE identity
- Visa (Required, except for Non-Residents) - Residency verification
- Salary Certificate (Required) - Income verification
- Pay Slips (Required) - Income verification
- Bank Statements (Required) - Financial verification
- Liability Letters/Statements (Required) - Existing debt verification

**Q2:** What additional documents can be added?
**Answer:** MS can add any additional documents via "+ Add Document" button. Common examples include: Educational Allowance Proof, Rental Income Proof, Ejari, PDC Cheques, Valuation Report, Title Deed, MOU, MC Cheque, Payment Receipt, AECB/Credit Report, Labor Card, Labor Contract, Tenancy Contract, Trade License, Audited Financials, Loan Statements.

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

None required - comprehensive specification provided.

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
- Standard document checklist with required/optional designations
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
