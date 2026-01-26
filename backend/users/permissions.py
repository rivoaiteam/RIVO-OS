"""
Custom permissions for user management.

This module provides permission classes for role-based access control.
Uses the centralized IAM module for all permission checks.
"""

from rest_framework import permissions
from rest_framework.request import Request
from rest_framework.views import APIView

from users.models import UserRole
from users.iam import can, Action, Resource


class IsAuthenticated(permissions.BasePermission):
    """Permission class that requires authentication."""

    message = 'Authentication required.'

    def has_permission(self, request: Request, view: APIView) -> bool:
        return bool(request.user and hasattr(request.user, 'id'))


class IsAdmin(permissions.BasePermission):
    """Permission class that only allows Admin role."""

    message = 'Access denied. Admin role required.'

    def has_permission(self, request: Request, view: APIView) -> bool:
        return can(request.user, Action.VIEW, Resource.USERS)


# Alias for backward compatibility
IsAdminRole = IsAdmin


class IsManagerOrAdmin(permissions.BasePermission):
    """Permission class that allows Manager or Admin roles."""

    message = 'Access denied. Manager or Admin role required.'

    def has_permission(self, request: Request, view: APIView) -> bool:
        if not request.user or not hasattr(request.user, 'role'):
            return False
        return request.user.role in [UserRole.ADMIN, UserRole.MANAGER]


class IsManager(permissions.BasePermission):
    """Permission class for Manager role."""

    message = 'Access denied. Manager role required.'

    def has_permission(self, request: Request, view: APIView) -> bool:
        if not request.user or not hasattr(request.user, 'role'):
            return False
        return request.user.role == UserRole.MANAGER


class HasResourcePermission(permissions.BasePermission):
    """
    Dynamic permission class that checks IAM permissions.

    Usage in views:
        permission_classes = [IsAuthenticated, HasResourcePermission]

        def get_iam_resource(self):
            return Resource.LEADS

    The action is derived from the HTTP method:
        GET -> VIEW
        POST -> CREATE
        PUT/PATCH -> UPDATE
        DELETE -> DELETE
    """

    message = 'Access denied. Insufficient permissions.'

    # Map HTTP methods to IAM actions
    METHOD_ACTION_MAP = {
        'GET': Action.VIEW,
        'HEAD': Action.VIEW,
        'OPTIONS': Action.VIEW,
        'POST': Action.CREATE,
        'PUT': Action.UPDATE,
        'PATCH': Action.UPDATE,
        'DELETE': Action.DELETE,
    }

    def has_permission(self, request: Request, view: APIView) -> bool:
        if not request.user or not hasattr(request.user, 'id'):
            return False

        # Get resource from view
        resource = getattr(view, 'iam_resource', None)
        if resource is None and hasattr(view, 'get_iam_resource'):
            resource = view.get_iam_resource()

        if resource is None:
            # No resource defined, allow (fallback to other permission checks)
            return True

        # Get action from HTTP method
        action = self.METHOD_ACTION_MAP.get(request.method)
        if action is None:
            return False

        return can(request.user, action, resource)


# Convenience permission classes for common resources
class CanAccessLeads(permissions.BasePermission):
    """Permission for leads access based on IAM."""
    message = 'Access denied. No permission for leads.'

    def has_permission(self, request: Request, view: APIView) -> bool:
        action = HasResourcePermission.METHOD_ACTION_MAP.get(request.method, Action.VIEW)
        return can(request.user, action, Resource.LEADS)


class CanAccessClients(permissions.BasePermission):
    """Permission for clients access based on IAM."""
    message = 'Access denied. No permission for clients.'

    def has_permission(self, request: Request, view: APIView) -> bool:
        action = HasResourcePermission.METHOD_ACTION_MAP.get(request.method, Action.VIEW)
        return can(request.user, action, Resource.CLIENTS)


class CanAccessCases(permissions.BasePermission):
    """Permission for cases access based on IAM."""
    message = 'Access denied. No permission for cases.'

    def has_permission(self, request: Request, view: APIView) -> bool:
        action = HasResourcePermission.METHOD_ACTION_MAP.get(request.method, Action.VIEW)
        return can(request.user, action, Resource.CASES)
