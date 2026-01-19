"""
Serializers for Channel, Source, and Sub-source models.
"""

from rest_framework import serializers
from channels.models import Channel, Source, SubSource
from users.models import User


class SubSourceSerializer(serializers.ModelSerializer):
    """Serializer for sub-source details."""
    linked_user_name = serializers.CharField(source='linked_user.name', read_only=True)
    effective_sla = serializers.IntegerField(source='effective_sla_minutes', read_only=True)

    class Meta:
        model = SubSource
        fields = [
            'id', 'name', 'sla_minutes', 'effective_sla',
            'linked_user', 'linked_user_name', 'status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SubSourceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating sub-sources."""

    class Meta:
        model = SubSource
        fields = ['name', 'sla_minutes', 'linked_user', 'status']


class SourceSerializer(serializers.ModelSerializer):
    """Serializer for source with nested sub-sources."""
    sub_sources = SubSourceSerializer(many=True, read_only=True)
    sub_source_count = serializers.IntegerField(source='sub_sources.count', read_only=True)
    effective_sla = serializers.IntegerField(source='effective_sla_minutes', read_only=True)

    class Meta:
        model = Source
        fields = [
            'id', 'name', 'sla_minutes', 'effective_sla', 'is_active',
            'sub_sources', 'sub_source_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SourceListSerializer(serializers.ModelSerializer):
    """Serializer for source list (without nested sub-sources)."""
    sub_source_count = serializers.IntegerField(source='sub_sources.count', read_only=True)

    class Meta:
        model = Source
        fields = ['id', 'name', 'is_active', 'sub_source_count', 'created_at']
        read_only_fields = ['id', 'created_at']


class SourceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating sources."""

    class Meta:
        model = Source
        fields = ['name']


class ChannelSerializer(serializers.ModelSerializer):
    """Serializer for channel with nested sources."""
    sources = SourceSerializer(many=True, read_only=True)
    source_count = serializers.IntegerField(source='sources.count', read_only=True)

    class Meta:
        model = Channel
        fields = [
            'id', 'name', 'description', 'is_trusted', 'default_sla_minutes',
            'is_active', 'sources', 'source_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ChannelListSerializer(serializers.ModelSerializer):
    """Serializer for channel list (without nested sources)."""
    source_count = serializers.IntegerField(source='sources.count', read_only=True)

    class Meta:
        model = Channel
        fields = [
            'id', 'name', 'description', 'is_trusted', 'default_sla_minutes',
            'is_active', 'source_count', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ChannelCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating channels."""

    class Meta:
        model = Channel
        fields = ['name', 'description', 'is_trusted', 'default_sla_minutes']


class ChannelUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating channels."""

    class Meta:
        model = Channel
        fields = ['name', 'description', 'is_trusted', 'default_sla_minutes', 'is_active']


class MSUserSerializer(serializers.ModelSerializer):
    """Serializer for MS users (for BH Mortgage Team dropdown)."""

    class Meta:
        model = User
        fields = ['id', 'name', 'email']
