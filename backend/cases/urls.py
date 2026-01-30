"""
URL configuration for cases app.

This module defines URL patterns for case management endpoints.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from cases.views import (
    CaseViewSet,
    SLABreachesView,
)

# Router for Case CRUD operations
router = DefaultRouter()
router.register(r'cases', CaseViewSet, basename='case')

urlpatterns = [
    # SLA Breaches endpoint (before router to avoid conflicts)
    path('sla-breaches/', SLABreachesView.as_view(), name='sla-breaches'),
    # ViewSet routes
    path('', include(router.urls)),
]
