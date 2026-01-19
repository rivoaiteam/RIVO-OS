# Task Breakdown: Document Collection

## Overview
Total Tasks: 30

This feature implements a two-tier document management system:
- **Client-level Documents (Atom B)**: KYC and financial documents that persist across all Cases
- **Case-level Bank Forms**: Bank-specific forms required for each application

## Task List

### Database Layer

#### Task Group 1: Document Type Configuration Models
**Dependencies:** None

- [x] 1.0 Complete document type configuration layer
  - [x] 1.1 Create DocumentType model with validations
    - Fields: name (string), level (enum: client/case), required (boolean), description (text), applicant_type (enum: primary/co_applicant/both), display_order (integer)
    - Validations: name presence, level presence, uniqueness of name scoped to level
    - Enum for level: client, case
    - Enum for applicant_type: primary, co_applicant, both
  - [x] 1.2 Create migration for document_types table
    - Add indexes for: level, required
    - Add unique index on: [name, level]
  - [x] 1.3 Create seed data for standard document types
    - Client-level required: Passport, Emirates ID, Visa, Salary Certificate, Pay Slips, Bank Statements, Liability Letters/Statements
    - Case-level required: Application Form, Salary Transfer Letter (STL), Liability Letter

**Acceptance Criteria:**
- DocumentType model correctly distinguishes client vs case level documents
- Default document types are seeded on deployment
- Custom document types can be created via "+ Add" functionality

---

#### Task Group 2: Document Storage Models
**Dependencies:** Task Group 1

- [x] 2.0 Complete document storage layer
  - [x] 2.1 Create ClientDocument model with validations
    - Fields: client_id (FK), document_type_id (FK), file_url (string), file_name (string), file_size (integer), file_format (string), applicant_role (enum: primary/co_applicant), status (enum: pending/uploaded/verified), uploaded_via (enum: web/whatsapp), uploaded_at (datetime)
    - Validations: client_id presence, document_type_id presence, file_format inclusion, file_size max 10MB
    - Associations: belongs_to :client, belongs_to :document_type
  - [x] 2.2 Create CaseDocument model with validations
    - Fields: case_id (FK), document_type_id (FK), file_url (string), file_name (string), file_size (integer), file_format (string), applicant_role (enum: primary/co_applicant), status (enum: pending/uploaded/verified), uploaded_via (enum: web/whatsapp), uploaded_at (datetime)
    - Validations: case_id presence, document_type_id presence, file_format inclusion, file_size max 10MB
    - Associations: belongs_to :case, belongs_to :document_type
  - [x] 2.3 Create migrations for client_documents and case_documents tables
    - Add indexes for: client_id, case_id, document_type_id, status, applicant_role
    - Foreign keys to clients, cases, document_types tables
  - [x] 2.4 Set up model associations on Client and Case
    - Client has_many :client_documents
    - Case has_many :case_documents
    - Add dependent: :destroy for case_documents only (client_documents persist)
  - [x] 2.5 Implement file validation concern
    - Create shared concern for file format and size validation
    - Supported formats: jpg, jpeg, png, heic, pdf
    - Max size: 10 MB (10_485_760 bytes)

**Acceptance Criteria:**
- ClientDocument persists independently of Cases
- CaseDocument is scoped to specific Case
- File validations enforce format and size limits
- Joint application documents properly tagged with applicant_role

---

### API Layer

#### Task Group 3: Document Type API Endpoints
**Dependencies:** Task Group 1

- [x] 3.0 Complete document type API layer
  - [x] 3.1 Create DocumentTypesController
    - Actions: index (with level filter), create
    - Index returns document types filtered by level (client/case)
    - Create allows adding custom document types
  - [x] 3.2 Implement request/response serialization
    - DocumentTypeSerializer with: id, name, level, required, description, applicant_type, display_order
  - [x] 3.3 Add routes for document types
    - GET /api/document_types?level=client
    - GET /api/document_types?level=case
    - POST /api/document_types

**Acceptance Criteria:**
- Document types can be fetched filtered by level
- Custom document types can be created
- Proper authorization enforced

---

#### Task Group 4: Client Document API Endpoints
**Dependencies:** Task Group 2

- [x] 4.0 Complete client document API layer
  - [x] 4.1 Create ClientDocumentsController
    - Actions: index, show, create, destroy
    - Nested under clients resource
    - Handle file upload with ActiveStorage or direct URL
  - [x] 4.2 Implement upload handling
    - Accept multipart file upload
    - Validate file format and size before storage
    - Generate secure file URL
    - Track upload source (web/whatsapp)
  - [x] 4.3 Implement document checklist response
    - Return all required document types with upload status
    - Include uploaded document details where available
    - Handle joint application dual-checklist
  - [x] 4.4 Add routes for client documents
    - GET /api/clients/:client_id/documents
    - GET /api/clients/:client_id/documents/:id
    - POST /api/clients/:client_id/documents
    - DELETE /api/clients/:client_id/documents/:id

**Acceptance Criteria:**
- Client documents can be uploaded, viewed, and deleted
- File validation prevents invalid uploads
- Checklist shows required documents with status
- Joint applications show Primary/Co-Applicant separation

---

#### Task Group 5: Case Document API Endpoints
**Dependencies:** Task Group 2

- [x] 5.0 Complete case document API layer
  - [x] 5.1 Create CaseDocumentsController
    - Actions: index, show, create, destroy
    - Nested under cases resource
    - Handle file upload similar to client documents
  - [x] 5.2 Implement case document isolation
    - Ensure documents are strictly scoped to case_id
    - Verify case belongs to authorized client
  - [x] 5.3 Implement bank form checklist response
    - Return required bank forms with upload status
    - Include uploaded form details where available
  - [x] 5.4 Add routes for case documents
    - GET /api/cases/:case_id/documents
    - GET /api/cases/:case_id/documents/:id
    - POST /api/cases/:case_id/documents
    - DELETE /api/cases/:case_id/documents/:id

**Acceptance Criteria:**
- Case documents are isolated per case
- Bank form checklist shows required forms with status
- Documents cannot be accessed across cases
- Proper authorization enforced

---

### Frontend Components

#### Task Group 6: Document Checklist Components
**Dependencies:** Task Groups 3, 4, 5

- [x] 6.0 Complete document checklist UI components
  - [x] 6.1 Create DocumentChecklist component
    - Props: documents (array), documentTypes (array), onUpload (function), onAdd (function), applicationType (string)
    - Display required documents with status indicators
    - Show "+ Add Document/Form" button at bottom
  - [x] 6.2 Create DocumentChecklistItem component
    - Props: documentType (object), document (object), onUpload (function), onView (function)
    - Show document name, required badge, upload status
    - Click triggers upload or view based on state
  - [x] 6.3 Create JointApplicationChecklist component
    - Wraps DocumentChecklist with Primary/Co-Applicant sections
    - Props: primaryDocuments, coApplicantDocuments, documentTypes, onUpload
    - Clear visual separation between applicant sections
  - [x] 6.4 Implement status indicators
    - Pending: Empty circle or placeholder
    - Uploaded: Filled checkmark with filename
    - Verified: Green checkmark (future use)

**Acceptance Criteria:**
- Checklist displays all required documents with status
- Joint applications show separate sections for each applicant
- Add button allows custom document addition
- Status indicators clearly show upload state

---

#### Task Group 7: File Upload Components
**Dependencies:** Task Group 6

- [x] 7.0 Complete file upload UI components
  - [x] 7.1 Create FileUploader component
    - Props: onUpload (function), acceptedFormats (array), maxSize (number), documentTypeId (string)
    - Drag-and-drop zone with click-to-browse
    - Display accepted formats hint
  - [x] 7.2 Implement file validation UI
    - Client-side format validation before upload
    - File size check with user-friendly error message
    - Preview thumbnail for images before upload
  - [x] 7.3 Create UploadProgress component
    - Props: progress (number), fileName (string), onCancel (function)
    - Show progress bar during upload
    - Allow cancel of in-progress upload
  - [x] 7.4 Implement upload error handling
    - Display server validation errors
    - Retry option for failed uploads
    - Clear error state on new attempt
  - [x] 7.5 Style upload components
    - Drag-over visual feedback
    - Consistent with application design system
    - Responsive for mobile views

**Acceptance Criteria:**
- File upload validates format and size client-side
- Drag-and-drop and click-to-browse work correctly
- Progress indicator shows during upload
- Error messages are clear and actionable

---

#### Task Group 8: Document Preview Components
**Dependencies:** Task Group 7

- [x] 8.0 Complete document preview UI components
  - [x] 8.1 Create DocumentPreviewPanel component
    - Props: document (object), isOpen (boolean), onClose (function)
    - Side panel overlay for document viewing
    - Header with document name and close button
  - [x] 8.2 Create ImagePreview component
    - Props: fileUrl (string), fileName (string)
    - Display image in side panel viewer (no zoom controls)
    - Support JPG, JPEG, PNG, HEIC formats
  - [x] 8.3 Create PDFPreview component
    - Props: fileUrl (string), fileName (string)
    - Embed simple PDF viewer for document display
    - Simple view only (no advanced controls)
  - [x] 8.4 Implement preview type detection
    - Auto-detect file type from extension/mime
    - Route to appropriate preview component

**Acceptance Criteria:**
- Images display in side panel viewer (simple view, no zoom)
- PDFs render in simple embedded viewer
- Preview panel opens/closes smoothly
- File type auto-detected for correct viewer

---

#### Task Group 9: Client Side Panel Document Tab
**Dependencies:** Task Groups 6, 7, 8

- [x] 9.0 Complete Client side panel Document tab
  - [x] 9.1 Create ClientDocumentTab component
    - Integrate DocumentChecklist with client document API
    - Fetch document types and client documents on mount
    - Handle joint application detection from client data
  - [x] 9.2 Implement inline Add Document
    - Inline text input for custom document name (no modal)
    - Upload button triggers file selection
    - Creates document type and uploads file in one flow
  - [x] 9.3 Wire up document upload flow
    - Connect FileUploader to POST /api/clients/:id/documents
    - Refresh checklist after successful upload
    - Show success/error notifications
  - [x] 9.4 Wire up document preview flow
    - Click on uploaded document opens DocumentPreviewPanel
    - Fetch full document details for preview

**Acceptance Criteria:**
- Document tab appears in Client side panel
- Checklist loads and displays correctly
- Upload flow works end-to-end
- Preview opens when clicking uploaded documents

---

#### Task Group 10: Case Side Panel Document Tab
**Dependencies:** Task Groups 6, 7, 8

- [x] 10.0 Complete Case side panel Document tab
  - [x] 10.1 Create CaseDocumentTab component
    - Integrate DocumentChecklist with case document API
    - Fetch bank form types and case documents on mount
    - Filter document types to case-level only
  - [x] 10.2 Implement inline Add Form
    - Inline text input for custom bank form name (no modal)
    - Upload button triggers file selection
    - Creates document type and uploads file in one flow
  - [x] 10.3 Wire up bank form upload flow
    - Connect FileUploader to POST /api/cases/:id/documents
    - Refresh checklist after successful upload
    - Show success/error notifications
  - [x] 10.4 Wire up document preview flow
    - Click on uploaded form opens DocumentPreviewPanel
    - Fetch full document details for preview

**Acceptance Criteria:**
- Document tab appears in Case side panel
- Bank form checklist loads and displays correctly
- Upload flow works end-to-end
- Preview opens when clicking uploaded forms

---

### Integration Layer

#### Task Group 11: WhatsApp Document Capture Integration
**Dependencies:** Task Groups 4, 5

- [ ] 11.0 Complete WhatsApp document capture integration
  - [ ] 11.1 Extend document creation to support WhatsApp source
    - Accept webhook payload with file URL from WhatsApp
    - Map WhatsApp message to document type (manual MS selection)
    - Set uploaded_via: "whatsapp" on created documents
  - [ ] 11.2 Create MS workflow for WhatsApp document assignment
    - UI for MS to assign received WhatsApp document to document type
    - Support assignment to client or case document
    - Notification when new WhatsApp document received

**Acceptance Criteria:**
- Documents received via WhatsApp are properly stored
- Upload source is tracked as "whatsapp"
- MS can assign WhatsApp documents to correct type

---

## Execution Order

Recommended implementation sequence:

```
Phase 1: Database Foundation
  1. Task Group 1: Document Type Configuration Models
  2. Task Group 2: Document Storage Models

Phase 2: API Layer
  3. Task Group 3: Document Type API Endpoints
  4. Task Group 4: Client Document API Endpoints (parallel with 5)
  5. Task Group 5: Case Document API Endpoints (parallel with 4)

Phase 3: Frontend Components
  6. Task Group 6: Document Checklist Components
  7. Task Group 7: File Upload Components
  8. Task Group 8: Document Preview Components
  9. Task Group 9: Client Side Panel Document Tab (parallel with 10)
  10. Task Group 10: Case Side Panel Document Tab (parallel with 9)

Phase 4: Integration
  11. Task Group 11: WhatsApp Document Capture Integration
```

## Technical Notes

### File Storage
- Using Supabase Storage with bucket named "documents"
- Files organized by folder: `clients/{client_id}/` or `cases/{case_id}/`
- Files stored with unique UUID names to prevent collisions
- Public URLs generated for file access
- Backend storage service: `/backend/documents/storage.py`

### File Validation Constants
```
ACCEPTED_FORMATS = ['jpg', 'jpeg', 'png', 'heic', 'pdf']
MAX_FILE_SIZE = 10_485_760  # 10 MB in bytes
```

### Joint Application Handling
- When Application Type = Joint, duplicate document checklist for Primary and Co-Applicant
- Each document must be tagged with applicant_role
- UI must clearly distinguish between applicant sections

### Document Persistence Rules
- Client Documents: Persist across all Cases, only deleted when explicitly removed
- Case Documents: Scoped to Case, deleted when Case is deleted (dependent: :destroy)

### Custom Document Type Deletion
- When a custom (non-system) document is deleted, the document type is also deleted
- System document types (is_system=true) cannot be deleted via API
- This prevents orphaned custom document types in the system
- Backend endpoint: DELETE /api/document_types/{id} (validates is_system=false)

### UI Behavior
- Inline add document: No modal, text input + Upload button in checklist
- Document preview: Simple side panel with image/PDF display (no advanced controls)
- Delete confirmation: Browser confirm dialog before deletion
