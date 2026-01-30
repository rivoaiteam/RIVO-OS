"""
Serializers for Channel and Source models.
"""

from rest_framework import serializers
from acquisition_channels.models import Channel, Source, Team
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
    team_count = serializers.SerializerMethodField()

    class Meta:
        model = Channel
        fields = [
            'id', 'name', 'description', 'is_trusted', 'default_sla_minutes',
            'is_active', 'owner', 'owner_name', 'sources', 'source_count',
            'team_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_owner_name(self, obj):
        if obj.owner:
            return obj.owner.name
        return None

    def get_team_count(self, obj):
        return obj.teams.count()


class ChannelListSerializer(serializers.ModelSerializer):
    """Serializer for channel list (without nested sources)."""
    source_count = serializers.IntegerField(source='sources.count', read_only=True)
    owner_name = serializers.SerializerMethodField()
    team_count = serializers.SerializerMethodField()

    class Meta:
        model = Channel
        fields = [
            'id', 'name', 'description', 'is_trusted', 'default_sla_minutes',
            'is_active', 'owner', 'owner_name', 'source_count', 'team_count',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_owner_name(self, obj):
        if obj.owner:
            return obj.owner.name
        return None

    def get_team_count(self, obj):
        return obj.teams.count()


class ChannelCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating channels."""
    owner = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Channel
        fields = ['name', 'description', 'is_trusted', 'default_sla_minutes', 'owner']


class ChannelUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating channels."""
    owner = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Channel
        fields = ['name', 'description', 'is_trusted', 'default_sla_minutes', 'is_active', 'owner']


class TeamSerializer(serializers.ModelSerializer):
    """Serializer for team details."""
    channel_name = serializers.SerializerMethodField()
    team_leader_name = serializers.SerializerMethodField()
    ms_name = serializers.SerializerMethodField()
    po_name = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = [
            'id', 'name', 'channel', 'channel_name',
            'team_leader', 'team_leader_name',
            'mortgage_specialist', 'ms_name',
            'process_officer', 'po_name',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_channel_name(self, obj):
        return obj.channel.name if obj.channel else None

    def get_team_leader_name(self, obj):
        return obj.team_leader.name if obj.team_leader else None

    def get_ms_name(self, obj):
        return obj.mortgage_specialist.name if obj.mortgage_specialist else None

    def get_po_name(self, obj):
        return obj.process_officer.name if obj.process_officer else None


class TeamCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating teams."""
    channel = serializers.PrimaryKeyRelatedField(queryset=Channel.objects.all())
    team_leader = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False, allow_null=True)
    mortgage_specialist = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False, allow_null=True)
    process_officer = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Team
        fields = ['name', 'channel', 'team_leader', 'mortgage_specialist', 'process_officer']


class MSUserSerializer(serializers.ModelSerializer):
    """Serializer for MS users (for BH Mortgage Team dropdown)."""

    class Meta:
        model = User
        fields = ['id', 'name', 'email']
