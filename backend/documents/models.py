"""
Document models for Rivo OS Mortgage Management.

This module implements a two-tier document management system:
- Client-level Documents (Atom B): KYC and financial documents that persist across all Cases
- Case-level Bank Forms: Bank-specific forms required for each application
"""

import uuid
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from audit.models import AuditableModel


# File validation constants
ACCEPTED_FORMATS = ['jpg', 'jpeg', 'png', 'heic', 'pdf']
MAX_FILE_SIZE = 10_485_760  # 10 MB in bytes


class DocumentLevel(models.TextChoices):
    """Document level choices."""
    CLIENT = 'client', 'Client'
    CASE = 'case', 'Case'


class DocumentCategory(models.TextChoices):
    """Document category based on employment type and residency."""
    SALARIED_UAE_NATIONAL = 'salaried_uae_national', 'Salaried - UAE National'
    SELF_EMPLOYED_UAE_NATIONAL = 'self_employed_uae_national', 'Self-Employed - UAE National'
    SALARIED_UAE_RESIDENT = 'salaried_uae_resident', 'Salaried - UAE Resident'
    SELF_EMPLOYED_UAE_RESIDENT = 'self_employed_uae_resident', 'Self-Employed - UAE Resident'
    SALARIED_NON_RESIDENT = 'salaried_non_resident', 'Salaried - Non-Resident'
    SELF_EMPLOYED_NON_RESIDENT = 'self_employed_non_resident', 'Self-Employed - Non-Resident'
    CONDITIONAL = 'conditional', 'Conditional'


class ApplicantType(models.TextChoices):
    """Applicant type choices for document requirements."""
    PRIMARY = 'primary', 'Primary'
    CO_APPLICANT = 'co_applicant', 'Co-Applicant'
    BOTH = 'both', 'Both'


class ApplicantRole(models.TextChoices):
    """Applicant role for uploaded documents."""
    PRIMARY = 'primary', 'Primary'
    CO_APPLICANT = 'co_applicant', 'Co-Applicant'


class DocumentStatus(models.TextChoices):
    """Document upload status choices."""
    PENDING = 'pending', 'Pending'
    UPLOADED = 'uploaded', 'Uploaded'
    VERIFIED = 'verified', 'Verified'


class UploadSource(models.TextChoices):
    """Upload source choices."""
    WEB = 'web', 'Web'
    WHATSAPP = 'whatsapp', 'WhatsApp'


class DocumentType(models.Model):
    """
    DocumentType model for defining document requirements.

    Supports both client-level (KYC) and case-level (bank forms) documents.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Unique identifier for the document type'
    )

    name = models.CharField(
        max_length=255,
        help_text='Name of the document type'
    )

    level = models.CharField(
        max_length=10,
        choices=DocumentLevel.choices,
        help_text='Document level (client or case)'
    )

    category = models.CharField(
        max_length=30,
        choices=DocumentCategory.choices,
        blank=True,
        default='',
        help_text='Document category based on employment/residency type'
    )

    condition = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Condition when this document is required (for conditional documents)'
    )

    required = models.BooleanField(
        default=False,
        help_text='Whether this document is required'
    )

    description = models.TextField(
        blank=True,
        default='',
        help_text='Description of the document type'
    )

    applicant_type = models.CharField(
        max_length=15,
        choices=ApplicantType.choices,
        default=ApplicantType.BOTH,
        help_text='Which applicant(s) this document applies to'
    )

    display_order = models.PositiveIntegerField(
        default=0,
        help_text='Order for displaying in checklists'
    )

    is_system = models.BooleanField(
        default=False,
        help_text='Whether this is a system-defined document type (not deletable)'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When the document type was created'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='When the document type was last updated'
    )

    class Meta:
        db_table = 'document_types'
        ordering = ['display_order', 'name']
        indexes = [
            models.Index(fields=['level'], name='document_types_level_idx'),
            models.Index(fields=['required'], name='document_types_required_idx'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['name', 'level', 'category'],
                name='document_types_name_level_category_unique'
            )
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.get_level_display()})"

    def clean(self) -> None:
        """Validate model fields."""
        super().clean()

        if not self.name:
            raise ValidationError({
                'name': 'Document type name is required.'
            })

        if not self.level:
            raise ValidationError({
                'level': 'Document level is required.'
            })

    def save(self, *args, **kwargs) -> None:
        """Run validation before saving."""
        self.full_clean()
        super().save(*args, **kwargs)


class BaseDocument(AuditableModel):
    """
    Abstract base model for document uploads.

    Contains common fields for both client and case documents.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Unique identifier for the document'
    )

    document_type = models.ForeignKey(
        DocumentType,
        on_delete=models.PROTECT,
        help_text='Type of document'
    )

    file_url = models.URLField(
        max_length=1024,
        blank=True,
        default='',
        help_text='URL to the uploaded file'
    )

    file_name = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Original file name'
    )

    file_size = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='File size in bytes'
    )

    file_format = models.CharField(
        max_length=10,
        blank=True,
        default='',
        help_text='File format (extension)'
    )

    applicant_role = models.CharField(
        max_length=15,
        choices=ApplicantRole.choices,
        default=ApplicantRole.PRIMARY,
        help_text='Which applicant this document belongs to'
    )

    status = models.CharField(
        max_length=10,
        choices=DocumentStatus.choices,
        default=DocumentStatus.PENDING,
        help_text='Upload status of the document'
    )

    uploaded_via = models.CharField(
        max_length=10,
        choices=UploadSource.choices,
        default=UploadSource.WEB,
        help_text='Source of the upload'
    )

    uploaded_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the document was uploaded'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When the record was created'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='When the record was last updated'
    )

    class Meta:
        abstract = True

    def clean(self) -> None:
        """Validate file format and size."""
        super().clean()

        # Validate file format if provided
        if self.file_format:
            format_lower = self.file_format.lower().lstrip('.')
            if format_lower not in ACCEPTED_FORMATS:
                raise ValidationError({
                    'file_format': f'File format must be one of: {", ".join(ACCEPTED_FORMATS)}'
                })

        # Validate file size if provided
        if self.file_size and self.file_size > MAX_FILE_SIZE:
            raise ValidationError({
                'file_size': f'File size exceeds maximum of {MAX_FILE_SIZE // (1024 * 1024)} MB'
            })

    def save(self, *args, **kwargs) -> None:
        """Set uploaded_at when file is first uploaded."""
        if self.file_url and not self.uploaded_at:
            self.uploaded_at = timezone.now()
            if self.status == DocumentStatus.PENDING:
                self.status = DocumentStatus.UPLOADED

        self.full_clean()
        super().save(*args, **kwargs)


class ClientDocument(BaseDocument):
    """
    ClientDocument model for client-level KYC documents.

    These documents persist across all Cases for a Client.
    """

    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.CASCADE,
        related_name='client_documents',
        help_text='Client this document belongs to'
    )

    class Meta:
        db_table = 'client_documents'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['client'], name='client_docs_client_idx'),
            models.Index(fields=['document_type'], name='client_docs_type_idx'),
            models.Index(fields=['status'], name='client_docs_status_idx'),
            models.Index(fields=['applicant_role'], name='client_docs_role_idx'),
        ]

    def __str__(self) -> str:
        return f"{self.document_type.name} - {self.client.name}"

    def clean(self) -> None:
        """Validate client document."""
        super().clean()

        if not self.client_id:
            raise ValidationError({
                'client': 'Client is required.'
            })

        if not self.document_type_id:
            raise ValidationError({
                'document_type': 'Document type is required.'
            })

        # Validate document type is client-level
        if self.document_type_id:
            try:
                doc_type = DocumentType.objects.get(pk=self.document_type_id)
                if doc_type.level != DocumentLevel.CLIENT:
                    raise ValidationError({
                        'document_type': 'Document type must be client-level for client documents.'
                    })
            except DocumentType.DoesNotExist:
                raise ValidationError({
                    'document_type': 'Invalid document type.'
                })


class CaseDocument(BaseDocument):
    """
    CaseDocument model for case-level bank forms.

    These documents are specific to each Case and deleted when Case is deleted.
    """

    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.CASCADE,
        related_name='case_documents',
        help_text='Case this document belongs to'
    )

    class Meta:
        db_table = 'case_documents'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['case'], name='case_docs_case_idx'),
            models.Index(fields=['document_type'], name='case_docs_type_idx'),
            models.Index(fields=['status'], name='case_docs_status_idx'),
            models.Index(fields=['applicant_role'], name='case_docs_role_idx'),
        ]

    def __str__(self) -> str:
        return f"{self.document_type.name} - Case {str(self.case_id)[:8]}"

    def clean(self) -> None:
        """Validate case document."""
        super().clean()

        if not self.case_id:
            raise ValidationError({
                'case': 'Case is required.'
            })

        if not self.document_type_id:
            raise ValidationError({
                'document_type': 'Document type is required.'
            })

        # Validate document type is case-level
        if self.document_type_id:
            try:
                doc_type = DocumentType.objects.get(pk=self.document_type_id)
                if doc_type.level != DocumentLevel.CASE:
                    raise ValidationError({
                        'document_type': 'Document type must be case-level for case documents.'
                    })
            except DocumentType.DoesNotExist:
                raise ValidationError({
                    'document_type': 'Invalid document type.'
                })