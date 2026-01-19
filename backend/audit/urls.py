"""
URL configuration for audit app.

Routes for activity timeline, notes, reminders, and admin audit log.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from audit.views import (
    ActivityTimelineView,
    AdminAuditLogViewSet,
    NoteViewSet,
    ReminderViewSet,
    DashboardRemindersView,
)

router = DefaultRouter()
router.register(r'admin/audit-logs', AdminAuditLogViewSet, basename='audit-log')
router.register(r'notes', NoteViewSet, basename='note')
router.register(r'reminders', ReminderViewSet, basename='reminder')

urlpatterns = [
    # Activity timeline endpoints
    path(
        'clients/<uuid:record_id>/activity/',
        ActivityTimelineView.as_view(),
        {'record_type': 'clients'},
        name='client-activity'
    ),
    path(
        'cases/<uuid:record_id>/activity/',
        ActivityTimelineView.as_view(),
        {'record_type': 'cases'},
        name='case-activity'
    ),
    path(
        'leads/<uuid:record_id>/activity/',
        ActivityTimelineView.as_view(),
        {'record_type': 'leads'},
        name='lead-activity'
    ),

    # Notes endpoints for each record type
    path(
        'clients/<uuid:record_id>/notes/',
        NoteViewSet.as_view({'post': 'create'}),
        {'record_type': 'clients'},
        name='client-notes-create'
    ),
    path(
        'cases/<uuid:record_id>/notes/',
        NoteViewSet.as_view({'post': 'create'}),
        {'record_type': 'cases'},
        name='case-notes-create'
    ),
    path(
        'leads/<uuid:record_id>/notes/',
        NoteViewSet.as_view({'post': 'create'}),
        {'record_type': 'leads'},
        name='lead-notes-create'
    ),

    # Dashboard reminders
    path(
        'dashboard/reminders/',
        DashboardRemindersView.as_view(),
        name='dashboard-reminders'
    ),

    # Include router URLs
    path('', include(router.urls)),
]
