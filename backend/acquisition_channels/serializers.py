"""
Serializers for Channel and Source models.
"""

from rest_framework import serializers
from acquisition_channels.models import Channel, Source
from users.models import User


class SourceSerializer(serializers.ModelSerializer):
    """Serializer for source details."""
    linked_user_name = serializers.SerializerMethodField()
    effective_sla = serializers.IntegerField(source='effective_sla_minutes', read_only=True)
    channel_name = serializers.CharField(source='channel.name', read_only=True)

    class Meta:
        model = Source
        fields = [
            'id', 'name', 'sla_minutes', 'effective_sla', 'status',
            'linked_user', 'linked_user_name', 'channel_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_linked_user_name(self, obj):
        if obj.linked_user:
            return obj.linked_user.name
        return None


class SourceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating sources."""

    class Meta:
        model = Source
        fields = ['name', 'sla_minutes', 'status', 'linked_user']


class ChannelSerializer(serializers.ModelSerializer):
    """Serializer for channel with nested sources."""
    sources = SourceSerializer(many=True, read_only=True)
    source_count = serializers.IntegerField(source='sources.count', read_only=True)
    owner_name = serializers.SerializerMethodField()
    class Meta:
        model = Channel
        fields = [
            'id', 'name', 'description', 'is_trusted', 'default_sla_minutes',
            'is_active', 'owner', 'owner_name', 'monthly_spend', 'sources', 'source_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_owner_name(self, obj):
        if obj.owner:
            return obj.owner.name
        return None


class ChannelListSerializer(serializers.ModelSerializer):
    """Serializer for channel list (without nested sources)."""
    source_count = serializers.IntegerField(source='sources.count', read_only=True)
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Channel
        fields = [
            'id', 'name', 'description', 'is_trusted', 'default_sla_minutes',
            'is_active', 'owner', 'owner_name', 'monthly_spend', 'source_count',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_owner_name(self, obj):
        if obj.owner:
            return obj.owner.name
        return None


class ChannelCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating channels."""
    owner = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Channel
        fields = ['name', 'description', 'is_trusted', 'default_sla_minutes', 'owner', 'monthly_spend']


class ChannelUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating channels."""
    owner = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Channel
        fields = ['name', 'description', 'is_trusted', 'default_sla_minutes', 'is_active', 'owner', 'monthly_spend']


class MSUserSerializer(serializers.ModelSerializer):
    """Serializer for MS users (for BH Mortgage Team dropdown)."""

    class Meta:
        model = User
        fields = ['id', 'name', 'email']
