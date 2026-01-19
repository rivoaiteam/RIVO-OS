"""
Custom permissions for user management.

This module provides permission classes for role-based access control.
"""

from rest_framework import permissions
from rest_framework.request import Request
from rest_framework.views import APIView

from users.models import UserRole


class IsAdminRole(permissions.BasePermission):
    """
    Permission class that only allows users with Admin role.

    Returns 403 Forbidden for non-admin users with a clear error message.
    """

    message = 'Access denied. Admin role required for this operation.'

    def has_permission(self, request: Request, view: APIView) -> bool:
        """Check if user has admin role."""
        if not request.user:
            return False

        if not hasattr(request.user, 'role'):
            return False

        return request.user.role == UserRole.ADMIN


# Alias for convenience
IsAdmin = IsAdminRole


class IsAuthenticated(permissions.BasePermission):
    """
    Permission class that requires authentication.

    Standard authentication check for protected endpoints.
    """

    message = 'Authentication required.'

    def has_permission(self, request: Request, view: APIView) -> bool:
        """Check if user is authenticated."""
        return bool(request.user and hasattr(request.user, 'id'))


class IsManagerOrAdmin(permissions.BasePermission):
    """
    Permission class that allows Manager or Admin roles.

    Used for operations that require team-level or higher access.
    """

    message = 'Access denied. Manager or Admin role required.'

    def has_permission(self, request: Request, view: APIView) -> bool:
        """Check if user has manager or admin role."""
        if not request.user:
            return False

        if not hasattr(request.user, 'role'):
            return False

        return request.user.role in [UserRole.ADMIN, UserRole.MANAGER]


class IsManager(permissions.BasePermission):
    """
    Permission class that only allows users with Manager role.

    Used for Manager-exclusive operations like the SLA Breach Dashboard.
    Returns 403 Forbidden for non-manager users.
    """

    message = 'Access denied. Manager role required for this operation.'

    def has_permission(self, request: Request, view: APIView) -> bool:
        """Check if user has manager role."""
        if not request.user:
            return False

        if not hasattr(request.user, 'role'):
            return False

        return request.user.role == UserRole.MANAGER
