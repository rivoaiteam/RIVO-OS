"""
API views for Message Templates.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from users.permissions import IsAuthenticated, CanAccessTemplates
from users.iam import can, Action, Resource
from .models import MessageTemplate, TemplateCategory
from .serializers import (
    MessageTemplateSerializer,
    MessageTemplateCreateSerializer,
    TemplateCategorySerializer,
    TemplateVariableSerializer,
)


class MessageTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing message templates.

    Access controlled by IAM matrix (Resource.TEMPLATES).
    Admin, MS, and PO have full CRUD. Others per IAM config.
    """
    queryset = MessageTemplate.objects.all()
    serializer_class = MessageTemplateSerializer

    permission_classes = [IsAuthenticated, CanAccessTemplates]

    def get_serializer_class(self):
        """Use different serializer for create/update."""
        if self.action in ['create', 'update', 'partial_update']:
            return MessageTemplateCreateSerializer
        return MessageTemplateSerializer

    def get_queryset(self):
        """Filter templates by search and category."""
        queryset = MessageTemplate.objects.all()

        # Filter by active status (admin can see inactive templates)
        user = self.request.user
        if not can(user, Action.DELETE, Resource.TEMPLATES):
            queryset = queryset.filter(is_active=True)

        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        # Search by name or content
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(name__icontains=search) |
                models.Q(content__icontains=search)
            )

        return queryset.order_by('category', 'name')

    def perform_create(self, serializer):
        """Set created_by to current user."""
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """List all available template categories."""
        categories = [
            {'value': choice[0], 'label': choice[1]}
            for choice in TemplateCategory.choices
        ]
        serializer = TemplateCategorySerializer(categories, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def variables(self, request):
        """List all available template variables."""
        variables = MessageTemplate.get_available_variables()
        serializer = TemplateVariableSerializer(variables, many=True)
        return Response(serializer.data)


# Need to import models for Q lookup
from django.db import models
