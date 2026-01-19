"""
Serializers for Lead model.

This module provides serializers for lead CRUD operations
and status management.
"""

from rest_framework import serializers

from channels.models import SubSource
from leads.models import Lead, LeadStatus


class SubSourceNestedSerializer(serializers.ModelSerializer):
    """Nested serializer for sub-source in lead responses."""
    source_name = serializers.CharField(source='source.name', read_only=True)
    channel_name = serializers.CharField(source='source.channel.name', read_only=True)
    effective_sla = serializers.IntegerField(source='effective_sla_minutes', read_only=True)

    class Meta:
        model = SubSource
        fields = ['id', 'name', 'source_name', 'channel_name', 'effective_sla']


class LeadListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing leads.

    Returns: id, name, phone, email, status, sub_source (nested), sla_display, created_at
    """
    sub_source = SubSourceNestedSerializer(read_only=True)
    sla_display = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            'id', 'name', 'phone', 'email', 'status',
            'sub_source', 'sla_display', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_sla_display(self, obj: Lead) -> str:
        """Get human-readable SLA timer display."""
        return obj.sla_timer.get('display', 'No SLA')


class LeadDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for lead detail view.

    Returns all lead fields plus computed sla_timer.
    """
    sub_source = SubSourceNestedSerializer(read_only=True)
    sla_timer = serializers.SerializerMethodField()
    is_terminal = serializers.BooleanField(read_only=True)

    class Meta:
        model = Lead
        fields = [
            'id', 'name', 'phone', 'email', 'intent', 'status',
            'sub_source', 'converted_client_id', 'sla_timer', 'is_terminal',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'converted_client_id', 'created_at', 'updated_at']

    def get_sla_timer(self, obj: Lead) -> dict:
        """Get full SLA timer information."""
        return obj.sla_timer


class LeadCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating leads.

    Accepts: name, phone, email, sub_source_id, intent
    Validates that sub_source belongs to an untrusted channel.
    """
    sub_source_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Lead
        fields = ['name', 'phone', 'email', 'sub_source_id', 'intent']

    def validate_sub_source_id(self, value):
        """Validate sub_source exists and belongs to untrusted channel."""
        try:
            sub_source = SubSource.objects.select_related(
                'source__channel'
            ).get(id=value)
        except SubSource.DoesNotExist:
            raise serializers.ValidationError('Sub-source does not exist.')

        if sub_source.source.channel.is_trusted:
            raise serializers.ValidationError(
                f'Leads can only be created from untrusted channels. '
                f'Channel "{sub_source.source.channel.name}" is trusted.'
            )

        return value

    def create(self, validated_data):
        """Create lead with sub_source_id."""
        sub_source_id = validated_data.pop('sub_source_id')
        sub_source = SubSource.objects.get(id=sub_source_id)

        lead = Lead(
            sub_source=sub_source,
            status=LeadStatus.ACTIVE,
            **validated_data
        )
        lead.save()
        return lead


class LeadUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating leads.

    Only allows updating: name, phone, email, intent
    Status changes are handled via the change_status action.
    """

    class Meta:
        model = Lead
        fields = ['name', 'phone', 'email', 'intent']

    def validate(self, attrs):
        """Prevent updates to terminal leads."""
        if self.instance and self.instance.is_terminal:
            raise serializers.ValidationError(
                'Cannot update a lead in terminal status.'
            )
        return attrs


class LeadChangeStatusSerializer(serializers.Serializer):
    """Serializer for changing lead status."""
    status = serializers.ChoiceField(choices=LeadStatus.choices)

    def validate_status(self, value):
        """Validate status transition."""
        lead = self.context.get('lead')
        if not lead:
            return value

        # Cannot change status of terminal leads (except for internal conversion)
        if lead.is_terminal:
            raise serializers.ValidationError(
                'Cannot change status of a lead in terminal status.'
            )

        # Active leads can transition to any status
        if lead.status == LeadStatus.ACTIVE:
            return value

        raise serializers.ValidationError(
            f'Cannot transition from {lead.status} to {value}.'
        )
