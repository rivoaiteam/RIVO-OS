"""
API views for Document management.

This module provides ViewSets for document types, client documents,
and case documents.
"""

import logging

from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes as perm_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from clients.models import Client, ApplicationType
from cases.models import Case
from documents.models import (
    DocumentType,
    ClientDocument,
    CaseDocument,
    DocumentLevel,
    DocumentCategory,
    ApplicantRole,
)
from clients.models import ResidencyType, EmploymentType
from documents.serializers import (
    DocumentTypeSerializer,
    DocumentTypeCreateSerializer,
    ClientDocumentSerializer,
    ClientDocumentCreateSerializer,
    CaseDocumentSerializer,
    CaseDocumentCreateSerializer,
)
from documents.storage import upload_file, delete_file
from users.permissions import IsAuthenticated

logger = logging.getLogger(__name__)


def get_client_document_category(client):
    """
    Determine document category based on client's employment type and residency.

    Returns the appropriate DocumentCategory value.
    """
    employment = client.employment_type
    residency = client.residency

    if residency == ResidencyType.UAE_NATIONAL:
        if employment == EmploymentType.SALARIED:
            return DocumentCategory.SALARIED_UAE_NATIONAL
        else:
            return DocumentCategory.SELF_EMPLOYED_UAE_NATIONAL
    elif residency == ResidencyType.UAE_RESIDENT:
        if employment == EmploymentType.SALARIED:
            return DocumentCategory.SALARIED_UAE_RESIDENT
        else:
            return DocumentCategory.SELF_EMPLOYED_UAE_RESIDENT
    else:  # NON_RESIDENT
        if employment == EmploymentType.SALARIED:
            return DocumentCategory.SALARIED_NON_RESIDENT
        else:
            return DocumentCategory.SELF_EMPLOYED_NON_RESIDENT


@api_view(['POST'])
@perm_classes([IsAuthenticated])
def upload_document_file(request):
    """
    Upload a file to storage.

    POST /documents/upload
    Content-Type: multipart/form-data
    Body: file, folder (optional)

    Returns:
        - url: Public URL of the uploaded file
        - path: Storage path
        - file_name: Original file name
        - file_size: File size in bytes
        - file_format: File extension
    """
    if 'file' not in request.FILES:
        return Response(
            {'error': 'No file provided'},
            status=status.HTTP_400_BAD_REQUEST
        )

    file = request.FILES['file']
    folder = request.data.get('folder', '')

    # Validate file size (10MB max)
    max_size = 10 * 1024 * 1024
    if file.size > max_size:
        return Response(
            {'error': 'File too large. Maximum size is 10MB'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate file format
    allowed_formats = ['jpg', 'jpeg', 'png', 'pdf', 'heic']
    file_ext = file.name.split('.')[-1].lower()
    if file_ext not in allowed_formats:
        return Response(
            {'error': f'Invalid file format. Allowed: {", ".join(allowed_formats)}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        result = upload_file(file, folder)
        return Response(result, status=status.HTTP_201_CREATED)
    except Exception as e:
        logger.error(f'File upload failed: {str(e)}')
        return Response(
            {'error': f'Upload failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class DocumentTypeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for document type management.

    Endpoints:
    - GET /document_types - List all document types (with level filter)
    - GET /document_types/{id} - Get document type details
    - POST /document_types - Create custom document type
    """

    queryset = DocumentType.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return DocumentTypeCreateSerializer
        return DocumentTypeSerializer

    def get_queryset(self):
        """Filter queryset by level if specified."""
        queryset = super().get_queryset()

        level = self.request.query_params.get('level', '').strip()
        if level and level in DocumentLevel.values:
            queryset = queryset.filter(level=level)

        return queryset

    def list(self, request):
        """
        List all document types with optional level filter.

        GET /document_types?level=client
        GET /document_types?level=case
        """
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request):
        """
        Create a custom document type.

        POST /document_types
        Body: { name, level, required, description, applicant_type, display_order }
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            document_type = serializer.save()
            return Response(
                DocumentTypeSerializer(document_type).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            logger.error(f'Document type creation failed: {str(e)}')
            return Response(
                {'error': f'Failed to create document type: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, pk=None):
        """
        Delete a custom document type.

        DELETE /document_types/{id}

        Only custom (non-system) document types can be deleted.
        """
        document_type = get_object_or_404(DocumentType, pk=pk)

        if document_type.is_system:
            return Response(
                {'error': 'Cannot delete system document types'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            document_type.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f'Document type deletion failed: {str(e)}')
            return Response(
                {'error': f'Failed to delete document type: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ClientDocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for client document management.

    Endpoints:
    - GET /clients/{client_id}/documents - List client documents with checklist
    - GET /clients/{client_id}/documents/{id} - Get document details
    - POST /clients/{client_id}/documents - Upload document
    - DELETE /clients/{client_id}/documents/{id} - Delete document
    """

    queryset = ClientDocument.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return ClientDocumentCreateSerializer
        return ClientDocumentSerializer

    def get_client(self):
        """Get client from URL parameter."""
        client_id = self.kwargs.get('client_id')
        return get_object_or_404(Client, pk=client_id)

    def get_queryset(self):
        """Filter to documents for this client."""
        client = self.get_client()
        return ClientDocument.objects.filter(client=client).select_related(
            'document_type'
        )

    def list(self, request, client_id=None):
        """
        List client documents with checklist response.

        GET /clients/{client_id}/documents

        Returns:
            - primary: List of document types with upload status for primary applicant
            - co_applicant: List for co-applicant (if joint application)
            - is_joint_application: Boolean
            - category: The document category based on client profile
            - conditional: List of conditional documents
        """
        client = self.get_client()

        # Get document category based on client's profile
        category = get_client_document_category(client)

        # Get client-level document types for this category
        document_types = DocumentType.objects.filter(
            level=DocumentLevel.CLIENT,
            category=category
        ).order_by('display_order', 'name')

        # Get conditional documents (client-level)
        conditional_types = DocumentType.objects.filter(
            level=DocumentLevel.CLIENT,
            category=DocumentCategory.CONDITIONAL
        ).order_by('display_order', 'name')

        # Get uploaded documents for this client
        uploaded_docs = {
            (doc.document_type_id, doc.applicant_role): doc
            for doc in self.get_queryset()
        }

        # Build checklist for primary applicant
        primary_checklist = []
        for doc_type in document_types:
            if doc_type.applicant_type in ['primary', 'both']:
                doc = uploaded_docs.get((doc_type.id, ApplicantRole.PRIMARY))
                primary_checklist.append({
                    'document_type': DocumentTypeSerializer(doc_type).data,
                    'document': ClientDocumentSerializer(doc).data if doc else None,
                    'is_uploaded': doc is not None,
                })

        # Build conditional checklist
        conditional_checklist = []
        for doc_type in conditional_types:
            doc = uploaded_docs.get((doc_type.id, ApplicantRole.PRIMARY))
            conditional_checklist.append({
                'document_type': DocumentTypeSerializer(doc_type).data,
                'document': ClientDocumentSerializer(doc).data if doc else None,
                'is_uploaded': doc is not None,
            })

        # Build checklist for co-applicant (if joint application)
        co_applicant_checklist = None
        is_joint = client.application_type == ApplicationType.JOINT

        if is_joint:
            co_applicant_checklist = []
            for doc_type in document_types:
                if doc_type.applicant_type in ['co_applicant', 'both']:
                    doc = uploaded_docs.get((doc_type.id, ApplicantRole.CO_APPLICANT))
                    co_applicant_checklist.append({
                        'document_type': DocumentTypeSerializer(doc_type).data,
                        'document': ClientDocumentSerializer(doc).data if doc else None,
                        'is_uploaded': doc is not None,
                    })

        # Get IDs of document types already shown in checklists
        shown_type_ids = set(dt.id for dt in document_types) | set(dt.id for dt in conditional_types)

        # Find uploaded documents that don't match current category
        # (e.g., from before a profile change)
        other_documents = []
        for (doc_type_id, role), doc in uploaded_docs.items():
            if doc_type_id not in shown_type_ids:
                other_documents.append({
                    'document_type': DocumentTypeSerializer(doc.document_type).data,
                    'document': ClientDocumentSerializer(doc).data,
                    'is_uploaded': True,
                })

        return Response({
            'primary': primary_checklist,
            'co_applicant': co_applicant_checklist,
            'conditional': conditional_checklist,
            'other_documents': other_documents,  # Docs from previous profile
            'is_joint_application': is_joint,
            'category': category,
        })

    def retrieve(self, request, client_id=None, pk=None):
        """
        Get document details.

        GET /clients/{client_id}/documents/{id}
        """
        document = get_object_or_404(self.get_queryset(), pk=pk)
        serializer = ClientDocumentSerializer(document)
        return Response(serializer.data)

    def create(self, request, client_id=None):
        """
        Upload a client document.

        POST /clients/{client_id}/documents
        Body: { document_type_id, file_url, file_name, file_size, file_format, applicant_role, uploaded_via }
        """
        client = self.get_client()

        serializer = ClientDocumentCreateSerializer(
            data=request.data,
            context={'client': client}
        )
        serializer.is_valid(raise_exception=True)

        try:
            document = serializer.save()
            return Response(
                ClientDocumentSerializer(document).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            logger.error(f'Client document creation failed: {str(e)}')
            return Response(
                {'error': f'Failed to upload document: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, client_id=None, pk=None):
        """
        Delete a client document.

        DELETE /clients/{client_id}/documents/{id}
        """
        document = get_object_or_404(self.get_queryset(), pk=pk)

        try:
            document.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f'Client document deletion failed: {str(e)}')
            return Response(
                {'error': f'Failed to delete document: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CaseDocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for case document management.

    Endpoints:
    - GET /cases/{case_id}/documents - List case documents with checklist
    - GET /cases/{case_id}/documents/{id} - Get document details
    - POST /cases/{case_id}/documents - Upload document
    - DELETE /cases/{case_id}/documents/{id} - Delete document
    """

    queryset = CaseDocument.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return CaseDocumentCreateSerializer
        return CaseDocumentSerializer

    def get_case(self):
        """Get case from URL parameter."""
        case_id = self.kwargs.get('case_id')
        return get_object_or_404(Case, pk=case_id)

    def get_queryset(self):
        """Filter to documents for this case."""
        case = self.get_case()
        return CaseDocument.objects.filter(case=case).select_related(
            'document_type'
        )

    def list(self, request, case_id=None):
        """
        List case documents with checklist response.

        GET /cases/{case_id}/documents

        Returns:
            - primary: List of document types with upload status for primary applicant
            - co_applicant: List for co-applicant (if joint application)
            - is_joint_application: Boolean
        """
        case = self.get_case()

        # Get all case-level document types
        document_types = DocumentType.objects.filter(
            level=DocumentLevel.CASE
        ).order_by('display_order', 'name')

        # Get uploaded documents for this case
        uploaded_docs = {
            (doc.document_type_id, doc.applicant_role): doc
            for doc in self.get_queryset()
        }

        # Build checklist for primary applicant
        primary_checklist = []
        for doc_type in document_types:
            doc = uploaded_docs.get((doc_type.id, ApplicantRole.PRIMARY))
            primary_checklist.append({
                'document_type': DocumentTypeSerializer(doc_type).data,
                'document': CaseDocumentSerializer(doc).data if doc else None,
                'is_uploaded': doc is not None,
            })

        # Build checklist for co-applicant (if joint application)
        co_applicant_checklist = None
        is_joint = case.application_type == ApplicationType.JOINT

        if is_joint:
            co_applicant_checklist = []
            for doc_type in document_types:
                if doc_type.applicant_type in ['co_applicant', 'both']:
                    doc = uploaded_docs.get((doc_type.id, ApplicantRole.CO_APPLICANT))
                    co_applicant_checklist.append({
                        'document_type': DocumentTypeSerializer(doc_type).data,
                        'document': CaseDocumentSerializer(doc).data if doc else None,
                        'is_uploaded': doc is not None,
                    })

        return Response({
            'primary': primary_checklist,
            'co_applicant': co_applicant_checklist,
            'is_joint_application': is_joint,
        })

    def retrieve(self, request, case_id=None, pk=None):
        """
        Get document details.

        GET /cases/{case_id}/documents/{id}
        """
        document = get_object_or_404(self.get_queryset(), pk=pk)
        serializer = CaseDocumentSerializer(document)
        return Response(serializer.data)

    def create(self, request, case_id=None):
        """
        Upload a case document.

        POST /cases/{case_id}/documents
        Body: { document_type_id, file_url, file_name, file_size, file_format, applicant_role, uploaded_via }
        """
        case = self.get_case()

        serializer = CaseDocumentCreateSerializer(
            data=request.data,
            context={'case': case}
        )
        serializer.is_valid(raise_exception=True)

        try:
            document = serializer.save()
            return Response(
                CaseDocumentSerializer(document).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            logger.error(f'Case document creation failed: {str(e)}')
            return Response(
                {'error': f'Failed to upload document: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, case_id=None, pk=None):
        """
        Delete a case document.

        DELETE /cases/{case_id}/documents/{id}
        """
        document = get_object_or_404(self.get_queryset(), pk=pk)

        try:
            document.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f'Case document deletion failed: {str(e)}')
            return Response(
                {'error': f'Failed to delete document: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )