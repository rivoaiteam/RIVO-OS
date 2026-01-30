"""
Serializers for Message Templates API.
"""

from rest_framework import serializers
from .models import MessageTemplate, TemplateCategory


class MessageTemplateSerializer(serializers.ModelSerializer):
    """Serializer for MessageTemplate model."""

    category_display = serializers.CharField(
        source='get_category_display',
        read_only=True
    )
    created_by_name = serializers.CharField(
        source='created_by.name',
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = MessageTemplate
        fields = [
            'id',
            'name',
            'category',
            'category_display',
            'content',
            'is_active',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class MessageTemplateCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a MessageTemplate."""

    class Meta:
        model = MessageTemplate
        fields = ['name', 'category', 'content', 'is_active']

    def validate_name(self, value):
        """Ensure template name is not empty."""
        if not value.strip():
            raise serializers.ValidationError('Template name cannot be empty')
        return value.strip()

    def validate_content(self, value):
        """Ensure template content is not empty."""
        if not value.strip():
            raise serializers.ValidationError('Template content cannot be empty')
        return value.strip()


class TemplateCategorySerializer(serializers.Serializer):
    """Serializer for template category choices."""

    value = serializers.CharField()
    label = serializers.CharField()


class TemplateVariableSerializer(serializers.Serializer):
    """Serializer for available template variables."""

    name = serializers.CharField()
    description = serializers.CharField()
