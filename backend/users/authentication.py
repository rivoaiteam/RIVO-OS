"""
JWT Authentication for Rivo OS.

Simple JWT token authentication using Django's SECRET_KEY.
Includes Supabase client helpers for user management.
"""

import os
import jwt
from django.conf import settings
from rest_framework import authentication
from rest_framework.exceptions import AuthenticationFailed

from users.models import User


def get_supabase_client():
    """Get Supabase client for user operations."""
    from supabase import create_client
    url = os.environ.get('SUPABASE_URL', '')
    key = os.environ.get('SUPABASE_ANON_KEY', '')
    if not url or not key:
        raise ValueError('Supabase URL and ANON_KEY must be configured')
    return create_client(url, key)


def get_supabase_admin_client():
    """Get Supabase admin client for admin operations."""
    from supabase import create_client
    url = os.environ.get('SUPABASE_URL', '')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
    if not url or not key:
        raise ValueError('Supabase URL and SERVICE_ROLE_KEY must be configured')
    return create_client(url, key)


class JWTAuthentication(authentication.BaseAuthentication):
    """
    JWT Authentication using tokens generated at login.
    """

    def authenticate(self, request):
        """
        Authenticate the request using the Authorization header.
        """
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return None

        try:
            token_type, token = auth_header.split(' ')
            if token_type.lower() != 'bearer':
                return None
        except ValueError:
            return None

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token has expired.')
        except jwt.InvalidTokenError as e:
            raise AuthenticationFailed(f'Invalid token: {str(e)}')

        try:
            user = User.objects.get(id=payload['user_id'], is_active=True)
        except User.DoesNotExist:
            raise AuthenticationFailed('User not found.')

        return (user, payload)

    def authenticate_header(self, request):
        """Return the authentication header value for 401 responses."""
        return 'Bearer'
