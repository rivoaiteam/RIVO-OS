"""
URL configuration for cases app.

This module defines URL patterns for case management endpoints.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from cases.views import (
    CaseViewSet,
    StageSLAConfigViewSet,
    ClientToCaseSLAConfigViewSet,
    SLABreachesView,
)

# Router for Case CRUD operations
router = DefaultRouter()
router.register(r'cases', CaseViewSet, basename='case')
router.register(r'stage-sla-configs', StageSLAConfigViewSet, basename='stage-sla-config')
router.register(r'client-to-case-sla', ClientToCaseSLAConfigViewSet, basename='client-to-case-sla')

urlpatterns = [
    # SLA Breaches endpoint (before router to avoid conflicts)
    path('sla-breaches/', SLABreachesView.as_view(), name='sla-breaches'),
    # ViewSet routes
    path('', include(router.urls)),
]
