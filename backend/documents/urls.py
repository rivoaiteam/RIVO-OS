"""
URL configuration for documents app.

This module defines URL patterns for document management endpoints.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from documents.views import (
    DocumentTypeViewSet,
    ClientDocumentViewSet,
    CaseDocumentViewSet,
    upload_document_file,
)

# Router for document type endpoints
router = DefaultRouter()
router.register(r'document_types', DocumentTypeViewSet, basename='document_type')

urlpatterns = [
    # Document type endpoints (via router)
    path('', include(router.urls)),

    # File upload endpoint
    path('documents/upload/', upload_document_file, name='document-upload'),

    # Client document endpoints (nested under clients)
    path(
        'clients/<uuid:client_id>/documents/',
        ClientDocumentViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='client-documents-list'
    ),
    path(
        'clients/<uuid:client_id>/documents/<uuid:pk>/',
        ClientDocumentViewSet.as_view({
            'get': 'retrieve',
            'delete': 'destroy',
        }),
        name='client-documents-detail'
    ),

    # Case document endpoints (nested under cases)
    path(
        'cases/<uuid:case_id>/documents/',
        CaseDocumentViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='case-documents-list'
    ),
    path(
        'cases/<uuid:case_id>/documents/<uuid:pk>/',
        CaseDocumentViewSet.as_view({
            'get': 'retrieve',
            'delete': 'destroy',
        }),
        name='case-documents-detail'
    ),
]