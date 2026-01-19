/**
 * JointApplicationChecklist - Document checklist for joint applications.
 */

import { User, Users } from 'lucide-react'
import { DocumentChecklist } from './DocumentChecklist'
import type { DocumentChecklistItem, ClientDocument, CaseDocument, ApplicantRole } from '@/types/documents'

interface JointApplicationChecklistProps {
  primaryItems: DocumentChecklistItem[]
  coApplicantItems: DocumentChecklistItem[]
  onUpload: (documentTypeId: string, file: File, applicantRole: ApplicantRole) => void
  onView: (document: ClientDocument | CaseDocument) => void
  onDelete?: (documentId: string) => void
  onAddCustomDocument: (name: string, file: File, applicantRole: ApplicantRole) => void
  addButtonLabel?: string
  readOnly?: boolean
}

export function JointApplicationChecklist({
  primaryItems,
  coApplicantItems,
  onUpload,
  onView,
  onDelete,
  onAddCustomDocument,
  addButtonLabel = 'Add Document',
  readOnly,
}: JointApplicationChecklistProps) {
  return (
    <div className="space-y-6">
      {/* Primary Applicant */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-[#1e3a5f]" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Primary Applicant</span>
        </div>
        <DocumentChecklist
          items={primaryItems}
          onUpload={(docTypeId, file) => onUpload(docTypeId, file, 'primary')}
          onView={onView}
          onDelete={onDelete}
          onAddCustomDocument={(name, file) => onAddCustomDocument(name, file, 'primary')}
          addButtonLabel={addButtonLabel}
          readOnly={readOnly}
        />
      </div>

      {/* Co-Applicant */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-purple-600" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Co-Applicant</span>
        </div>
        <DocumentChecklist
          items={coApplicantItems}
          onUpload={(docTypeId, file) => onUpload(docTypeId, file, 'co_applicant')}
          onView={onView}
          onDelete={onDelete}
          onAddCustomDocument={(name, file) => onAddCustomDocument(name, file, 'co_applicant')}
          addButtonLabel={addButtonLabel}
          readOnly={readOnly}
        />
      </div>
    </div>
  )
}
