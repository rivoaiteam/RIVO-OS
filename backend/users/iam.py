"""
Identity and Access Management (IAM) for Rivo OS.

Centralized permission configuration and checking.
All role-based access control should use this module.

Usage:
    from users.iam import can, Action, Resource

    if can(user, Action.UPDATE, Resource.LEADS):
        # User can update leads
        pass
"""

from enum import Enum
from typing import Optional
from users.models import UserRole


class Action(str, Enum):
    """Actions that can be performed on resources."""
    VIEW = 'view'
    CREATE = 'create'
    UPDATE = 'update'
    DELETE = 'delete'


class Resource(str, Enum):
    """Resources in the system."""
    LEADS = 'leads'
    CLIENTS = 'clients'
    CASES = 'cases'
    USERS = 'users'
    CHANNELS = 'channels'
    TEMPLATES = 'templates'
    BANK_PRODUCTS = 'bank_products'
    SLA_CONFIG = 'sla_config'
    AUDIT_LOGS = 'audit_logs'


# Permission matrix: role -> resource -> [allowed actions]
# This is the single source of truth for all permissions
PERMISSIONS = {
    UserRole.ADMIN: {
        # Admin: System configuration only, no operational access
        Resource.USERS: [Action.VIEW, Action.CREATE, Action.UPDATE, Action.DELETE],
        Resource.CHANNELS: [Action.VIEW, Action.CREATE, Action.UPDATE, Action.DELETE],
        Resource.TEMPLATES: [Action.VIEW, Action.CREATE, Action.UPDATE, Action.DELETE],
        Resource.BANK_PRODUCTS: [Action.VIEW, Action.CREATE, Action.UPDATE, Action.DELETE],
        Resource.SLA_CONFIG: [Action.VIEW, Action.CREATE, Action.UPDATE, Action.DELETE],
        Resource.AUDIT_LOGS: [Action.VIEW],
        # No access to operational data
        Resource.LEADS: [],
        Resource.CLIENTS: [],
        Resource.CASES: [],
    },
    UserRole.MANAGER: {
        # Manager: Read-only oversight of all operational data
        Resource.LEADS: [Action.VIEW],
        Resource.CLIENTS: [Action.VIEW],
        Resource.CASES: [Action.VIEW],
        Resource.AUDIT_LOGS: [Action.VIEW],
        # Can view templates (for reference)
        Resource.TEMPLATES: [Action.VIEW],
        # No access to system config
        Resource.USERS: [],
        Resource.CHANNELS: [],
        Resource.BANK_PRODUCTS: [],
        Resource.SLA_CONFIG: [],
    },
    UserRole.MS: {
        # Mortgage Specialist: All actions on leads and clients, cases view only
        Resource.LEADS: [Action.VIEW, Action.CREATE, Action.UPDATE, Action.DELETE],
        Resource.CLIENTS: [Action.VIEW, Action.CREATE, Action.UPDATE, Action.DELETE],
        Resource.CASES: [Action.VIEW],  # View only - convert to case is a client action
        Resource.TEMPLATES: [Action.VIEW],
        # No access to admin resources
        Resource.USERS: [],
        Resource.CHANNELS: [],
        Resource.BANK_PRODUCTS: [],
        Resource.SLA_CONFIG: [],
        Resource.AUDIT_LOGS: [],
    },
    UserRole.PE: {
        # Process Executive: All actions on clients and cases, view-only leads
        Resource.LEADS: [Action.VIEW],  # View only
        Resource.CLIENTS: [Action.VIEW, Action.CREATE, Action.UPDATE, Action.DELETE],
        Resource.CASES: [Action.VIEW, Action.CREATE, Action.UPDATE, Action.DELETE],
        Resource.TEMPLATES: [Action.VIEW],
        # No access to admin resources
        Resource.USERS: [],
        Resource.CHANNELS: [],
        Resource.BANK_PRODUCTS: [],
        Resource.SLA_CONFIG: [],
        Resource.AUDIT_LOGS: [],
    },
}


def can(user, action: Action, resource: Resource) -> bool:
    """
    Check if a user can perform an action on a resource.

    Args:
        user: The user object (must have 'role' attribute)
        action: The action to check (view, create, update, delete)
        resource: The resource to check (leads, clients, cases, etc.)

    Returns:
        True if the user has permission, False otherwise

    Example:
        if can(request.user, Action.UPDATE, Resource.LEADS):
            lead.status = 'declined'
            lead.save()
    """
    if not user or not hasattr(user, 'role'):
        return False

    role = user.role
    if role not in PERMISSIONS:
        return False

    role_permissions = PERMISSIONS[role]
    if resource not in role_permissions:
        return False

    return action in role_permissions[resource]


def get_allowed_actions(user, resource: Resource) -> list[Action]:
    """
    Get all allowed actions for a user on a resource.

    Args:
        user: The user object
        resource: The resource to check

    Returns:
        List of allowed actions
    """
    if not user or not hasattr(user, 'role'):
        return []

    role = user.role
    if role not in PERMISSIONS:
        return []

    return PERMISSIONS.get(role, {}).get(resource, [])


def get_accessible_resources(user) -> dict[Resource, list[Action]]:
    """
    Get all resources and their allowed actions for a user.

    Args:
        user: The user object

    Returns:
        Dict mapping resources to their allowed actions
    """
    if not user or not hasattr(user, 'role'):
        return {}

    role = user.role
    if role not in PERMISSIONS:
        return {}

    return {
        resource: actions
        for resource, actions in PERMISSIONS[role].items()
        if actions  # Only include resources with at least one action
    }


def get_user_permissions(user) -> dict:
    """
    Get a serializable permissions object for frontend use.

    Returns a dict that can be sent to the frontend to control UI visibility.
    """
    if not user or not hasattr(user, 'role'):
        return {'role': None, 'permissions': {}}

    permissions = {}
    for resource in Resource:
        actions = get_allowed_actions(user, resource)
        if actions:
            permissions[resource.value] = {
                'view': Action.VIEW in actions,
                'create': Action.CREATE in actions,
                'update': Action.UPDATE in actions,
                'delete': Action.DELETE in actions,
            }
        else:
            permissions[resource.value] = {
                'view': False,
                'create': False,
                'update': False,
                'delete': False,
            }

    return {
        'role': user.role,
        'permissions': permissions,
    }
