/**
 * ClientDocumentTab - Document tab for Client side panel.
 * Clean, minimal design with inline uploads.
 */

import { useState, useCallback } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { DocumentChecklist } from './DocumentChecklist'
import { JointApplicationChecklist } from './JointApplicationChecklist'
import { DocumentPreviewPanel } from './DocumentPreviewPanel'
import {
  useClientDocuments,
  useUploadClientDocument,
  useDeleteClientDocument,
  useCreateDocumentType,
  useDeleteDocumentType,
  useUploadFile,
} from '@/hooks/useDocuments'
import { useAuth } from '@/contexts/AuthContext'
import type {
  ClientDocument,
  CaseDocument,
  ApplicantRole,
} from '@/types/documents'

interface ClientDocumentTabProps {
  clientId: string
}

export function ClientDocumentTab({ clientId }: ClientDocumentTabProps) {
  const { user } = useAuth()
  const isReadOnly = user?.role === 'manager'
  const { data: checklist, isLoading, error, refetch } = useClientDocuments(clientId)
  const uploadFileMutation = useUploadFile()
  const uploadMutation = useUploadClientDocument()
  const deleteMutation = useDeleteClientDocument()
  const deleteTypeMutation = useDeleteDocumentType()
  const createTypeMutation = useCreateDocumentType()

  const [currentApplicantRole, setCurrentApplicantRole] = useState<ApplicantRole>('primary')
  const [previewDoc, setPreviewDoc] = useState<ClientDocument | CaseDocument | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const clearError = useCallback(() => setActionError(null), [])

  const showError = useCallback((message: string) => {
    setActionError(message)
    setTimeout(clearError, 5000)
  }, [clearError])

  const handleUpload = useCallback(async (documentTypeId: string, file: File, applicantRole?: ApplicantRole) => {
    const role = applicantRole || currentApplicantRole
    try {
      const uploadResult = await uploadFileMutation.mutateAsync({
        file,
        folder: `clients/${clientId}`,
      })

      await uploadMutation.mutateAsync({
        clientId,
        data: {
          document_type_id: documentTypeId,
          file_url: uploadResult.url,
          file_name: uploadResult.file_name,
          file_size: uploadResult.file_size,
          file_format: uploadResult.file_format,
          applicant_role: role,
          uploaded_via: 'web',
        },
      })
      await refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Upload failed')
    }
  }, [clientId, currentApplicantRole, uploadFileMutation, uploadMutation, refetch, showError])

  const handleAddCustomDocument = useCallback(async (name: string, file: File, applicantRole?: ApplicantRole) => {
    const role = applicantRole || currentApplicantRole
    try {
      const newType = await createTypeMutation.mutateAsync({
        name,
        level: 'client',
        required: false,
        applicant_type: role === 'co_applicant' ? 'co_applicant' : 'primary',
      })
      await handleUpload(newType.id, file, role)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to add document')
    }
  }, [currentApplicantRole, createTypeMutation, handleUpload, showError])

  const handleDelete = useCallback(async (documentId: string) => {
    if (!window.confirm('Delete this document?')) return

    try {
      const allItems = [...(checklist?.primary || []), ...(checklist?.co_applicant || [])]
      const item = allItems.find(i => i.document?.id === documentId)
      const documentTypeId = item?.document_type.id
      const isCustomType = item?.document_type && !item.document_type.is_system

      await deleteMutation.mutateAsync({ clientId, documentId })

      if (isCustomType && documentTypeId) {
        await deleteTypeMutation.mutateAsync(documentTypeId)
      }

      await refetch()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }, [clientId, checklist, deleteMutation, deleteTypeMutation, refetch, showError])

  const handleView = useCallback((document: ClientDocument | CaseDocument) => {
    setPreviewDoc(prev => prev?.id === document.id ? null : document)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2">
        <AlertCircle className="h-6 w-6 text-red-400" />
        <p className="text-sm text-gray-500">Failed to load documents</p>
        <button onClick={() => refetch()} className="text-xs text-[#1e3a5f] hover:underline">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      {actionError && (
        <div className="mb-3 p-2 bg-red-50 border border-red-100 rounded text-red-600 text-xs flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {actionError}
        </div>
      )}

      {checklist?.is_joint_application ? (
        <JointApplicationChecklist
          primaryItems={checklist.primary}
          coApplicantItems={checklist.co_applicant || []}
          onUpload={(docTypeId, file, role) => handleUpload(docTypeId, file, role)}
          onView={handleView}
          onDelete={handleDelete}
          onAddCustomDocument={(name, file, role) => {
            setCurrentApplicantRole(role)
            handleAddCustomDocument(name, file, role)
          }}
          addButtonLabel="Add Document"
          readOnly={isReadOnly}
        />
      ) : (
        <DocumentChecklist
          items={checklist?.primary || []}
          onUpload={handleUpload}
          onView={handleView}
          onDelete={handleDelete}
          onAddCustomDocument={handleAddCustomDocument}
          title="Documents"
          addButtonLabel="Add Document"
          readOnly={isReadOnly}
        />
      )}

      {previewDoc && (
        <DocumentPreviewPanel
          document={previewDoc}
          isOpen={true}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  )
}
