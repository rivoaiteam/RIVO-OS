/**
 * React Query hooks for Document management.
 * Connects to the Django backend API for document types, client documents, and case documents.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import type {
  DocumentType,
  CreateDocumentTypeData,
  ClientDocument,
  CreateClientDocumentData,
  CaseDocument,
  CreateCaseDocumentData,
  DocumentChecklistResponse,
  DocumentLevel,
} from '@/types/documents'

interface FileUploadResponse {
  url: string
  path: string
  file_name: string
  file_size: number
  file_format: string
}

/**
 * Upload a file to storage and return the URL.
 */
async function uploadFileToStorage(file: File, folder?: string): Promise<FileUploadResponse> {
  return api.upload<FileUploadResponse>('/documents/upload/', file, folder ? { folder } : undefined)
}

/**
 * Hook for uploading a file to storage.
 */
export function useUploadFile() {
  return useMutation({
    mutationFn: async ({ file, folder }: { file: File; folder?: string }) => {
      return uploadFileToStorage(file, folder)
    },
  })
}

/**
 * Hook for fetching document types with optional level filter.
 */
export function useDocumentTypes(level?: DocumentLevel) {
  return useQuery({
    queryKey: ['documentTypes', level],
    queryFn: async (): Promise<DocumentType[]> => {
      const params: Record<string, string | undefined> = {}
      if (level) {
        params.level = level
      }
      return await api.get<DocumentType[]>('/document_types/', params)
    },
  })
}

/**
 * Hook for creating a custom document type.
 */
export function useCreateDocumentType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateDocumentTypeData) => {
      try {
        return await api.post<DocumentType>('/document_types/', data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error(
            (error.data as { error?: string })?.error || 'Failed to create document type'
          )
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['documentTypes'] })
    },
  })
}

/**
 * Hook for deleting a document type.
 */
export function useDeleteDocumentType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentTypeId: string) => {
      try {
        await api.delete(`/document_types/${documentTypeId}/`)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error(
            (error.data as { error?: string })?.error || 'Failed to delete document type'
          )
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['documentTypes'] })
      queryClient.refetchQueries({ queryKey: ['clientDocuments'] })
      queryClient.refetchQueries({ queryKey: ['caseDocuments'] })
    },
  })
}

/**
 * Hook for fetching client documents checklist.
 */
export function useClientDocuments(clientId: string | null) {
  return useQuery({
    queryKey: ['clientDocuments', clientId],
    queryFn: async (): Promise<DocumentChecklistResponse> => {
      return await api.get<DocumentChecklistResponse>(`/clients/${clientId}/documents/`)
    },
    enabled: !!clientId,
  })
}

/**
 * Hook for uploading a client document.
 */
export function useUploadClientDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      clientId,
      data,
    }: {
      clientId: string
      data: CreateClientDocumentData
    }) => {
      try {
        return await api.post<ClientDocument>(`/clients/${clientId}/documents/`, data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error(
            (error.data as { error?: string })?.error || 'Failed to upload document'
          )
        }
        throw error
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.refetchQueries({ queryKey: ['clientDocuments', variables.clientId] })
    },
  })
}

/**
 * Hook for deleting a client document.
 */
export function useDeleteClientDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clientId, documentId }: { clientId: string; documentId: string }) => {
      try {
        await api.delete(`/clients/${clientId}/documents/${documentId}/`)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error(
            (error.data as { error?: string })?.error || 'Failed to delete document'
          )
        }
        throw error
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.refetchQueries({ queryKey: ['clientDocuments', variables.clientId] })
    },
  })
}

/**
 * Hook for fetching case documents checklist.
 */
export function useCaseDocuments(caseId: string | null) {
  return useQuery({
    queryKey: ['caseDocuments', caseId],
    queryFn: async (): Promise<DocumentChecklistResponse> => {
      return await api.get<DocumentChecklistResponse>(`/cases/${caseId}/documents/`)
    },
    enabled: !!caseId,
  })
}

/**
 * Hook for uploading a case document.
 */
export function useUploadCaseDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      caseId,
      data,
    }: {
      caseId: string
      data: CreateCaseDocumentData
    }) => {
      try {
        return await api.post<CaseDocument>(`/cases/${caseId}/documents/`, data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error(
            (error.data as { error?: string })?.error || 'Failed to upload document'
          )
        }
        throw error
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.refetchQueries({ queryKey: ['caseDocuments', variables.caseId] })
    },
  })
}

/**
 * Hook for deleting a case document.
 */
export function useDeleteCaseDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ caseId, documentId }: { caseId: string; documentId: string }) => {
      try {
        await api.delete(`/cases/${caseId}/documents/${documentId}/`)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error(
            (error.data as { error?: string })?.error || 'Failed to delete document'
          )
        }
        throw error
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.refetchQueries({ queryKey: ['caseDocuments', variables.caseId] })
    },
  })
}
