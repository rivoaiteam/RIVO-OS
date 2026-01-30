"""
Serializers for Case model.

This module provides serializers for case CRUD operations
and stage management.
"""

from decimal import Decimal
from rest_framework import serializers

from cases.models import (
    Case, CaseStage, RateType, MortgageType, PropertyCategory,
    CaseType, Emirate, FixedPeriod, Bank, TERMINAL_STAGES,
)
from clients.models import Client, ApplicationType, PropertyType, TransactionType


class BankListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing banks in dropdown.
    Returns only id, name, and icon.
    """

    class Meta:
        model = Bank
        fields = ['id', 'name', 'icon']
        read_only_fields = ['id', 'name', 'icon']


class ClientSummarySerializer(serializers.ModelSerializer):
    """Nested serializer for client summary in case list/detail views."""

    class Meta:
        model = Client
        fields = ['id', 'name', 'phone', 'email']
        read_only_fields = ['id', 'name', 'phone', 'email']


class CaseListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing cases.

    Returns: id, client (nested summary), stage, property_value, loan_amount, bank, created_at, stage_sla_status
    """
    client = ClientSummarySerializer(read_only=True)
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)
    ltv_percentage = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        read_only=True
    )
    stage_sla_status = serializers.SerializerMethodField()

    class Meta:
        model = Case
        fields = [
            'id',
            'client',
            'stage',
            'stage_display',
            'property_value',
            'loan_amount',
            'ltv_percentage',
            'bank',
            'created_at',
            'stage_sla_status',
        ]
        read_only_fields = ['id', 'created_at']

    def get_stage_sla_status(self, obj: Case) -> dict:
        """Get Stage SLA status for list view."""
        return obj.stage_sla_status


class CaseDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for case detail view.

    Returns all fields plus LTV calculation and SLA status.
    """
    client = ClientSummarySerializer(read_only=True)
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)
    property_type_display = serializers.CharField(source='get_property_type_display', read_only=True)
    property_category_display = serializers.CharField(source='get_property_category_display', read_only=True)
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    rate_type_display = serializers.CharField(source='get_rate_type_display', read_only=True)
    mortgage_type_display = serializers.CharField(source='get_mortgage_type_display', read_only=True)
    application_type_display = serializers.CharField(source='get_application_type_display', read_only=True)
    case_type_display = serializers.CharField(source='get_case_type_display', read_only=True)
    emirate_display = serializers.CharField(source='get_emirate_display', read_only=True)
    fixed_period_display = serializers.CharField(source='get_fixed_period_display', read_only=True)
    ltv_percentage = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        read_only=True
    )
    ltv_limit = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        read_only=True
    )
    is_terminal = serializers.BooleanField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    is_on_hold = serializers.BooleanField(read_only=True)

    # SLA status fields
    stage_sla_status = serializers.SerializerMethodField()
    assigned_to = serializers.SerializerMethodField()

    class Meta:
        model = Case
        fields = [
            # Deal Information
            'id',
            'client',
            'application_type',
            'application_type_display',
            'case_type',
            'case_type_display',
            # Property
            'property_category',
            'property_category_display',
            'property_type',
            'property_type_display',
            'emirate',
            'emirate_display',
            'transaction_type',
            'transaction_type_display',
            'property_value',
            'developer',
            'project_name',
            'location',
            'is_first_property',
            # Loan
            'loan_amount',
            'ltv_percentage',
            'ltv_limit',
            'tenure_years',
            'tenure_months',
            # Bank Product
            'bank',
            'mortgage_type',
            'mortgage_type_display',
            'rate_type',
            'rate_type_display',
            'rate',
            'fixed_period',
            'fixed_period_display',
            # Stage
            'stage',
            'stage_display',
            'stage_changed_at',
            'is_terminal',
            'is_active',
            'is_on_hold',
            # SLA Status
            'stage_sla_status',
            'assigned_to',
            # Timestamps
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'application_type',
            'stage_changed_at',
            'created_at',
            'updated_at',
            'ltv_limit',
        ]

    def get_stage_sla_status(self, obj: Case) -> dict:
        """
        Get Stage SLA status for countdown display.

        Returns dict with status, remaining_hours, display, stage.
        """
        return obj.stage_sla_status

    def get_assigned_to(self, obj: Case) -> dict | None:
        """Get assigned user info."""
        if not obj.assigned_to:
            return None
        return {
            'id': str(obj.assigned_to.id),
            'name': obj.assigned_to.name,
            'email': obj.assigned_to.email,
        }


class CaseCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating cases.

    Accepts: client_id, property fields, loan fields, bank product fields
    """
    client_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Case
        fields = [
            'client_id',
            # Case Type
            'case_type',
            # Property
            'property_category',
            'property_type',
            'emirate',
            'transaction_type',
            'property_value',
            'developer',
            'project_name',
            'location',
            'is_first_property',
            # Loan
            'loan_amount',
            'tenure_years',
            'tenure_months',
            # Bank Product
            'bank',
            'mortgage_type',
            'rate_type',
            'rate',
            'fixed_period',
        ]

    def validate_client_id(self, value):
        """Validate client exists and can create a case."""
        try:
            client = Client.objects.get(id=value)
        except Client.DoesNotExist:
            raise serializers.ValidationError('Client not found.')

        if not client.can_create_case:
            raise serializers.ValidationError(
                'Client does not meet eligibility requirements to create a case.'
            )

        return value

    def validate_tenure_years(self, value):
        """Validate tenure is within allowed range."""
        if value < 1 or value > 25:
            raise serializers.ValidationError('Tenure must be between 1 and 25 years.')
        return value

    def validate_tenure_months(self, value):
        """Validate tenure months is within allowed range."""
        if value < 0 or value > 11:
            raise serializers.ValidationError('Tenure months must be between 0 and 11.')
        return value

    def validate_property_value(self, value):
        """Validate property value is positive."""
        if value <= 0:
            raise serializers.ValidationError('Property value must be positive.')
        return value

    def validate_loan_amount(self, value):
        """Validate loan amount is positive."""
        if value <= 0:
            raise serializers.ValidationError('Loan amount must be positive.')
        return value

    def validate_rate(self, value):
        """Validate rate is positive."""
        if value <= 0:
            raise serializers.ValidationError('Rate must be positive.')
        return value

    def validate(self, attrs):
        """Cross-field validation."""
        property_value = attrs.get('property_value')
        loan_amount = attrs.get('loan_amount')

        if property_value and loan_amount:
            if loan_amount > property_value:
                raise serializers.ValidationError({
                    'loan_amount': 'Loan amount cannot exceed property value.'
                })

        return attrs

    def create(self, validated_data):
        """Create case with client reference and copy application_type."""
        client_id = validated_data.pop('client_id')
        client = Client.objects.get(id=client_id)

        # Copy application_type from client
        validated_data['client'] = client
        validated_data['application_type'] = client.application_type

        return Case.objects.create(**validated_data)


class CaseUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating cases.

    All writable fields except client. Cannot update terminal cases.
    """

    class Meta:
        model = Case
        fields = [
            # Case Type
            'case_type',
            # Property
            'property_category',
            'property_type',
            'emirate',
            'transaction_type',
            'property_value',
            'developer',
            'project_name',
            'location',
            'is_first_property',
            # Loan
            'loan_amount',
            'tenure_years',
            'tenure_months',
            # Bank Product
            'bank',
            'mortgage_type',
            'rate_type',
            'rate',
            'fixed_period',
        ]

    def validate_tenure_years(self, value):
        """Validate tenure is within allowed range."""
        if value < 1 or value > 25:
            raise serializers.ValidationError('Tenure must be between 1 and 25 years.')
        return value

    def validate_tenure_months(self, value):
        """Validate tenure months is within allowed range."""
        if value < 0 or value > 11:
            raise serializers.ValidationError('Tenure months must be between 0 and 11.')
        return value

    def validate_property_value(self, value):
        """Validate property value is positive."""
        if value <= 0:
            raise serializers.ValidationError('Property value must be positive.')
        return value

    def validate_loan_amount(self, value):
        """Validate loan amount is positive."""
        if value <= 0:
            raise serializers.ValidationError('Loan amount must be positive.')
        return value

    def validate_rate(self, value):
        """Validate rate is positive."""
        if value <= 0:
            raise serializers.ValidationError('Rate must be positive.')
        return value

    def validate(self, attrs):
        """Cross-field validation and terminal case check."""
        instance = self.instance

        # Check if case is in terminal stage
        if instance and instance.is_terminal:
            raise serializers.ValidationError(
                'Cannot update a case in a terminal stage.'
            )

        # Cross-field validation for property value and loan amount
        property_value = attrs.get('property_value', instance.property_value if instance else None)
        loan_amount = attrs.get('loan_amount', instance.loan_amount if instance else None)

        if property_value and loan_amount:
            if loan_amount > property_value:
                raise serializers.ValidationError({
                    'loan_amount': 'Loan amount cannot exceed property value.'
                })

        return attrs


class StageChangeSerializer(serializers.Serializer):
    """Serializer for changing case stage."""
    stage = serializers.ChoiceField(choices=CaseStage.choices)

    def validate_stage(self, value):
        """Validate the stage transition is allowed."""
        instance = self.context.get('case')
        if not instance:
            raise serializers.ValidationError('Case not found.')

        can_transition, reason = instance.can_transition_to(value)
        if not can_transition:
            raise serializers.ValidationError(reason)

        return value


class CaseReassignSerializer(serializers.Serializer):
    """Serializer for reassigning case owner."""
    assigned_to = serializers.UUIDField(
        help_text='User ID to assign the case to'
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
