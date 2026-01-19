"""
Utility functions for user management.

This module contains helper functions for user operations,
including admin protection logic.
"""

from typing import TYPE_CHECKING

from django.core.exceptions import ValidationError

if TYPE_CHECKING:
    from users.models import User


def is_last_active_admin(user: 'User') -> bool:
    """
    Check if the given user is the last active admin in the system.

    Args:
        user: The User instance to check.

    Returns:
        True if the user is the last active admin, False otherwise.
    """
    from users.models import User, UserRole

    # Check if user is an admin (case-insensitive comparison)
    if user.role.lower() != UserRole.ADMIN.lower():
        return False

    if not user.is_active:
        return False

    active_admin_count = User.objects.filter(
        role=UserRole.ADMIN,
        is_active=True
    ).count()

    return active_admin_count == 1


def validate_admin_deactivation(user: 'User') -> None:
    """
    Validate that deactivating a user won't leave the system without an admin.

    Args:
        user: The User instance being deactivated.

    Raises:
        ValidationError: If the user is the last active admin.
    """
    if is_last_active_admin(user):
        raise ValidationError(
            'Cannot deactivate the last active admin. '
            'Ensure at least one other admin exists before deactivation.'
        )


def can_deactivate_user(user: 'User') -> tuple[bool, str]:
    """
    Check if a user can be safely deactivated.

    Args:
        user: The User instance to check.

    Returns:
        A tuple of (can_deactivate, reason).
        If can_deactivate is False, reason contains the explanation.
    """
    if not user.is_active:
        return False, 'User is already inactive.'

    if is_last_active_admin(user):
        return False, (
            'Cannot deactivate the last active admin. '
            'Ensure at least one other admin exists before deactivation.'
        )

    return True, ''
