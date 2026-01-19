"""
Serializers for Client and CoApplicant models.

This module provides serializers for client CRUD operations,
co-applicant management, and eligibility calculations.
"""

from rest_framework import serializers

from clients.models import (
    Client,
    ClientStatus,
    CoApplicant,
    ApplicationType,
    ResidencyType,
    VisaType,
    EmploymentType,
    Timeline,
)
from channels.models import SubSource


class SubSourceNestedSerializer(serializers.ModelSerializer):
    """Nested serializer for sub-source in client responses."""
    source_name = serializers.CharField(source='source.name', read_only=True)
    channel_name = serializers.CharField(source='source.channel.name', read_only=True)
    channel_is_trusted = serializers.BooleanField(
        source='source.channel.is_trusted', read_only=True
    )
    effective_sla = serializers.IntegerField(source='effective_sla_minutes', read_only=True)

    class Meta:
        model = SubSource
        fields = [
            'id', 'name', 'source_name', 'channel_name', 'channel_is_trusted', 'effective_sla'
        ]


class AssignedUserSerializer(serializers.Serializer):
    """Serializer for assigned user in client/case responses."""
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)


class CoApplicantSerializer(serializers.ModelSerializer):
    """
    Serializer for co-applicant details.

    Returns identity, income, liability fields, and computed properties.
    """
    total_cc_liability = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    total_loan_emis = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    total_monthly_liabilities = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = CoApplicant
        fields = [
            # Identity
            'id', 'name', 'phone', 'email', 'emirates_id',
            'residency', 'visa_type',
            # Income
            'employment_type', 'monthly_salary', 'company_name',
            # Liabilities - Credit Cards
            'cc_1_limit', 'cc_2_limit', 'cc_3_limit', 'cc_4_limit', 'cc_5_limit',
            # Liabilities - Loans
            'auto_loan_emi', 'personal_loan_emi', 'existing_mortgage_emi',
            # Computed
            'total_cc_liability', 'total_loan_emis', 'total_monthly_liabilities',
            # Timestamps
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'total_cc_liability', 'total_loan_emis', 'total_monthly_liabilities',
        ]


class CoApplicantCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating co-applicant."""

    class Meta:
        model = CoApplicant
        fields = [
            # Identity
            'name', 'phone', 'email', 'emirates_id',
            'residency', 'visa_type',
            # Income
            'employment_type', 'monthly_salary', 'company_name',
            # Liabilities - Credit Cards
            'cc_1_limit', 'cc_2_limit', 'cc_3_limit', 'cc_4_limit', 'cc_5_limit',
            # Liabilities - Loans
            'auto_loan_emi', 'personal_loan_emi', 'existing_mortgage_emi',
        ]


class ClientListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing clients.

    Returns summary fields for table display.
    """
    sub_source = SubSourceNestedSerializer(read_only=True)
    dbr_available = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    sla_display = serializers.SerializerMethodField()
    active_case_id = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            'id', 'name', 'phone', 'email', 'status',
            'application_type', 'dbr_available',
            'sub_source', 'sla_display', 'active_case_id', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'dbr_available']

    def get_sla_display(self, obj: Client) -> str:
        """Get human-readable SLA timer display."""
        return obj.sla_timer.get('display', 'No SLA')

    def get_active_case_id(self, obj: Client) -> list[dict] | None:
        """Get list of active cases for this client."""
        from cases.models import Case, CaseStage
        active_cases = Case.objects.filter(
            client=obj
        ).exclude(
            stage__in=[CaseStage.REJECTED, CaseStage.NOT_PROCEEDING]
        ).order_by('-created_at')[:5]  # Limit to 5 most recent

        if not active_cases:
            return None

        return [
            {
                'id': str(case.id),
                'stage': case.stage,
                'bank': case.bank or 'No bank',
                'loan_amount': str(case.loan_amount),
            }
            for case in active_cases
        ]


class ClientDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for client detail view.

    Returns all fields plus computed DBR, max_loan, can_create_case,
    and SLA status fields for countdown display.
    """
    sub_source = SubSourceNestedSerializer(read_only=True)
    co_applicant = CoApplicantSerializer(read_only=True)

    # Computed fields
    total_cc_liability = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    total_loan_emis = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    total_monthly_liabilities = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    dbr_available = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    max_loan_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    can_create_case = serializers.SerializerMethodField()

    # SLA status fields
    first_contact_sla_status = serializers.SerializerMethodField()
    client_to_case_sla_status = serializers.SerializerMethodField()
    assigned_to = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            # Identity
            'id', 'name', 'phone', 'email', 'date_of_birth', 'nationality',
            'emirates_id', 'residency', 'visa_type',
            # Application
            'application_type',
            # Income
            'employment_type', 'monthly_salary', 'total_addbacks', 'company_name',
            # Liabilities - Credit Cards
            'cc_1_limit', 'cc_2_limit', 'cc_3_limit', 'cc_4_limit', 'cc_5_limit',
            # Liabilities - Loans
            'auto_loan_emi', 'personal_loan_emi', 'existing_mortgage_emi',
            # Intent
            'notes', 'timeline',
            # Status & Source
            'status', 'sub_source', 'converted_from_lead',
            # Co-applicant
            'co_applicant',
            # Computed
            'total_cc_liability', 'total_loan_emis', 'total_monthly_liabilities',
            'dbr_available', 'max_loan_amount', 'can_create_case',
            # SLA Status
            'first_contact_sla_status', 'client_to_case_sla_status',
            'first_contact_completed_at', 'assigned_to',
            # Timestamps
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'converted_from_lead',
            'total_cc_liability', 'total_loan_emis', 'total_monthly_liabilities',
            'dbr_available', 'max_loan_amount', 'first_contact_completed_at',
        ]

    def get_can_create_case(self, obj):
        """Return can_create_case validation result."""
        return obj.can_create_case

    def get_first_contact_sla_status(self, obj: Client) -> dict:
        """
        Get First Contact SLA status.

        Returns dict with status, remaining_hours, display.
        """
        return obj.first_contact_sla_status

    def get_client_to_case_sla_status(self, obj: Client) -> dict:
        """
        Get Client-to-Case SLA status.

        Returns dict with status, remaining_hours, display.
        Only computed if first_contact_completed_at is set.
        """
        return obj.client_to_case_sla_status

    def get_assigned_to(self, obj: Client) -> dict | None:
        """Get assigned user info."""
        if not obj.assigned_to:
            return None
        return {
            'id': str(obj.assigned_to.id),
            'name': obj.assigned_to.name,
            'email': obj.assigned_to.email,
        }


class ClientCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating clients.

    Accepts all writable fields. Validates trusted channel or lead conversion.
    """
    sub_source_id = serializers.UUIDField(write_only=True)
    lead_id = serializers.UUIDField(
        write_only=True, required=False, allow_null=True,
        help_text='Lead ID for conversion (allows untrusted channel)'
    )

    class Meta:
        model = Client
        fields = [
            # Identity
            'name', 'phone', 'email', 'date_of_birth', 'nationality',
            'emirates_id', 'residency', 'visa_type',
            # Application
            'application_type',
            # Income
            'employment_type', 'monthly_salary', 'total_addbacks', 'company_name',
            # Liabilities - Credit Cards
            'cc_1_limit', 'cc_2_limit', 'cc_3_limit', 'cc_4_limit', 'cc_5_limit',
            # Liabilities - Loans
            'auto_loan_emi', 'personal_loan_emi', 'existing_mortgage_emi',
            # Intent
            'notes', 'timeline',
            # Source
            'sub_source_id', 'lead_id',
        ]

    def validate(self, attrs):
        """Validate sub_source belongs to trusted channel or lead is provided."""
        sub_source_id = attrs.get('sub_source_id')
        lead_id = attrs.get('lead_id')

        try:
            sub_source = SubSource.objects.select_related(
                'source__channel'
            ).get(pk=sub_source_id)
        except SubSource.DoesNotExist:
            raise serializers.ValidationError({
                'sub_source_id': 'Invalid sub_source_id.'
            })

        # Check if channel is trusted or lead is provided for conversion
        if not sub_source.source.channel.is_trusted and not lead_id:
            raise serializers.ValidationError({
                'sub_source_id': 'Clients can only be created from trusted channels. '
                                 'Provide lead_id for conversion from untrusted channel.'
            })

        attrs['sub_source'] = sub_source
        return attrs

    def create(self, validated_data):
        """Create client with sub_source and optional lead conversion."""
        sub_source = validated_data.pop('sub_source')
        lead_id = validated_data.pop('lead_id', None)

        # Handle lead conversion
        converted_from_lead = None
        if lead_id:
            from leads.models import Lead
            try:
                lead = Lead.objects.get(pk=lead_id)
                converted_from_lead = lead
            except Lead.DoesNotExist:
                raise serializers.ValidationError({
                    'lead_id': 'Lead not found.'
                })

        validated_data.pop('sub_source_id', None)

        client = Client(
            sub_source=sub_source,
            converted_from_lead=converted_from_lead,
            **validated_data
        )
        client.save()
        return client


class ClientUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating clients.

    Allows partial updates to any writable field.
    """

    class Meta:
        model = Client
        fields = [
            # Identity
            'name', 'phone', 'email', 'date_of_birth', 'nationality',
            'emirates_id', 'residency', 'visa_type',
            # Application
            'application_type',
            # Income
            'employment_type', 'monthly_salary', 'total_addbacks', 'company_name',
            # Liabilities - Credit Cards
            'cc_1_limit', 'cc_2_limit', 'cc_3_limit', 'cc_4_limit', 'cc_5_limit',
            # Liabilities - Loans
            'auto_loan_emi', 'personal_loan_emi', 'existing_mortgage_emi',
            # Intent
            'notes', 'timeline',
        ]


class ClientChangeStatusSerializer(serializers.Serializer):
    """Serializer for changing client status."""
    status = serializers.ChoiceField(choices=ClientStatus.choices)

    def validate_status(self, value):
        """Validate status transition."""
        client = self.context.get('client')
        if client:
            current_status = client.status

            # Define allowed transitions
            allowed_transitions = {
                ClientStatus.ACTIVE: [
                    ClientStatus.CONVERTED,
                    ClientStatus.DECLINED,
                    ClientStatus.NOT_PROCEEDING,
                ],
                ClientStatus.CONVERTED: [],  # Terminal
                ClientStatus.DECLINED: [ClientStatus.ACTIVE],  # Can reactivate
                ClientStatus.NOT_PROCEEDING: [ClientStatus.ACTIVE],  # Can reactivate
            }

            if value not in allowed_transitions.get(current_status, []):
                raise serializers.ValidationError(
                    f'Cannot transition from {current_status} to {value}.'
                )

        return value


class ClientReassignSerializer(serializers.Serializer):
    """Serializer for reassigning client owner."""
    assigned_to = serializers.UUIDField(
        help_text='User ID to assign the client to'
    )

    def validate_assigned_to(self, value):
        """Validate user exists and is active."""
        from users.models import User

        try:
            user = User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError('User not found.')

        if not user.is_active:
            raise serializers.ValidationError('User is not active.')

        return value
