"""
Django admin configuration for Message Templates.
"""

from django.contrib import admin
from .models import MessageTemplate


@admin.register(MessageTemplate)
class MessageTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'is_active', 'created_by', 'updated_at']
    list_filter = ['category', 'is_active']
    search_fields = ['name', 'content']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['category', 'name']
