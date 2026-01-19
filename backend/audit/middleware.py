"""
Middleware for capturing audit context.

Sets the current user in thread-local storage so that audit log entries
can automatically capture who performed each action.
"""

from audit.models import set_audit_user, clear_audit_user


class AuditUserMiddleware:
    """
    Middleware that captures the current user for audit logging.

    For each request, extracts the authenticated user and stores their ID
    in thread-local storage. This allows the AuditableModel to automatically
    record who made each change without passing the user through every method.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Set the user context from the request
        user = getattr(request, 'user', None)
        if user and hasattr(user, 'id') and user.id:
            set_audit_user(user.id)
        else:
            clear_audit_user()

        try:
            response = self.get_response(request)
            return response
        finally:
            # Always clear the context after the request
            clear_audit_user()
