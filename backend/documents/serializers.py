"""
Serializers for Document models.

This module provides serializers for document types, client documents,
and case documents.
"""

from rest_framework import serializers

from documents.models import (
    DocumentType,
    ClientDocument,
    CaseDocument,
    DocumentLevel,
    ApplicantType,
    ApplicantRole,
    DocumentStatus,
    UploadSource,
    ACCEPTED_FORMATS,
    MAX_FILE_SIZE,
)


class DocumentTypeSerializer(serializers.ModelSerializer):
    """
    Serializer for document types.

    Returns all fields needed for checklist display and document creation.
    """

    class Meta:
        model = DocumentType
        fields = [
            'id',
            'name',
            'level',
            'required',
            'description',
            'applicant_type',
            'display_order',
            'is_system',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'is_system', 'created_at', 'updated_at']


class DocumentTypeCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating custom document types.
    """

    class Meta:
        model = DocumentType
        fields = [
            'name',
            'level',
            'required',
            'description',
            'applicant_type',
            'display_order',
        ]

    def validate_level(self, value):
        """Validate level is a valid choice."""
        if value not in DocumentLevel.values:
            raise serializers.ValidationError(
                f'Level must be one of: {", ".join(DocumentLevel.values)}'
            )
        return value

    def create(self, validated_data):
        """Create a custom document type."""
        # Custom types are not system types
        validated_data['is_system'] = False
        # Set high display_order so custom docs appear at bottom
        if 'display_order' not in validated_data or validated_data['display_order'] is None:
            max_order = DocumentType.objects.filter(
                level=validated_data.get('level')
            ).order_by('-display_order').values_list('display_order', flat=True).first()
            validated_data['display_order'] = (max_order or 0) + 100
        return super().create(validated_data)


class DocumentFileValidationMixin:
    """Mixin for common file validation logic."""

    def validate_file_format(self, value):
        """Validate file format is accepted."""
        if value:
            format_lower = value.lower().lstrip('.')
            if format_lower not in ACCEPTED_FORMATS:
                raise serializers.ValidationError(
                    f'File format must be one of: {", ".join(ACCEPTED_FORMATS)}'
                )
        return value

    def validate_file_size(self, value):
        """Validate file size is within limit."""
        if value and value > MAX_FILE_SIZE:
            raise serializers.ValidationError(
                f'File size exceeds maximum of {MAX_FILE_SIZE // (1024 * 1024)} MB'
            )
        return value


class BaseDocumentSerializer(serializers.ModelSerializer):
    """
    Base serializer for documents with common fields.
    """
    document_type_name = serializers.CharField(
        source='document_type.name', read_only=True
    )
    document_type_required = serializers.BooleanField(
        source='document_type.required', read_only=True
    )

    class Meta:
        abstract = True
        fields = [
            'id',
            'document_type',
            'document_type_name',
            'document_type_required',
            'file_url',
            'file_name',
            'file_size',
            'file_format',
            'applicant_role',
            'status',
            'uploaded_via',
            'uploaded_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'document_type_name',
            'document_type_required',
            'uploaded_at',
            'created_at',
            'updated_at',
        ]


class ClientDocumentSerializer(BaseDocumentSerializer):
    """
    Serializer for client documents.
    """
    client_name = serializers.CharField(source='client.name', read_only=True)

    class Meta(BaseDocumentSerializer.Meta):
        model = ClientDocument
        fields = BaseDocumentSerializer.Meta.fields + ['client', 'client_name']
        read_only_fields = BaseDocumentSerializer.Meta.read_only_fields + ['client_name']


class ClientDocumentCreateSerializer(DocumentFileValidationMixin, serializers.ModelSerializer):
    """
    Serializer for creating/uploading client documents.
    """
    document_type_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = ClientDocument
        fields = [
            'document_type_id',
            'file_url',
            'file_name',
            'file_size',
            'file_format',
            'applicant_role',
            'uploaded_via',
        ]

    def validate_document_type_id(self, value):
        """Validate document type exists and is client-level."""
        try:
            doc_type = DocumentType.objects.get(pk=value)
            if doc_type.level != DocumentLevel.CLIENT:
                raise serializers.ValidationError(
                    'Document type must be client-level for client documents.'
                )
        except DocumentType.DoesNotExist:
            raise serializers.ValidationError('Invalid document type.')
        return value

    def create(self, validated_data):
        """Create client document with proper references."""
        document_type_id = validated_data.pop('document_type_id')
        client = self.context.get('client')

        if not client:
            raise serializers.ValidationError({'client': 'Client is required.'})

        return ClientDocument.objects.create(
            client=client,
            document_type_id=document_type_id,
            **validated_data
        )


class CaseDocumentSerializer(BaseDocumentSerializer):
    """
    Serializer for case documents.
    """
    case_id = serializers.UUIDField(source='case.id', read_only=True)

    class Meta(BaseDocumentSerializer.Meta):
        model = CaseDocument
        fields = BaseDocumentSerializer.Meta.fields + ['case', 'case_id']


class CaseDocumentCreateSerializer(DocumentFileValidationMixin, serializers.ModelSerializer):
    """
    Serializer for creating/uploading case documents.
    """
    document_type_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = CaseDocument
        fields = [
            'document_type_id',
            'file_url',
            'file_name',
            'file_size',
            'file_format',
            'applicant_role',
            'uploaded_via',
        ]

    def validate_document_type_id(self, value):
        """Validate document type exists and is case-level."""
        try:
            doc_type = DocumentType.objects.get(pk=value)
            if doc_type.level != DocumentLevel.CASE:
                raise serializers.ValidationError(
                    'Document type must be case-level for case documents.'
                )
        except DocumentType.DoesNotExist:
            raise serializers.ValidationError('Invalid document type.')
        return value

    def create(self, validated_data):
        """Create case document with proper references."""
        document_type_id = validated_data.pop('document_type_id')
        case = self.context.get('case')

        if not case:
            raise serializers.ValidationError({'case': 'Case is required.'})

        return CaseDocument.objects.create(
            case=case,
            document_type_id=document_type_id,
            **validated_data
        )


class DocumentChecklistItemSerializer(serializers.Serializer):
    """
    Serializer for document checklist items.

    Combines document type with upload status and document details.
    """
    document_type = DocumentTypeSerializer()
    document = serializers.SerializerMethodField()
    is_uploaded = serializers.BooleanField()

    def get_document(self, obj):
        """Return document details if uploaded."""
        doc = obj.get('document')
        if doc:
            if hasattr(doc, 'client'):
                return ClientDocumentSerializer(doc).data
            elif hasattr(doc, 'case'):
                return CaseDocumentSerializer(doc).data
        return None


class ClientDocumentChecklistSerializer(serializers.Serializer):
    """
    Serializer for client document checklist response.

    Groups documents by applicant role for joint applications.
    """
    primary = serializers.ListField(child=DocumentChecklistItemSerializer())
    co_applicant = serializers.ListField(
        child=DocumentChecklistItemSerializer(),
        required=False,
        allow_null=True
    )
    is_joint_application = serializers.BooleanField()


class CaseDocumentChecklistSerializer(serializers.Serializer):
    """
    Serializer for case document checklist response.
    """
    primary = serializers.ListField(child=DocumentChecklistItemSerializer())
    co_applicant = serializers.ListField(
        child=DocumentChecklistItemSerializer(),
        required=False,
        allow_null=True
    )
    is_joint_application = serializers.BooleanField()