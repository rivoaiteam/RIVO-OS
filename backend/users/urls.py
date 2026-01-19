"""
URL configuration for users app.

This module defines URL patterns for authentication and user management endpoints.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from users.views import (
    UserViewSet,
    change_password_view,
    login_view,
    logout_view,
    me_view,
    reset_all_passwords_view,
)

# Router for User CRUD operations
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    # Authentication endpoints
    path('auth/login', login_view, name='auth-login'),
    path('auth/logout', logout_view, name='auth-logout'),
    path('auth/change-password', change_password_view, name='auth-change-password'),
    path('auth/me', me_view, name='auth-me'),
    path('auth/reset-all-passwords', reset_all_passwords_view, name='auth-reset-all-passwords'),

    # User management endpoints (via router)
    path('', include(router.urls)),
]
