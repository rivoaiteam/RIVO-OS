"""
API views for Document management.

This module provides ViewSets for document types, client documents,
and case documents.
"""

import logging

from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes as perm_classes
from rest_framework.response import Response

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
from documents.storage import upload_file
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
            - custom: List of custom document types for this client
        """
        client = self.get_client()

        # Get document category based on client's profile
        category = get_client_document_category(client)

        # Get client-level document types for this category (system types only, no client-specific)
        document_types = DocumentType.objects.filter(
            level=DocumentLevel.CLIENT,
            category=category,
            client__isnull=True  # Only system types
        ).order_by('display_order', 'name')

        # Get conditional documents (client-level, system types only)
        conditional_types = DocumentType.objects.filter(
            level=DocumentLevel.CLIENT,
            category=DocumentCategory.CONDITIONAL,
            client__isnull=True  # Only system types
        ).order_by('display_order', 'name')

        # Get custom document types for this specific client
        custom_types = DocumentType.objects.filter(
            level=DocumentLevel.CLIENT,
            client=client,
            is_system=False
        ).order_by('display_order', 'name')

        # Get uploaded documents for this client
        # Build lookups by both ID and NAME for cross-category matching
        # Each key maps to a list of documents (multi-file support)
        uploaded_docs_by_id = {}
        uploaded_docs_by_name = {}
        for doc in self.get_queryset():
            key_id = (doc.document_type_id, doc.applicant_role)
            uploaded_docs_by_id.setdefault(key_id, []).append(doc)
            # Use document type name for cross-category matching
            doc_name = doc.document_type.name
            key_name = (doc_name, doc.applicant_role)
            uploaded_docs_by_name.setdefault(key_name, []).append(doc)

        # Build checklist for primary applicant
        primary_checklist = []
        matched_doc_names = set()  # Track which doc names have been matched
        for doc_type in document_types:
            if doc_type.applicant_type in ['primary', 'both']:
                # Try exact ID match first, then name match (for cross-category)
                docs = uploaded_docs_by_id.get((doc_type.id, ApplicantRole.PRIMARY), [])
                if not docs:
                    docs = uploaded_docs_by_name.get((doc_type.name, ApplicantRole.PRIMARY), [])
                if docs:
                    matched_doc_names.add((docs[0].document_type.name, ApplicantRole.PRIMARY))
                primary_checklist.append({
                    'document_type': DocumentTypeSerializer(doc_type).data,
                    'documents': ClientDocumentSerializer(docs, many=True).data,
                    'uploaded_count': len(docs),
                })

        # Build conditional checklist
        conditional_checklist = []
        for doc_type in conditional_types:
            docs = uploaded_docs_by_id.get((doc_type.id, ApplicantRole.PRIMARY), [])
            if not docs:
                docs = uploaded_docs_by_name.get((doc_type.name, ApplicantRole.PRIMARY), [])
            if docs:
                matched_doc_names.add((docs[0].document_type.name, ApplicantRole.PRIMARY))
            conditional_checklist.append({
                'document_type': DocumentTypeSerializer(doc_type).data,
                'documents': ClientDocumentSerializer(docs, many=True).data,
                'uploaded_count': len(docs),
            })

        # Build custom checklist for client-specific custom document types
        custom_checklist = []
        for doc_type in custom_types:
            docs = uploaded_docs_by_id.get((doc_type.id, ApplicantRole.PRIMARY), [])
            if docs:
                matched_doc_names.add((docs[0].document_type.name, ApplicantRole.PRIMARY))
            custom_checklist.append({
                'document_type': DocumentTypeSerializer(doc_type).data,
                'documents': ClientDocumentSerializer(docs, many=True).data,
                'uploaded_count': len(docs),
            })

        # Build checklist for co-applicant (if joint application)
        co_applicant_checklist = None
        is_joint = client.application_type == ApplicationType.JOINT

        if is_joint:
            co_applicant_checklist = []
            for doc_type in document_types:
                if doc_type.applicant_type in ['co_applicant', 'both']:
                    docs = uploaded_docs_by_id.get((doc_type.id, ApplicantRole.CO_APPLICANT), [])
                    if not docs:
                        docs = uploaded_docs_by_name.get((doc_type.name, ApplicantRole.CO_APPLICANT), [])
                    if docs:
                        matched_doc_names.add((docs[0].document_type.name, ApplicantRole.CO_APPLICANT))
                    co_applicant_checklist.append({
                        'document_type': DocumentTypeSerializer(doc_type).data,
                        'documents': ClientDocumentSerializer(docs, many=True).data,
                        'uploaded_count': len(docs),
                    })

        # Find uploaded documents that don't match any current requirement
        # (e.g., category-specific docs from before a profile change)
        other_documents = []
        for (doc_type_id, role), docs in uploaded_docs_by_id.items():
            doc_name = docs[0].document_type.name
            if (doc_name, role) not in matched_doc_names:
                other_documents.append({
                    'document_type': DocumentTypeSerializer(docs[0].document_type).data,
                    'documents': ClientDocumentSerializer(docs, many=True).data,
                    'uploaded_count': len(docs),
                })

        return Response({
            'primary': primary_checklist,
            'co_applicant': co_applicant_checklist,
            'conditional': conditional_checklist,
            'custom': custom_checklist,  # Client-specific custom document types
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

        # Validate max_files limit
        document_type_id = serializer.validated_data['document_type_id']
        applicant_role = serializer.validated_data.get('applicant_role', ApplicantRole.PRIMARY)
        try:
            doc_type = DocumentType.objects.get(pk=document_type_id)
        except DocumentType.DoesNotExist:
            return Response(
                {'error': 'Invalid document type.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        uploaded_count = ClientDocument.objects.filter(
            client=client,
            document_type_id=document_type_id,
            applicant_role=applicant_role,
        ).count()

        if uploaded_count >= doc_type.max_files:
            return Response(
                {'error': f'Maximum number of files ({doc_type.max_files}) already uploaded for this document type.'},
                status=status.HTTP_400_BAD_REQUEST
            )

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

        If the document uses a custom (non-system) document type that is
        client-specific, the document type is also deleted.
        """
        document = get_object_or_404(self.get_queryset(), pk=pk)
        document_type = document.document_type

        try:
            # Delete the document first
            document.delete()

            # If this was a custom document type (client-specific, non-system),
            # delete the document type as well
            if document_type.client_id and not document_type.is_system:
                document_type.delete()

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

        # Get case-level document types (bank forms only, exclude conditional)
        from django.db.models import Q
        document_types = DocumentType.objects.filter(
            level=DocumentLevel.CASE
        ).filter(
            Q(category__isnull=True) | Q(category='')
        ).order_by('display_order', 'name')

        # Get uploaded documents for this case grouped by (type, role)
        uploaded_docs = {}
        for doc in self.get_queryset():
            key = (doc.document_type_id, doc.applicant_role)
            uploaded_docs.setdefault(key, []).append(doc)

        # Build checklist for primary applicant
        primary_checklist = []
        for doc_type in document_types:
            docs = uploaded_docs.get((doc_type.id, ApplicantRole.PRIMARY), [])
            primary_checklist.append({
                'document_type': DocumentTypeSerializer(doc_type).data,
                'documents': CaseDocumentSerializer(docs, many=True).data,
                'uploaded_count': len(docs),
            })

        # Build checklist for co-applicant (if joint application)
        co_applicant_checklist = None
        is_joint = case.application_type == ApplicationType.JOINT

        if is_joint:
            co_applicant_checklist = []
            for doc_type in document_types:
                if doc_type.applicant_type in ['co_applicant', 'both']:
                    docs = uploaded_docs.get((doc_type.id, ApplicantRole.CO_APPLICANT), [])
                    co_applicant_checklist.append({
                        'document_type': DocumentTypeSerializer(doc_type).data,
                        'documents': CaseDocumentSerializer(docs, many=True).data,
                        'uploaded_count': len(docs),
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

        # Validate max_files limit
        document_type_id = serializer.validated_data['document_type_id']
        applicant_role = serializer.validated_data.get('applicant_role', ApplicantRole.PRIMARY)
        try:
            doc_type = DocumentType.objects.get(pk=document_type_id)
        except DocumentType.DoesNotExist:
            return Response(
                {'error': 'Invalid document type.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        uploaded_count = CaseDocument.objects.filter(
            case=case,
            document_type_id=document_type_id,
            applicant_role=applicant_role,
        ).count()

        if uploaded_count >= doc_type.max_files:
            return Response(
                {'error': f'Maximum number of files ({doc_type.max_files}) already uploaded for this document type.'},
                status=status.HTTP_400_BAD_REQUEST
            )

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