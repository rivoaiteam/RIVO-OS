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
        # Note: For DRF views, the user is set by JWTAuthentication
        # which calls set_audit_user() after successful authentication.
        # This middleware just ensures cleanup after the request.

        try:
            response = self.get_response(request)
            return response
        finally:
            # Always clear the context after the request completes
            clear_audit_user()
